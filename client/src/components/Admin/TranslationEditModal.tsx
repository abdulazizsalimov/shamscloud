import { useState, useEffect } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "@/hooks/use-toast";
import { translations } from "@/i18n/translations";

interface TranslationEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  language: "ru" | "en";
}

interface TranslationEntry {
  key: string;
  englishText: string;
  translatedText: string;
}

export function TranslationEditModal({ open, onOpenChange, language }: TranslationEditModalProps) {
  const { t } = useLocale();
  const [translationEntries, setTranslationEntries] = useState<TranslationEntry[]>([]);
  const [editedTranslations, setEditedTranslations] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  // Функция для создания плоского списка всех переводов
  const flattenTranslations = (obj: any, prefix = ''): TranslationEntry[] => {
    const entries: TranslationEntry[] = [];
    
    for (const key in obj) {
      const fullKey = prefix ? `${prefix}.${key}` : key;
      
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        entries.push(...flattenTranslations(obj[key], fullKey));
      } else if (typeof obj[key] === 'string') {
        const englishText = getNestedValue(translations.en, fullKey) || '';
        const translatedText = getNestedValue(translations[language], fullKey) || '';
        
        entries.push({
          key: fullKey,
          englishText,
          translatedText
        });
      }
    }
    
    return entries;
  };

  // Функция для получения значения по ключу с точками
  const getNestedValue = (obj: any, key: string): string => {
    return key.split('.').reduce((o, k) => o && o[k], obj) || '';
  };

  // Загрузка переводов при открытии модального окна
  useEffect(() => {
    if (open) {
      const entries = flattenTranslations(translations.en);
      setTranslationEntries(entries);
      setEditedTranslations({});
    }
  }, [open, language]);

  // Обработка изменения перевода
  const handleTranslationChange = (key: string, value: string) => {
    setEditedTranslations(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Получение текущего значения (отредактированного или оригинального)
  const getCurrentValue = (entry: TranslationEntry): string => {
    return editedTranslations[entry.key] !== undefined 
      ? editedTranslations[entry.key] 
      : entry.translatedText;
  };

  // Сохранение изменений
  const handleSave = async () => {
    setIsLoading(true);
    try {
      // Обновляем переводы в основном объекте translations
      for (const [key, value] of Object.entries(editedTranslations)) {
        const keys = key.split('.');
        let current: any = (translations as any)[language];
        
        // Создаем путь к значению если его нет
        for (let i = 0; i < keys.length - 1; i++) {
          if (!current[keys[i]]) {
            current[keys[i]] = {};
          }
          current = current[keys[i]];
        }
        
        // Устанавливаем значение
        current[keys[keys.length - 1]] = value;
      }
      
      // Сохраняем в localStorage для персистентности
      localStorage.setItem(`translations_${language}`, JSON.stringify((translations as any)[language]));
      
      // Имитация задержки сохранения
      await new Promise(resolve => setTimeout(resolve, 500));
      
      toast({
        title: t("admin.settingsSaved"),
        description: `${t("admin.translationsSaved")} (${language.toUpperCase()})`,
      });
      
      // Очищаем отредактированные переводы
      setEditedTranslations({});
      
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving translations:", error);
      toast({
        title: t("common.error"),
        description: t("admin.translationsSaveError"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Отмена изменений
  const handleCancel = () => {
    setEditedTranslations({});
    onOpenChange(false);
  };

  // Определение названия языка для заголовка
  const getLanguageName = () => {
    return language === "ru" ? "Русский" : "English";
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {t("admin.editTranslation")} - {getLanguageName()}
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full pr-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t("admin.translationKey")}</TableHead>
                  <TableHead className="w-1/2">{t("admin.englishText")}</TableHead>
                  <TableHead className="w-1/2">{t("admin.translatedText")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {translationEntries.map((entry) => (
                  <TableRow key={entry.key}>
                    <TableCell className="font-mono text-xs text-gray-600 dark:text-gray-400">
                      {entry.key}
                    </TableCell>
                    <TableCell className="text-sm">
                      {entry.englishText}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={getCurrentValue(entry)}
                        onChange={(e) => handleTranslationChange(entry.key, e.target.value)}
                        className="w-full text-sm bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
                        placeholder={entry.englishText}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </div>
        
        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700"
          >
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            disabled={isLoading}
            className="bg-primary hover:bg-primary/90 text-white"
          >
            {isLoading ? t("common.saving") : t("common.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}