import { useState, useRef, useEffect, useCallback } from 'react';
import { File as FileType } from '@shared/schema';
import { useLocale } from '@/providers/LocaleProvider';
import { formatFileSize, formatDate } from '@/lib/utils';
import { ShareModal } from './ShareModal';
import { Folder, FileText, Image, FileIcon, FileSpreadsheet, MoreVertical, Download, Share, Edit, Trash2 } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";

interface FileListProps {
  files: FileType[];
  currentPath: number | null;
  onFolderClick: (folderId: number) => void;
  onFileDownload: (file: FileType) => void;
  onFileShare: (file: FileType) => void;
  onFileRename: (file: FileType, newName: string) => void;
  onFileDelete: (file: FileType) => void;
}

export function FileList({
  files,
  currentPath,
  onFolderClick,
  onFileDownload,
  onFileShare,
  onFileRename,
  onFileDelete,
}: FileListProps) {
  const { t } = useLocale();
  const [fileToRename, setFileToRename] = useState<FileType | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [fileToDelete, setFileToDelete] = useState<FileType | null>(null);
  const [fileToShare, setFileToShare] = useState<FileType | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Состояния для клавиатурной навигации
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const [ariaAnnouncement, setAriaAnnouncement] = useState('');
  const fileListRef = useRef<HTMLDivElement>(null);
  const fileRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Обновление массива refs при изменении списка файлов
  useEffect(() => {
    fileRefs.current = fileRefs.current.slice(0, files.length);
  }, [files.length]);

  // Сброс фокуса при изменении текущего пути
  useEffect(() => {
    setFocusedIndex(-1);
  }, [currentPath]);

  // Функция для объявления элемента через ARIA
  const announceItem = useCallback((file: FileType, action?: string) => {
    const itemType = file.isFolder ? t("dashboard.folder") : t("common.file");
    const message = action 
      ? `${action} ${itemType}: ${file.name}`
      : `${itemType}: ${file.name}`;
    
    setAriaAnnouncement(message);
    
    // Очищаем объявление через короткое время
    setTimeout(() => setAriaAnnouncement(''), 1000);
  }, [t]);

  // Функция для объявления границ списка
  const announceBoundary = useCallback((isFirst: boolean) => {
    const message = isFirst 
      ? "Это первый элемент списка"
      : "Это последний элемент списка";
    
    setAriaAnnouncement(message);
    
    // Очищаем объявление через короткое время
    setTimeout(() => setAriaAnnouncement(''), 1000);
  }, []);

  // Обработка клавиатурной навигации
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (files.length === 0) return;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(prev => {
          // Если мы на последнем элементе, не двигаемся дальше
          if (prev >= files.length - 1) {
            announceBoundary(false); // Сообщаем о последнем элементе
            return prev;
          }
          
          const newIndex = prev + 1;
          const file = files[newIndex];
          if (file) {
            announceItem(file);
            // Устанавливаем фокус на элемент
            setTimeout(() => {
              const element = fileRefs.current[newIndex];
              if (element) {
                element.focus();
              }
            }, 0);
          }
          return newIndex;
        });
        break;

      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(prev => {
          // Если мы на первом элементе, не двигаемся дальше
          if (prev <= 0) {
            announceBoundary(true); // Сообщаем о первом элементе
            return prev;
          }
          
          const newIndex = prev - 1;
          const file = files[newIndex];
          if (file) {
            announceItem(file);
            // Устанавливаем фокус на элемент
            setTimeout(() => {
              const element = fileRefs.current[newIndex];
              if (element) {
                element.focus();
              }
            }, 0);
          }
          return newIndex;
        });
        break;

      case 'Enter':
      case ' ':
        event.preventDefault();
        if (focusedIndex >= 0 && focusedIndex < files.length) {
          const file = files[focusedIndex];
          if (file.isFolder) {
            announceItem(file, t("accessibility.opening"));
            onFolderClick(file.id);
          } else {
            announceItem(file, t("accessibility.downloading"));
            onFileDownload(file);
          }
        }
        break;
    }
  }, [files, focusedIndex, onFolderClick, onFileDownload, announceItem, announceBoundary, t]);

  // Добавление/удаление обработчика клавиш
  useEffect(() => {
    if (fileListRef.current) {
      const element = fileListRef.current;
      element.addEventListener('keydown', handleKeyDown);
      return () => element.removeEventListener('keydown', handleKeyDown);
    }
  }, [handleKeyDown]);

  // Get file icon based on type
  const getFileIcon = (file: FileType) => {
    if (file.isFolder) return <Folder className="text-yellow-500" />;
    
    const extension = file.name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <Image className="text-purple-500" />;
      case 'pdf':
        return <FileIcon className="text-red-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="text-green-500" />;
      default:
        return <FileText className="text-blue-500" />;
    }
  };

  const handleRenameClick = (file: FileType) => {
    setFileToRename(file);
    setNewFileName(file.name);
  };

  const handleRenameSubmit = () => {
    if (fileToRename && newFileName.trim()) {
      onFileRename(fileToRename, newFileName.trim());
      setFileToRename(null);
    }
  };

  const handleDeleteClick = (file: FileType) => {
    setFileToDelete(file);
  };

  const handleDeleteConfirm = () => {
    if (fileToDelete) {
      onFileDelete(fileToDelete);
      setFileToDelete(null);
    }
  };

  const handleShareFile = (file: FileType) => {
    setFileToShare(file);
    setShareModalOpen(true);
  };

  return (
    <>
      {/* ARIA Live Region для объявлений */}
      <div 
        className="sr-only" 
        aria-live="polite" 
        aria-atomic="true"
        role="status"
      >
        {ariaAnnouncement}
      </div>
      
      <div 
        ref={fileListRef}
        className="bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden"
        role="listbox"
        aria-label={t("dashboard.filesList")}
        tabIndex={0}
      >
        {/* Table Header */}
        <div className="flex items-center p-4 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 font-medium">
          <div className="w-12"></div> {/* Icon column */}
          <div className="flex-grow">{t("dashboard.fileName")}</div>
          <div className="w-32 text-right hidden md:block">{t("dashboard.fileSize")}</div>
          <div className="w-48 text-right hidden md:block">{t("dashboard.modified")}</div>
          <div className="w-20"></div> {/* Actions column */}
        </div>

        {/* File List */}
        {files.length === 0 ? (
          <div className="p-8 text-center text-gray-500 dark:text-gray-400">
            {currentPath === null
              ? t("notifications.emptyStorage")
              : t("dashboard.emptyFolder")}
          </div>
        ) : (
          files.map((file, index) => (
            <div 
              key={file.id}
              ref={el => fileRefs.current[index] = el}
              className={`flex items-center p-4 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 ${
                focusedIndex === index ? 'bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500' : ''
              }`}
              role="option"
              aria-selected={focusedIndex === index}
              tabIndex={-1}
            >
              <div className="w-12">
                {getFileIcon(file)}
              </div>
              <div 
                className="flex-grow cursor-pointer"
                onClick={() => file.isFolder && onFolderClick(file.id)}
              >
                <span className="font-medium">{file.name}</span>
              </div>
              <div className="w-32 text-right text-gray-500 hidden md:block">
                {file.isFolder 
                  ? t("dashboard.folder") 
                  : formatFileSize(file.size)
                }
              </div>
              <div className="w-48 text-right text-gray-500 hidden md:block">
                {formatDate(new Date(file.updatedAt))}
              </div>
              <div className="w-20 text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      aria-label={t("dashboard.actions")}
                    >
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{t("dashboard.actions")}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {!file.isFolder && (
                      <DropdownMenuItem onClick={() => onFileDownload(file)}>
                        <Download className="mr-2 h-4 w-4" />
                        {t("dashboard.download")}
                      </DropdownMenuItem>
                    )}
                    <DropdownMenuItem onClick={() => handleShareFile(file)}>
                      <Share className="mr-2 h-4 w-4" />
                      {t("dashboard.share")}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleRenameClick(file)}>
                      <Edit className="mr-2 h-4 w-4" />
                      {t("dashboard.rename")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => handleDeleteClick(file)}
                      className="text-red-600"
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("common.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Rename Dialog */}
      <Dialog open={!!fileToRename} onOpenChange={() => setFileToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("dashboard.renameFile")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.enterNewName")}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={t("dashboard.fileName")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToRename(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRenameSubmit}>
              {t("dashboard.rename")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!fileToDelete} onOpenChange={() => setFileToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("dashboard.deleteFile")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("dashboard.deleteConfirmation", { fileName: fileToDelete?.name })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setFileToDelete(null)}>
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-red-600 hover:bg-red-700">
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Share Modal */}
      <ShareModal
        file={fileToShare}
        open={shareModalOpen}
        onOpenChange={setShareModalOpen}
      />
    </>
  );
}