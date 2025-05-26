import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Save, X } from "lucide-react";
import { useLocale } from "@/providers/LocaleProvider";

interface EditableContentProps {
  children: React.ReactNode;
  isEditMode: boolean;
  onSave: () => void;
  onCancel: () => void;
}

export function EditableContent({ children, isEditMode, onSave, onCancel }: EditableContentProps) {
  const { t } = useLocale();
  const [editingElement, setEditingElement] = useState<HTMLElement | null>(null);
  const [originalContent, setOriginalContent] = useState<string>("");
  const [hasChanges, setHasChanges] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

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
    const textTags = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'SPAN', 'DIV', 'A', 'LI'];
    return textTags.includes(element.tagName) && element.textContent?.trim() !== '';
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
      setHasChanges(true);
    }
    
    setEditingElement(null);
    setOriginalContent('');
  };

  const handleSave = () => {
    setHasChanges(false);
    onSave();
  };

  const handleCancel = () => {
    // Восстанавливаем оригинальный контент для всех измененных элементов
    if (contentRef.current) {
      window.location.reload(); // Простой способ отменить все изменения
    }
    setHasChanges(false);
    onCancel();
  };

  if (!isEditMode) {
    return <>{children}</>;
  }

  return (
    <div className="relative">
      {/* Панель управления сверху */}
      <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg p-3 flex items-center space-x-3">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {t("admin.editingMode")}
        </span>
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