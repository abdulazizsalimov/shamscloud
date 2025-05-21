import { createContext, useContext, useState, useEffect, ReactNode, useRef, useCallback } from "react";

type FontSize = "text-base" | "text-lg" | "text-xl" | "text-2xl";
type LineSpacing = "leading-normal" | "leading-relaxed" | "leading-loose";
type WordSpacing = "normal" | "wide" | "wider";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  lineSpacing: LineSpacing;
  setLineSpacing: (spacing: LineSpacing) => void;
  wordSpacing: WordSpacing;
  setWordSpacing: (spacing: WordSpacing) => void;
  isBlackAndWhite: boolean;
  toggleBlackAndWhite: () => void;
  isPanelOpen: boolean;
  togglePanel: () => void;
  panelRef: React.RefObject<HTMLDivElement>;
  closePanel: () => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

interface AccessibilityProviderProps {
  children: ReactNode;
}

export function AccessibilityProvider({ children }: AccessibilityProviderProps) {
  // Ref для панели доступности (для ловушки фокуса и обработки клавиши Escape)
  const panelRef = useRef<HTMLDivElement>(null);
  
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

  const [isBlackAndWhite, setIsBlackAndWhite] = useState<boolean>(() => {
    const stored = localStorage.getItem('preferred-black-and-white');
    return stored === 'true';
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

  // Effect to apply black and white mode
  useEffect(() => {
    if (isBlackAndWhite) {
      document.documentElement.classList.add('grayscale');
    } else {
      document.documentElement.classList.remove('grayscale');
    }
    localStorage.setItem('preferred-black-and-white', isBlackAndWhite.toString());
  }, [isBlackAndWhite]);

  // Effect to handle keydown events for accessibility panel
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isPanelOpen) return;
      
      // Закрытие панели при нажатии Escape
      if (e.key === 'Escape') {
        setIsPanelOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

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

  const toggleBlackAndWhite = () => {
    setIsBlackAndWhite(prev => !prev);
  };

  const togglePanel = useCallback(() => {
    setIsPanelOpen(prev => !prev);
  }, []);

  const closePanel = useCallback(() => {
    setIsPanelOpen(false);
  }, []);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        lineSpacing,
        setLineSpacing,
        wordSpacing,
        setWordSpacing,
        isBlackAndWhite,
        toggleBlackAndWhite,
        isPanelOpen,
        togglePanel,
        panelRef,
        closePanel
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
