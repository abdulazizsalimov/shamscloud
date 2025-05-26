import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, X, Globe } from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EditableContentProps {
  children: React.ReactNode;
  isEditMode: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditableContent({ children, isEditMode, onSave, onCancel }: EditableContentProps) {
  const { t, locale, setLocale } = useLocale();
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const [editingLanguage, setEditingLanguage] = useState<string>(locale);
  const [availableLanguages, setAvailableLanguages] = useState(() => {
    const stored = localStorage.getItem('availableLanguages');
    return stored ? JSON.parse(stored) : [
      { code: 'ru', name: 'Русский', englishName: 'Russian' },
      { code: 'en', name: 'English', englishName: 'English' }
    ];
  });
  const [editedContent, setEditedContent] = useState<Map<string, string>>(new Map());
  const contentRef = useRef<HTMLDivElement>(null);

  // Загружаем сохраненный контент при монтировании
  useEffect(() => {
    const savedContent = localStorage.getItem(`page-content-${window.location.pathname}-${editingLanguage}`);
    if (savedContent) {
      const parsed = JSON.parse(savedContent);
      setEditedContent(new Map(Object.entries(parsed)));
    }
  }, [editingLanguage]);

  // Применяем сохраненный контент к элементам
  useEffect(() => {
    if (!isEditMode || !contentRef.current) return;
    
    // Добавляем уникальные идентификаторы к редактируемым элементам
    const editableElements = contentRef.current.querySelectorAll('h1, h2, h3, h4, h5, h6, p');
    editableElements.forEach((element, index) => {
      const elementId = `editable-${element.tagName.toLowerCase()}-${index}`;
      element.setAttribute('data-editable-id', elementId);
      
      // Применяем сохраненный контент, если есть
      const savedText = editedContent.get(elementId);
      if (savedText) {
        element.textContent = savedText;
      }
    });
  }, [isEditMode, editedContent]);

  useEffect(() => {
    if (!isEditMode) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      
      // Проверяем, что это текстовый элемент (p, h1-h6, span, div с текстом)
      if (isTextElement(target) && !target.classList.contains('editing-active')) {
        // Убираем предыдущие выделения
        removeHighlights();
        // Добавляем выделение
        target.classList.add('editable-highlight');
      }
    };

    const handleMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isTextElement(target) && !target.classList.contains('editing-active')) {
        target.classList.remove('editable-highlight');
      }
    };

    const handleDoubleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isTextElement(target)) {
        e.preventDefault();
        startEditing(target);
      }
    };

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (editingElement && !editingElement.contains(target)) {
        stopEditing();
      }
    };

    if (contentRef.current) {
      const content = contentRef.current;
      content.addEventListener('mouseover', handleMouseOver);
      content.addEventListener('mouseout', handleMouseOut);
      content.addEventListener('dblclick', handleDoubleClick);
      document.addEventListener('click', handleClickOutside);

      return () => {
        content.removeEventListener('mouseover', handleMouseOver);
        content.removeEventListener('mouseout', handleMouseOut);
        content.removeEventListener('dblclick', handleDoubleClick);
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isEditMode, editingElement]);

  const isTextElement = (element: HTMLElement): boolean => {
    // Разрешаем редактирование только заголовков и абзацев
    const allowedTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    
    // Проверяем, что это не интерактивный элемент
    const isInteractive = element.closest('button, a, input, textarea, select, [role="button"]');
    
    return allowedTags.includes(element.tagName) && 
           element.textContent?.trim() !== '' && 
           !isInteractive;
  };

  const removeHighlights = () => {
    if (contentRef.current) {
      const highlighted = contentRef.current.querySelectorAll('.editable-highlight');
      highlighted.forEach(el => el.classList.remove('editable-highlight'));
    }
  };

  const startEditing = (element: HTMLElement) => {
    if (editingElement) {
      stopEditing();
    }

    setOriginalContent(element.textContent || '');
    setEditingElement(element);
    element.classList.add('editing-active');
    element.classList.remove('editable-highlight');
    element.contentEditable = 'true';
    
    // Сохраняем исходный стиль элемента
    element.style.fontFamily = window.getComputedStyle(element).fontFamily;
    element.style.fontSize = window.getComputedStyle(element).fontSize;
    element.style.fontWeight = window.getComputedStyle(element).fontWeight;
    element.style.color = window.getComputedStyle(element).color;
    
    element.focus();
    
    // Выделяем весь текст
    const range = document.createRange();
    range.selectNodeContents(element);
    const selection = window.getSelection();
    selection?.removeAllRanges();
    selection?.addRange(range);
  };

  const stopEditing = () => {
    if (!editingElement) return;

    const newContent = editingElement.textContent || '';
    editingElement.contentEditable = 'false';
    editingElement.classList.remove('editing-active');
    
    if (newContent !== originalContent) {
      const elementId = editingElement.getAttribute('data-editable-id');
      if (elementId) {
        setEditedContent(prev => {
          const newMap = new Map(prev);
          newMap.set(elementId, newContent);
          return newMap;
        });
      }
      setHasChanges(true);
    }
    
    setEditingElement(null);
    setOriginalContent('');
  };

  const handleSave = () => {
    // Сохраняем изменения в localStorage
    const contentToSave = Object.fromEntries(editedContent);
    localStorage.setItem(`page-content-${window.location.pathname}-${editingLanguage}`, JSON.stringify(contentToSave));
    
    setHasChanges(false);
    console.log('Изменения сохранены для языка:', editingLanguage);
    onSave();
  };

  const handleCancel = () => {
    // Очищаем временные изменения и восстанавливаем исходный контент
    setEditedContent(new Map());
    
    // Восстанавливаем оригинальный контент для всех элементов
    if (contentRef.current) {
      const editableElements = contentRef.current.querySelectorAll('[data-editable-id]');
      editableElements.forEach(element => {
        const elementId = element.getAttribute('data-editable-id');
        if (elementId) {
          // Восстанавливаем оригинальный текст из сохраненной версии
          const savedContent = localStorage.getItem(`page-content-${window.location.pathname}-${editingLanguage}`);
          if (savedContent) {
            const parsed = JSON.parse(savedContent);
            const savedText = parsed[elementId];
            if (savedText) {
              element.textContent = savedText;
            }
          }
        }
      });
    }
    
    setHasChanges(false);
    onCancel();
  };

  const handleLanguageChange = (newLanguage: string) => {
    setEditingLanguage(newLanguage);
    // Проверяем, что язык поддерживается
    if (newLanguage === 'ru' || newLanguage === 'en') {
      setLocale(newLanguage);
    }
    // Сохраняем изменения перед сменой языка
    if (hasChanges) {
      setHasChanges(false);
    }
  };

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Панель управления сверху */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 flex items-center space-x-4">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.editingMode")}
        </span>
        
        {/* Селектор языков */}
        <div className="flex items-center space-x-2">
          <Globe className="h-4 w-4 text-gray-500 dark:text-gray-400" />
          <Select value={editingLanguage} onValueChange={handleLanguageChange}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {availableLanguages.map((lang: any) => (
                <SelectItem key={lang.code} value={lang.code} className="text-xs">
                  {lang.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="flex space-x-2">
          <Button
            onClick={handleSave}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={!hasChanges}
          >
            <Save className="h-4 w-4 mr-1" />
            {t("common.save")}
          </Button>
          <Button
            onClick={handleCancel}
            size="sm"
            variant="outline"
            className="border-gray-300 dark:border-gray-600"
          >
            <X className="h-4 w-4 mr-1" />
            {t("common.cancel")}
          </Button>
        </div>
      </div>

      {/* Контент с возможностью редактирования */}
      <div 
        ref={contentRef}
        className="editable-content"
        style={{ paddingTop: '80px' }} // Отступ для панели управления
      >
        {children}
      </div>
    </div>
  );
}