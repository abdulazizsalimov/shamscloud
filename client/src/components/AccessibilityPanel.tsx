import { useLocale } from "@/providers/LocaleProvider";
import { useAccessibility } from "@/providers/AccessibilityProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useEffect, useRef, useState, KeyboardEvent as ReactKeyboardEvent } from "react";

export function AccessibilityPanel() {
  const { t, toggleLocale, locale } = useLocale();
  const {
    isPanelOpen,
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    wordSpacing,
    setWordSpacing,
    isBlackAndWhite,
    toggleBlackAndWhite,
    panelRef,
    closePanel
  } = useAccessibility();
  
  const [focusableElements, setFocusableElements] = useState<HTMLElement[]>([]);
  const firstFocusableEl = useRef<HTMLElement | null>(null);
  const lastFocusableEl = useRef<HTMLElement | null>(null);

  // Сохраняем фокус для возврата после закрытия панели
  const previousFocus = useRef<HTMLElement | null>(null);
  
  // Устанавливаем фокусируемые элементы для ловушки фокуса
  useEffect(() => {
    if (isPanelOpen && panelRef.current) {
      previousFocus.current = document.activeElement as HTMLElement;
      
      const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
      const elements = Array.from(
        panelRef.current.querySelectorAll(selector)
      ) as HTMLElement[];
      
      setFocusableElements(elements);
      
      if (elements.length > 0) {
        firstFocusableEl.current = elements[0];
        lastFocusableEl.current = elements[elements.length - 1];
        
        // Автоматически устанавливаем фокус на первый элемент
        setTimeout(() => {
          firstFocusableEl.current?.focus();
        }, 100);
      }
      
      return () => {
        // Возвращаем фокус при закрытии панели
        if (previousFocus.current) {
          previousFocus.current.focus();
        }
      };
    }
  }, [isPanelOpen]);
  
  // Обработчик клавиш для ловушки фокуса и закрытия по Escape
  const handleKeyDown = (e: ReactKeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      closePanel();
      return;
    }
    
    // Ловушка фокуса с Tab
    if (e.key === 'Tab') {
      // Если нажат Shift+Tab и текущий элемент - первый в списке, переводим фокус на последний
      if (e.shiftKey && document.activeElement === firstFocusableEl.current) {
        e.preventDefault();
        lastFocusableEl.current?.focus();
      } 
      // Если нажат Tab и текущий элемент - последний в списке, переводим фокус на первый
      else if (!e.shiftKey && document.activeElement === lastFocusableEl.current) {
        e.preventDefault();
        firstFocusableEl.current?.focus();
      }
    }
  };

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div 
      ref={panelRef} 
      className="fixed top-16 right-4 z-50 w-64 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-300 dark:border-gray-600"
      onKeyDown={handleKeyDown}
      role="dialog"
      aria-modal="true"
      aria-labelledby="accessibility-title"
    >
      <div className="flex justify-between items-center mb-3">
        <h2 id="accessibility-title" className="text-lg font-semibold text-gray-900 dark:text-white">
          {t("common.accessibilitySettings")}
        </h2>
        <button 
          onClick={closePanel}
          className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300"
          aria-label={t("common.close")}
        >
          ✕
        </button>
      </div>
      
      <div className="mb-3">
        <Label htmlFor="font-size-select" className="block mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("accessibility.fontSize")}
        </Label>
        <Select
          value={fontSize}
          onValueChange={(value) => setFontSize(value as any)}
        >
          <SelectTrigger id="font-size-select" className="w-full">
            <SelectValue placeholder={t("accessibility.fontSize")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text-base">{t("accessibility.normal")}</SelectItem>
            <SelectItem value="text-lg">{t("accessibility.large")}</SelectItem>
            <SelectItem value="text-xl">{t("accessibility.extraLarge")}</SelectItem>
            <SelectItem value="text-2xl">{t("accessibility.huge")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-3">
        <Label htmlFor="line-spacing-select" className="block mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("accessibility.lineSpacing")}
        </Label>
        <Select
          value={lineSpacing}
          onValueChange={(value) => setLineSpacing(value as any)}
        >
          <SelectTrigger id="line-spacing-select" className="w-full">
            <SelectValue placeholder={t("accessibility.lineSpacing")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="leading-normal">{t("accessibility.normal")}</SelectItem>
            <SelectItem value="leading-relaxed">{t("accessibility.relaxed")}</SelectItem>
            <SelectItem value="leading-loose">{t("accessibility.loose")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-3">
        <Label htmlFor="word-spacing-select" className="block mb-1 text-sm font-medium text-gray-800 dark:text-gray-200">
          {t("accessibility.wordSpacing")}
        </Label>
        <Select
          value={wordSpacing}
          onValueChange={(value) => setWordSpacing(value as any)}
        >
          <SelectTrigger id="word-spacing-select" className="w-full">
            <SelectValue placeholder={t("accessibility.wordSpacing")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="normal">{t("accessibility.normal")}</SelectItem>
            <SelectItem value="wide">{t("accessibility.wide")}</SelectItem>
            <SelectItem value="wider">{t("accessibility.wider")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="flex items-center mb-3">
        <Label htmlFor="black-white-switch" className="text-sm font-medium mr-2 text-gray-800 dark:text-gray-200">
          {t("accessibility.blackWhiteMode")}
        </Label>
        <div className="relative inline-block w-12 mr-2 align-middle select-none">
          <Switch
            id="black-white-switch"
            checked={isBlackAndWhite}
            onCheckedChange={toggleBlackAndWhite}
          />
        </div>
      </div>
      
      <div className="flex items-center">
        <Label htmlFor="language-switch" className="text-sm font-medium mr-2 text-gray-800 dark:text-gray-200">
          {t("accessibility.language")}: {locale === 'ru' ? t("accessibility.russian") : ''}
        </Label>
        <div className="relative inline-block w-12 mr-2 align-middle select-none">
          <Switch
            id="language-switch"
            checked={locale === 'en'}
            onCheckedChange={toggleLocale}
          />
        </div>
        <span className="text-sm font-medium">
          {locale === 'en' ? t("accessibility.english") : ''}
        </span>
      </div>
    </div>
  );
}
