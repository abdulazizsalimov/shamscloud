import { useState } from "react";
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
import { toast } from "@/hooks/use-toast";

interface AddLanguageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLanguageAdded: (languageCode: string) => void;
}

// Form validation schema
const addLanguageSchema = z.object({
  languageCode: z
    .string()
    .min(2, "Код языка должен содержать минимум 2 символа")
    .max(5, "Код языка должен содержать максимум 5 символов")
    .regex(/^[a-z-]+$/, "Код языка может содержать только строчные буквы и дефисы"),
  nativeName: z
    .string()
    .min(1, "Название на языке обязательно")
    .max(50, "Название не должно превышать 50 символов"),
  englishName: z
    .string()
    .min(1, "Название на английском обязательно")
    .max(50, "Название не должно превышать 50 символов"),
});

type AddLanguageValues = z.infer<typeof addLanguageSchema>;

export function AddLanguageModal({ open, onOpenChange, onLanguageAdded }: AddLanguageModalProps) {
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<AddLanguageValues>({
    resolver: zodResolver(addLanguageSchema),
    defaultValues: {
      languageCode: "",
      nativeName: "",
      englishName: "",
    },
  });

  const onSubmit = async (values: AddLanguageValues) => {
    setIsLoading(true);
    try {
      // TODO: Здесь будет API вызов для создания нового языка
      console.log("Adding new language:", values);
      
      // Имитация задержки создания
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t("admin.languageAdded"),
        description: `${t("admin.languageAddedSuccess")}: ${values.nativeName}`,
      });
      
      // Очищаем форму
      form.reset();
      
      // Закрываем модальное окно
      onOpenChange(false);
      
      // Открываем редактор переводов для нового языка
      onLanguageAdded(values.languageCode);
      
    } catch (error) {
      console.error("Error adding language:", error);
      toast({
        title: t("common.error"),
        description: t("admin.languageAddError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    form.reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("admin.addNewLanguage")}
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-4">
            <FormField
              control={form.control}
              name="languageCode"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("admin.languageCode")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="ru, en, es, fr, de..."
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormDescription className="text-gray-600 dark:text-gray-400">
                    {t("admin.languageCodeDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="nativeName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("admin.nativeLanguageName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Русский, English, Español..."
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormDescription className="text-gray-600 dark:text-gray-400">
                    {t("admin.nativeLanguageNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="englishName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-gray-900 dark:text-gray-100">
                    {t("admin.englishLanguageName")}
                  </FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Russian, English, Spanish..."
                      className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                    />
                  </FormControl>
                  <FormDescription className="text-gray-600 dark:text-gray-400">
                    {t("admin.englishLanguageNameDescription")}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={handleCancel}
                disabled={isLoading}
                className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
              >
                {t("common.cancel")}
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-primary hover:bg-primary/90 text-white"
              >
                {isLoading ? t("common.adding") : t("admin.addLanguage")}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}