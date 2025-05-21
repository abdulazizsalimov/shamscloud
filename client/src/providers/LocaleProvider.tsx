import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from "react";
import { i18n, LanguageCode, TranslationPath } from "@/i18n";

interface LocaleContextType {
  locale: LanguageCode;
  setLocale: (locale: LanguageCode) => void;
  t: (key: TranslationPath, replacements?: Record<string, string | number>) => string;
  toggleLocale: () => void;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export function LocaleProvider({ children }: LocaleProviderProps) {
  const [locale, setLocaleState] = useState<LanguageCode>(i18n.getLanguage());

  // Update i18n instance when locale changes
  const setLocale = useCallback((newLocale: LanguageCode) => {
    i18n.setLanguage(newLocale);
    setLocaleState(newLocale);
  }, []);

  const toggleLocale = useCallback(() => {
    const newLocale = locale === 'ru' ? 'en' : 'ru';
    setLocale(newLocale);
  }, [locale, setLocale]);

  // Translation helper function
  const t = useCallback((key: TranslationPath, replacements?: Record<string, string | number>) => {
    return i18n.t(key, replacements || {});
  }, []);

  // Initialize from localStorage if available
  useEffect(() => {
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage === 'ru' || savedLanguage === 'en') {
      setLocale(savedLanguage as LanguageCode);
    }
  }, [setLocale]);

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t, toggleLocale }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (context === undefined) {
    throw new Error('useLocale must be used within a LocaleProvider');
  }
  return context;
}
