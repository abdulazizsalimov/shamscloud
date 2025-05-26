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
import { Download, Upload } from "lucide-react";

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
        
        // Получаем переводы для текущего языка
        let currentLanguageTranslations = (translations as any)[language];
        
        // Если языка нет, проверяем localStorage
        if (!currentLanguageTranslations) {
          const savedTranslations = localStorage.getItem(`translations_${language}`);
          if (savedTranslations) {
            try {
              currentLanguageTranslations = JSON.parse(savedTranslations);
            } catch (error) {
              // Если не удалось загрузить, используем русские переводы как основу
              currentLanguageTranslations = translations.ru;
            }
          } else {
            // Используем русские переводы как основу для нового языка
            currentLanguageTranslations = translations.ru;
          }
        }
        
        const translatedText = getNestedValue(currentLanguageTranslations, fullKey) || '';
        
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
      // Получаем или создаем объект переводов для языка
      let languageTranslations = (translations as any)[language];
      
      // Если языка нет в основном объекте, создаем его
      if (!languageTranslations) {
        // Проверяем есть ли сохраненные переводы
        const savedTranslations = localStorage.getItem(`translations_${language}`);
        if (savedTranslations) {
          try {
            languageTranslations = JSON.parse(savedTranslations);
          } catch (error) {
            languageTranslations = JSON.parse(JSON.stringify(translations.ru));
          }
        } else {
          languageTranslations = JSON.parse(JSON.stringify(translations.ru));
        }
        (translations as any)[language] = languageTranslations;
      }
      
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
    const availableLanguages = JSON.parse(localStorage.getItem('availableLanguages') || '[]');
    const currentLanguage = availableLanguages.find((lang: any) => lang.code === language);
    
    if (currentLanguage) {
      return currentLanguage.name;
    }
    
    // Fallback для основных языков если их нет в localStorage
    return language === "ru" ? "Русский" : language === "en" ? "English" : (language as string).toUpperCase();
  };

  // Функция экспорта в CSV
  const handleExportCSV = () => {
    const csvData = translationEntries.map(entry => [
      entry.key,
      entry.englishText,
      getCurrentValue(entry)
    ]);
    
    // Добавляем заголовки
    csvData.unshift(['Key', 'English Text', 'Translation']);
    
    // Конвертируем в CSV формат
    const csvContent = csvData.map(row => 
      row.map(field => `"${field.replace(/"/g, '""')}"`).join(',')
    ).join('\n');
    
    // Создаем и скачиваем файл
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `translations_${language}_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    toast({
      title: t("common.success"),
      description: `Переводы экспортированы в CSV файл`,
    });
  };

  // Функция импорта из CSV
  const handleImportCSV = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const csv = e.target?.result as string;
        const lines = csv.split('\n');
        
        // Пропускаем заголовок
        const dataLines = lines.slice(1);
        
        const newTranslations: Record<string, string> = {};
        
        dataLines.forEach(line => {
          if (line.trim()) {
            // Простой парсер CSV (для корректной работы с запятыми внутри кавычек)
            const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g);
            if (matches && matches.length >= 3) {
              const key = matches[0].replace(/^"|"$/g, '').replace(/""/g, '"');
              const translation = matches[2].replace(/^"|"$/g, '').replace(/""/g, '"');
              
              if (key && translation) {
                newTranslations[key] = translation;
              }
            }
          }
        });
        
        // Обновляем отредактированные переводы
        setEditedTranslations(prev => ({
          ...prev,
          ...newTranslations
        }));
        
        toast({
          title: t("common.success"),
          description: `Импортировано ${Object.keys(newTranslations).length} переводов из CSV файла`,
        });
        
      } catch (error) {
        toast({
          title: t("common.error"),
          description: "Ошибка при импорте CSV файла. Проверьте формат файла.",
          variant: "destructive",
        });
      }
    };
    
    reader.readAsText(file);
    // Очищаем input для повторного использования
    event.target.value = '';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[80vh] bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-semibold text-gray-900 dark:text-white">
              {t("admin.editTranslation")} - {getLanguageName()}
            </DialogTitle>
            <div className="flex items-center space-x-2">
              {/* Кнопка экспорта CSV */}
              <Button
                onClick={handleExportCSV}
                variant="outline"
                size="sm"
                className="border-gray-300 dark:border-gray-600"
              >
                <Download className="h-4 w-4 mr-2" />
                Экспорт CSV
              </Button>
              
              {/* Кнопка импорта CSV */}
              <div className="relative">
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleImportCSV}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  id="csv-import"
                />
                <Button
                  variant="outline"
                  size="sm"
                  className="border-gray-300 dark:border-gray-600"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Импорт CSV
                </Button>
              </div>
            </div>
          </div>
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