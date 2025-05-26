import { useState, useEffect } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Edit, Plus, Globe, Trash2, FileText, Pencil } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { TranslationEditModal } from "./TranslationEditModal";
import { AddLanguageModal } from "./AddLanguageModal";
import { translations } from "@/i18n/translations";

interface SettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// Define the form schema for quota settings
const quotaSettingsSchema = z.object({
  totalQuota: z.string().refine(
    (val) => {
      const num = parseFloat(val);
      return !isNaN(num) && num > 0;
    },
    { message: "Квота должна быть положительным числом" }
  ),
  defaultQuota: z.string(),
});

type QuotaSettingsValues = z.infer<typeof quotaSettingsSchema>;

export function SettingsModal({ open, onOpenChange }: SettingsModalProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState("quota");
  const [availableSpace, setAvailableSpace] = useState<string>(""); // For storing actual available space
  const [isLoading, setIsLoading] = useState(false);
  const [editTranslationOpen, setEditTranslationOpen] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<"ru" | "en">("ru");
  const [addLanguageOpen, setAddLanguageOpen] = useState(false);
  const [availableLanguages, setAvailableLanguages] = useState(() => {
    // Инициализируем базовые языки, если их нет в localStorage
    const stored = localStorage.getItem('availableLanguages');
    if (!stored) {
      const defaultLanguages = [
        { code: 'ru', name: 'Русский', englishName: 'Russian' },
        { code: 'en', name: 'English', englishName: 'English' }
      ];
      localStorage.setItem('availableLanguages', JSON.stringify(defaultLanguages));
      return defaultLanguages;
    }
    return JSON.parse(stored);
  });

  // Initialize the form with quota settings
  const form = useForm<QuotaSettingsValues>({
    resolver: zodResolver(quotaSettingsSchema),
    defaultValues: {
      totalQuota: "100", // Default total quota in GB
      defaultQuota: "10", // Default new user quota in GB
    },
  });

  // Load the current settings when the modal opens
  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await apiRequest("/api/admin/settings", {
          method: "GET",
        });
        
        if (response.ok) {
          const data = await response.json();
          form.setValue("totalQuota", (parseInt(data.totalQuota) / (1024 * 1024 * 1024)).toString());
          form.setValue("defaultQuota", (parseInt(data.defaultQuota) / (1024 * 1024 * 1024)).toString());
          setAvailableSpace(formatBytes(parseInt(data.availableSpace)));
        }
      } catch (error) {
        console.error("Error loading settings:", error);
      }
    }
    
    if (open) {
      loadSettings();
    }
  }, [open, form]);

  // Handle form submission
  const onSubmit = async (values: QuotaSettingsValues) => {
    setIsLoading(true);
    try {
      // Convert GB to bytes for the API
      const totalQuotaBytes = Math.round(parseFloat(values.totalQuota) * 1024 * 1024 * 1024);
      const defaultQuotaBytes = Math.round(parseFloat(values.defaultQuota) * 1024 * 1024 * 1024);
      
      // Use XMLHttpRequest for better error handling and tracking
      const saveSettings = () => {
        return new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open("POST", "/api/admin/settings", true);
          xhr.setRequestHeader("Content-Type", "application/json");
          xhr.withCredentials = true;
          
          xhr.onload = function() {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve();
            } else {
              console.error("Server error status:", xhr.status);
              console.error("Server error response:", xhr.responseText);
              reject(new Error(xhr.responseText || `Error: ${xhr.status}`));
            }
          };
          
          xhr.onerror = function() {
            console.error("Network error occurred");
            reject(new Error("Network error occurred"));
          };
          
          const payload = JSON.stringify({
            totalQuota: totalQuotaBytes.toString(),
            defaultQuota: defaultQuotaBytes.toString(),
          });
          
          console.log("Sending settings payload:", payload);
          xhr.send(payload);
        });
      };
      
      await saveSettings();
      
      // Success path
      toast({
        title: t("admin.settingsSaved"),
        description: t("admin.settingsSavedMessage"),
      });
      
      // Manually refresh settings after a short delay
      setTimeout(function() {
        try {
          // Call the settings loading function directly
          form.reset();
          fetch("/api/admin/settings", {
            credentials: "include"
          })
          .then(res => res.json())
          .then(data => {
            if (data) {
              form.setValue("totalQuota", (parseInt(data.totalQuota) / (1024 * 1024 * 1024)).toString());
              form.setValue("defaultQuota", (parseInt(data.defaultQuota) / (1024 * 1024 * 1024)).toString());
              setAvailableSpace(formatBytes(parseInt(data.availableSpace || "0")));
            }
          })
          .catch(err => console.error("Error refreshing settings:", err));
        } catch (refreshError) {
          console.error("Error in refresh timeout:", refreshError);
        }
      }, 500);
      
    } catch (error) {
      console.error("Error saving settings:", error);
      
      let errorMessage = t("admin.settingsSaveError");
      if (error instanceof Error) {
        try {
          const errorData = JSON.parse(error.message);
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (e) {
          // If can't parse as JSON, use the raw message
          errorMessage = error.message || errorMessage;
        }
      }
      
      toast({
        title: t("common.error"),
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Format bytes to human-readable format
  function formatBytes(bytes: number): string {
    if (bytes === 0) return "0 Bytes";
    
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  }

  // Handle opening translation edit modal
  const handleEditTranslation = (language: "ru" | "en") => {
    setEditingLanguage(language);
    setEditTranslationOpen(true);
  };

  // Handle adding new language
  const handleAddTranslation = () => {
    setAddLanguageOpen(true);
  };

  // Handle when new language is added
  const handleLanguageAdded = (languageCode: string) => {
    // Обновляем список доступных языков
    const updatedLanguages = JSON.parse(localStorage.getItem('availableLanguages') || '[]');
    setAvailableLanguages(updatedLanguages);
    
    // Принудительно обновляем список в других компонентах через событие
    window.dispatchEvent(new Event('languagesUpdated'));
    
    // Open translation editor for the new language
    setEditingLanguage(languageCode as "ru" | "en");
    setEditTranslationOpen(true);
  };

  // Handle page editing
  const handleEditPage = (pageType: 'home' | 'about' | 'contacts') => {
    // Открываем страницу в новой вкладке с параметром редактирования
    const urls = {
      home: '/?edit=true',
      about: '/about?edit=true',
      contacts: '/contact?edit=true'  // Исправляем URL с /contacts на /contact
    };
    window.open(urls[pageType], '_blank');
  };

  // Handle language deletion
  const handleDeleteLanguage = (languageCode: string) => {
    // Не разрешаем удаление основных языков
    if (languageCode === 'ru' || languageCode === 'en') {
      toast({
        title: t("common.error"),
        description: "Нельзя удалить основные языки (русский и английский)",
        variant: "destructive",
      });
      return;
    }

    // Подтверждение удаления
    if (!window.confirm(`Вы уверены, что хотите удалить язык "${languageCode}"? Все переводы будут потеряны.`)) {
      return;
    }

    try {
      // Удаляем язык из списка доступных языков
      const updatedLanguages = availableLanguages.filter((lang: any) => lang.code !== languageCode);
      localStorage.setItem('availableLanguages', JSON.stringify(updatedLanguages));
      setAvailableLanguages(updatedLanguages);

      // Удаляем переводы из localStorage
      localStorage.removeItem(`translations_${languageCode}`);

      // Удаляем из объекта переводов
      delete (translations as any)[languageCode];

      // Принудительно обновляем список в других компонентах
      window.dispatchEvent(new Event('languagesUpdated'));

      toast({
        title: t("common.success"),
        description: `Язык "${languageCode}" удален`,
      });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: "Ошибка при удалении языка",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">{t("admin.systemSettings")}</DialogTitle>
        </DialogHeader>
        
        <div className="flex mt-4">
          <Tabs value={activeTab} className="w-full flex">
            {/* Left sidebar with tabs */}
            <div className="w-1/3 pr-4 border-r">
              <TabsList className="flex flex-col items-stretch h-auto bg-transparent">
                <TabsTrigger
                  value="quota"
                  onClick={() => setActiveTab("quota")}
                  className={`justify-start px-4 py-2 mb-1 text-left ${
                    activeTab === "quota" 
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  {t("admin.quotaSettings")}
                </TabsTrigger>
                <TabsTrigger
                  value="multilingual"
                  onClick={() => setActiveTab("multilingual")}
                  className={`justify-start px-4 py-2 mb-1 text-left ${
                    activeTab === "multilingual" 
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <Globe className="h-4 w-4 mr-2" />
                  {t("admin.multilingualSettings")}
                </TabsTrigger>
                <TabsTrigger
                  value="pages"
                  onClick={() => setActiveTab("pages")}
                  className={`justify-start px-4 py-2 mb-1 text-left ${
                    activeTab === "pages" 
                      ? "bg-primary/10 text-primary font-medium border-l-2 border-primary" 
                      : "text-gray-700 dark:text-gray-300"
                  }`}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  {t("admin.pageManagement")}
                </TabsTrigger>
              </TabsList>
            </div>
            
            {/* Right content area */}
            <div className="w-2/3 pl-4">
              <TabsContent value="quota" className="m-0">
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="totalQuota"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-900 dark:text-gray-100">{t("admin.totalSystemQuota")} (GB)</FormLabel>
                          <FormControl>
                            <Input {...field} type="number" min="1" step="1" className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700" />
                          </FormControl>
                          <FormDescription className="text-gray-600 dark:text-gray-400">
                            {t("admin.totalQuotaDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="defaultQuota"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-gray-900 dark:text-gray-100">{t("admin.defaultUserQuota")}</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700">
                                <SelectValue placeholder={t("admin.selectQuota")} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="5">5 GB</SelectItem>
                              <SelectItem value="10">10 GB</SelectItem>
                              <SelectItem value="20">20 GB</SelectItem>
                              <SelectItem value="50">50 GB</SelectItem>
                              <SelectItem value="100">100 GB</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormDescription className="text-gray-600 dark:text-gray-400">
                            {t("admin.defaultQuotaDescription")}
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    {/* Display available space information */}
                    <div className="p-4 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                      <h3 className="font-medium mb-2 text-gray-900 dark:text-white">{t("admin.systemStorage")}</h3>
                      <p className="text-sm text-gray-600 dark:text-gray-300">
                        {t("admin.availableSpace")}: <span className="font-semibold">{availableSpace || "Loading..."}</span>
                      </p>
                    </div>
                    
                    <div className="flex justify-end pt-4">
                      <Button 
                        type="submit" 
                        disabled={isLoading}
                        className="bg-primary hover:bg-primary/90 text-white"
                      >
                        {isLoading ? t("common.saving") : t("common.saveChanges")}
                      </Button>
                    </div>
                  </form>
                </Form>
              </TabsContent>

              <TabsContent value="multilingual" className="m-0">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">{t("admin.availableLanguages")}</h3>
                    <Button 
                      onClick={handleAddTranslation}
                      className="bg-primary hover:bg-primary/90 text-white"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      {t("admin.addTranslation")}
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {availableLanguages.map((language: any, index: number) => {
                      const colors = ['bg-red-500', 'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500'];
                      const bgColor = colors[index % colors.length];
                      
                      return (
                        <div key={language.code} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md">
                          <div className="flex items-center space-x-3">
                            <div className={`w-6 h-6 rounded-full ${bgColor} flex items-center justify-center text-white text-sm font-medium`}>
                              {language.code.toUpperCase()}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900 dark:text-white">{language.name}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-400">{language.englishName}</div>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditTranslation(language.code as "ru" | "en")}
                              aria-label={t("admin.editTranslation")}
                              className="!text-gray-800 !border !border-gray-400 hover:!bg-gray-100 hover:!text-gray-900 dark:!text-gray-100 dark:!border-gray-500 dark:hover:!bg-gray-700 dark:hover:!text-white"
                            >
                              <Edit className="h-4 w-4 !text-gray-800 dark:!text-gray-100" />
                            </Button>
                            
                            {/* Кнопка удаления - только для не-основных языков */}
                            {language.code !== 'ru' && language.code !== 'en' && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDeleteLanguage(language.code)}
                                aria-label={t("admin.deleteLanguage")}
                                className="!text-red-600 !border !border-red-400 hover:!bg-red-50 hover:!text-red-800 dark:!text-red-400 dark:!border-red-500 dark:hover:!bg-red-900/20 dark:hover:!text-red-300"
                              >
                                <Trash2 className="h-4 w-4 !text-red-600 dark:!text-red-400" />
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      {t("admin.multilingualDescription")}
                    </p>
                  </div>
                </div>
              </TabsContent>

              {/* Page Management Tab */}
              <TabsContent value="pages" className="flex-1 overflow-auto">
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("admin.pageManagement")}</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-6">
                      {t("admin.pageManagementDescription")}
                    </p>
                  </div>

                  <div className="space-y-4">
                    {/* Home Page */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {t("nav.home")}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.homePageDescription")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPage('home')}
                        aria-label={t("admin.editHomePage")}
                        className="!text-gray-800 !border !border-gray-400 hover:!bg-gray-100 hover:!text-gray-900 dark:!text-gray-100 dark:!border-gray-500 dark:hover:!bg-gray-700 dark:hover:!text-white"
                      >
                        <Pencil className="h-4 w-4 !text-gray-800 dark:!text-gray-100" />
                      </Button>
                    </div>

                    {/* About Page */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {t("nav.about")}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.aboutPageDescription")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPage('about')}
                        aria-label={t("admin.editAboutPage")}
                        className="!text-gray-800 !border !border-gray-400 hover:!bg-gray-100 hover:!text-gray-900 dark:!text-gray-100 dark:!border-gray-500 dark:hover:!bg-gray-700 dark:hover:!text-white"
                      >
                        <Pencil className="h-4 w-4 !text-gray-800 dark:!text-gray-100" />
                      </Button>
                    </div>

                    {/* Contacts Page */}
                    <div className="flex items-center justify-between p-4 border rounded-lg bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                          <FileText className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900 dark:text-gray-100">
                            {t("nav.contacts")}
                          </h4>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {t("admin.contactsPageDescription")}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditPage('contacts')}
                        aria-label={t("admin.editContactsPage")}
                        className="!text-gray-800 !border !border-gray-400 hover:!bg-gray-100 hover:!text-gray-900 dark:!text-gray-100 dark:!border-gray-500 dark:hover:!bg-gray-700 dark:hover:!text-white"
                      >
                        <Pencil className="h-4 w-4 !text-gray-800 dark:!text-gray-100" />
                      </Button>
                    </div>
                  </div>

                  <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                    <p className="text-sm text-green-800 dark:text-green-200">
                      {t("admin.pageEditingNote")}
                    </p>
                  </div>
                </div>
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </DialogContent>

      {/* Translation Edit Modal */}
      <TranslationEditModal
        open={editTranslationOpen}
        onOpenChange={setEditTranslationOpen}
        language={editingLanguage}
      />

      {/* Add Language Modal */}
      <AddLanguageModal
        open={addLanguageOpen}
        onOpenChange={setAddLanguageOpen}
        onLanguageAdded={handleLanguageAdded}
      />
    </Dialog>
  );
}