import { translations } from './translations';

export type LanguageCode = 'ru' | 'en';
export type TranslationPath = string;

/**
 * Simple i18n implementation
 */
class I18n {
  private language: LanguageCode = 'ru';
  private fallbackLanguage: LanguageCode = 'ru';

  constructor() {
    // Initialize from localStorage if available
    const savedLanguage = localStorage.getItem('preferred-language');
    if (savedLanguage === 'ru' || savedLanguage === 'en') {
      this.language = savedLanguage;
    } else {
      // Default to browser language if possible
      const browserLang = navigator.language.split('-')[0].toLowerCase();
      if (browserLang === 'ru' || browserLang === 'en') {
        this.language = browserLang as LanguageCode;
      }
    }
    
    // Update HTML lang attribute
    document.documentElement.lang = this.language;
  }

  /**
   * Get current language code
   */
  getLanguage(): LanguageCode {
    return this.language;
  }

  /**
   * Set current language
   */
  setLanguage(language: LanguageCode): void {
    this.language = language;
    document.documentElement.lang = language;
    localStorage.setItem('preferred-language', language);
  }

  /**
   * Toggle language between ru and en
   */
  toggleLanguage(): void {
    const newLang = this.language === 'ru' ? 'en' : 'ru';
    this.setLanguage(newLang);
  }

  /**
   * Translate a message by key
   * @param key Dot notation path to translation string (e.g. 'common.save')
   * @param replacements Optional key/value pairs for string interpolation
   */
  t(key: TranslationPath, replacements: Record<string, string | number> = {}): string {
    // Get value from translations object using dot notation
    const value = key.split('.').reduce((obj, k) => {
      return obj && obj[k] !== undefined ? obj[k] : undefined;
    }, translations[this.language] as any);

    // Fallback to other language if translation not found
    if (value === undefined) {
      const fallbackValue = key.split('.').reduce((obj, k) => {
        return obj && obj[k] !== undefined ? obj[k] : undefined;
      }, translations[this.fallbackLanguage] as any);

      if (fallbackValue === undefined) {
        // If still not found, return the key itself
        return key;
      }

      return this.processReplacements(fallbackValue, replacements);
    }

    return this.processReplacements(value, replacements);
  }

  /**
   * Replace placeholders in translation string with provided values
   */
  private processReplacements(text: string, replacements: Record<string, string | number>): string {
    return Object.entries(replacements).reduce((result, [key, value]) => {
      return result.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
    }, text);
  }
}

export const i18n = new I18n();
