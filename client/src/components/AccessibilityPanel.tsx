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

export function AccessibilityPanel() {
  const { t, toggleLocale, locale } = useLocale();
  const {
    isPanelOpen,
    theme,
    setTheme,
    fontSize,
    setFontSize,
    lineSpacing,
    setLineSpacing,
    wordSpacing,
    setWordSpacing
  } = useAccessibility();

  if (!isPanelOpen) {
    return null;
  }

  return (
    <div className="fixed top-16 right-4 z-50 w-64 p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-app">
      <h2 className="text-lg font-semibold mb-3">
        {t("common.accessibilitySettings")}
      </h2>
      
      <div className="mb-3">
        <Label htmlFor="theme-select" className="block mb-1 text-sm font-medium">
          {t("accessibility.theme")}
        </Label>
        <Select
          value={theme}
          onValueChange={(value) => setTheme(value as any)}
        >
          <SelectTrigger id="theme-select" className="w-full">
            <SelectValue placeholder={t("accessibility.theme")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light-theme">{t("accessibility.light")}</SelectItem>
            <SelectItem value="dark-theme">{t("accessibility.dark")}</SelectItem>
            <SelectItem value="high-contrast-theme">{t("accessibility.highContrast")}</SelectItem>
            <SelectItem value="bw-theme">{t("accessibility.blackWhite")}</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      <div className="mb-3">
        <Label htmlFor="font-size-select" className="block mb-1 text-sm font-medium">
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
        <Label htmlFor="line-spacing-select" className="block mb-1 text-sm font-medium">
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
        <Label htmlFor="word-spacing-select" className="block mb-1 text-sm font-medium">
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
      
      <div className="flex items-center">
        <Label htmlFor="language-switch" className="text-sm font-medium mr-2">
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
