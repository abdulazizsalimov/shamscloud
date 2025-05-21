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
import { apiRequest } from "@/lib/queryClient";

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
      
      console.log("Submitting settings:", {
        totalQuota: totalQuotaBytes.toString(),
        defaultQuota: defaultQuotaBytes.toString(),
      });
      
      const response = await apiRequest("/api/admin/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          totalQuota: totalQuotaBytes.toString(),
          defaultQuota: defaultQuotaBytes.toString(),
        }),
      });
      
      if (response.ok) {
        toast({
          title: t("admin.settingsSaved"),
          description: t("admin.settingsSavedMessage"),
        });
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error("Server response:", errorData);
        throw new Error(errorData.message || "Failed to save settings");
      }
    } catch (error) {
      console.error("Error saving settings:", error);
      toast({
        title: t("common.error"),
        description: t("admin.settingsSaveError"),
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
                {/* Future tab options could be added here */}
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
            </div>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}