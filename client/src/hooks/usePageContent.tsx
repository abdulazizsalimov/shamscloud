import { useEffect } from "react";
import { useLocale } from "@/providers/LocaleProvider";

export function usePageContent() {
  const { locale } = useLocale();

  useEffect(() => {
    // Применяем сохраненный контент к странице
    const applySavedContent = () => {
      const savedContent = localStorage.getItem(`page-content-${window.location.pathname}-${locale}`);
      if (!savedContent) return;

      try {
        const parsed = JSON.parse(savedContent);
        
        // Находим все редактируемые элементы и применяем сохраненный контент
        const editableElements = document.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
        editableElements.forEach((element, index) => {
          const elementId = `editable-${element.tagName.toLowerCase()}-${index}`;
          const savedText = parsed[elementId];
          
          if (savedText) {
            element.textContent = savedText;
          }
        });
      } catch (error) {
        console.error('Ошибка при применении сохраненного контента:', error);
      }
    };

    // Применяем контент с небольшой задержкой, чтобы страница успела загрузиться
    const timer = setTimeout(applySavedContent, 100);
    
    return () => clearTimeout(timer);
  }, [locale]);
}