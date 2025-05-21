import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type FontSize = "text-base" | "text-lg" | "text-xl" | "text-2xl";
type LineSpacing = "leading-normal" | "leading-relaxed" | "leading-loose";
type WordSpacing = "normal" | "wide" | "wider";
type ThemeType = "light-theme" | "dark-theme" | "high-contrast-theme" | "bw-theme";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (spacing: LineSpacing) => void;
  wordSpacing: WordSpacing;
  setWordSpacing: (spacing: WordSpacing) => void;
  theme: ThemeType;
  setTheme: (theme: ThemeType) => void;
  isPanelOpen: boolean;
  togglePanel: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  // Initialize state with stored preferences or defaults
  const [fontSize, setFontSizeState] = useState<FontSize>(() => {
    const stored = localStorage.getItem('preferred-font-size');
    return (stored as FontSize) || 'text-base';
  });

  const [lineSpacing, setLineSpacingState] = useState<LineSpacing>(() => {
    const stored = localStorage.getItem('preferred-line-spacing');
    return (stored as LineSpacing) || 'leading-normal';
  });

  const [wordSpacing, setWordSpacingState] = useState<WordSpacing>(() => {
    const stored = localStorage.getItem('preferred-word-spacing');
    return (stored as WordSpacing) || 'normal';
  });

  const [theme, setThemeState] = useState<ThemeType>(() => {
    const stored = localStorage.getItem('preferred-theme');
    return (stored as ThemeType) || 'light-theme';
  });

  const [isPanelOpen, setIsPanelOpen] = useState(false);

  // Effect to apply font size to body
  useEffect(() => {
    document.body.classList.remove('text-base', 'text-lg', 'text-xl', 'text-2xl');
    document.body.classList.add(fontSize);
    localStorage.setItem('preferred-font-size', fontSize);
  }, [fontSize]);

  // Effect to apply line spacing to body
  useEffect(() => {
    document.body.classList.remove('leading-normal', 'leading-relaxed', 'leading-loose');
    document.body.classList.add(lineSpacing);
    localStorage.setItem('preferred-line-spacing', lineSpacing);
  }, [lineSpacing]);

  // Effect to apply word spacing to body
  useEffect(() => {
    let wordSpacingValue = '0px';
    
    switch(wordSpacing) {
      case 'normal':
        wordSpacingValue = '0px';
        break;
      case 'wide':
        wordSpacingValue = '2px';
        break;
      case 'wider':
        wordSpacingValue = '4px';
        break;
    }
    
    document.body.style.wordSpacing = wordSpacingValue;
    localStorage.setItem('preferred-word-spacing', wordSpacing);
  }, [wordSpacing]);

  // Effect to apply theme to html element
  useEffect(() => {
    document.documentElement.classList.remove(
      'light-theme',
      'dark-theme',
      'high-contrast-theme',
      'bw-theme'
    );
    document.documentElement.classList.add(theme);
    localStorage.setItem('preferred-theme', theme);
  }, [theme]);

  // Wrapper functions to update state and local storage
  const setFontSize = (size: FontSize) => {
    setFontSizeState(size);
  };

  const setLineSpacing = (spacing: LineSpacing) => {
    setLineSpacingState(spacing);
  };

  const setWordSpacing = (spacing: WordSpacing) => {
    setWordSpacingState(spacing);
  };

  const setTheme = (newTheme: ThemeType) => {
    setThemeState(newTheme);
  };

  const togglePanel = () => {
    setIsPanelOpen(prev => !prev);
  };

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        lineSpacing,
        setLineSpacing,
        wordSpacing,
        setWordSpacing,
        theme,
        setTheme,
        isPanelOpen,
        togglePanel
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider');
  }
  return context;
}
