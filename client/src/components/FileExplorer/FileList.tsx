import { useState } from 'react';
import { File as FileType } from '@shared/schema';
import { useLocale } from '@/providers/LocaleProvider';
import { formatFileSize, formatDate } from '@/lib/utils';
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
    onFileShare(file);
    // Copy the share link to clipboard (this would be a real link in a production app)
    navigator.clipboard.writeText(`https://shamscloud.app/shared/${file.id}`);
    toast({
      title: t("common.success"),
      description: t("notifications.shareSuccess"),
    });
  };

  return (
    <div className="bg-white dark:bg-gray-700 rounded-lg shadow overflow-hidden">
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
        files.map((file) => (
          <div 
            key={file.id}
            className="flex items-center p-4 border-b border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600"
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
                    <MoreVertical className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{file.name}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  {!file.isFolder && (
                    <DropdownMenuItem onClick={() => onFileDownload(file as FileType)}>
                      <Download className="mr-2 h-4 w-4" />
                      <span>{t("common.download")}</span>
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handleShareFile(file as FileType)}>
                    <Share className="mr-2 h-4 w-4" />
                    <span>{t("common.share")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleRenameClick(file as FileType)}>
                    <Edit className="mr-2 h-4 w-4" />
                    <span>{t("common.rename")}</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => handleDeleteClick(file as FileType)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    <span>{t("common.delete")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        ))
      )}

      {/* Rename Dialog */}
      <Dialog open={fileToRename !== null} onOpenChange={(open) => !open && setFileToRename(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("common.rename")}</DialogTitle>
            <DialogDescription>
              {t("dashboard.enterNewName")} {fileToRename?.name}
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newFileName}
            onChange={(e) => setNewFileName(e.target.value)}
            placeholder={t("common.newName")}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setFileToRename(null)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleRenameSubmit}>{t("common.save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={fileToDelete !== null} 
        onOpenChange={(open) => !open && setFileToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("common.confirmDelete")}</AlertDialogTitle>
            <AlertDialogDescription>
              {fileToDelete?.isFolder
                ? `${t("common.areYouSure")} "${fileToDelete?.name}"? ${t("common.thisActionCannotBeUndone")}`
                : `${t("common.areYouSure")} "${fileToDelete?.name}"? ${t("common.thisActionCannotBeUndone")}`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-red-500 hover:bg-red-600"
            >
              {t("common.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
