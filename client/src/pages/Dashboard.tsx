import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useToast } from "@/hooks/use-toast";
import { File } from "@shared/schema";
import { FileList } from "@/components/FileExplorer/FileList";
import { FileUpload } from "@/components/FileExplorer/FileUpload";
import { FileActions } from "@/components/FileExplorer/FileActions";
import { StorageQuota } from "@/components/FileExplorer/StorageQuota";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Home, ChevronRight, Folder } from "lucide-react";

export default function Dashboard() {
  const { t } = useLocale();
  const { user, status } = useAuth();
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPath, setCurrentPath] = useState<number | null>(null);
  const [pathHistory, setPathHistory] = useState<Array<{id: number | null, name: string}>>([
    { id: null, name: t("dashboard.myFiles") }
  ]);
  const [isUploadVisible, setIsUploadVisible] = useState(false);
  
  // Очищаем кэш запросов при монтировании компонента, чтобы предотвратить показ данных предыдущего пользователя
  useEffect(() => {
    // Очищаем кэш данных файлов
    queryClient.invalidateQueries({ queryKey: ["/api/files"] });
    
    // Сбрасываем путь и историю при входе
    setCurrentPath(null);
    setPathHistory([{ id: null, name: t("dashboard.myFiles") }]);
  }, [queryClient, user?.id, t]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/auth");
    }
  }, [status, navigate]);

  // Reset path history when language changes
  useEffect(() => {
    setPathHistory([{ id: null, name: t("dashboard.myFiles") }]);
  }, [t]);
  
  // Fetch files
  const { 
    data: files,
    isLoading: isLoadingFiles,
    error: filesError
  } = useQuery<File[]>({
    queryKey: ["/api/files", currentPath, searchQuery],
    queryFn: async () => {
      const endpoint = `/api/files?${currentPath ? `parentId=${currentPath}` : 'parentId=null'}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ''}`;
      const response = await fetch(endpoint, { credentials: 'include' });
      if (!response.ok) throw new Error(t("notifications.navigateError"));
      return response.json();
    },
    enabled: status === "authenticated"
  });
  
  // Create folder mutation
  const createFolderMutation = useMutation({
    mutationFn: async (name: string) => {
      const response = await apiRequest("POST", "/api/files/folder", {
        name,
        parentId: currentPath
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      toast({
        title: t("common.success"),
        description: t("notifications.createFolderSuccess")
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("notifications.createFolderFailed"),
        variant: "destructive"
      });
    }
  });
  
  // Upload files mutation
  const uploadFilesMutation = useMutation({
    mutationFn: async (files: FileList | File[]) => {
      const formData = new FormData();
      
      // Обработка как FileList, так и File[]
      if (files instanceof FileList) {
        for (let i = 0; i < files.length; i++) {
          formData.append('files', files[i]);
        }
      } else {
        // Предполагаем, что это массив HTML5 File объектов, не схемы File
        files.forEach(file => {
          formData.append('files', file);
        });
      }
      
      if (currentPath !== null) {
        formData.append('parentId', currentPath.toString());
      }
      
      const response = await fetch('/api/files/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Upload failed');
      }
      
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      toast({
        title: t("common.success"),
        description: t("notifications.uploadSuccess")
      });
      setIsUploadVisible(false);
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("notifications.uploadFailed"),
        variant: "destructive"
      });
    }
  });
  
  // Delete file mutation
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: number) => {
      await apiRequest("DELETE", `/api/files/${fileId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      toast({
        title: t("common.success"),
        description: t("notifications.deleteSuccess")
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("notifications.deleteFailed"),
        variant: "destructive"
      });
    }
  });
  
  // Rename file mutation
  const renameFileMutation = useMutation({
    mutationFn: async ({ fileId, newName }: { fileId: number, newName: string }) => {
      const response = await apiRequest("PATCH", `/api/files/${fileId}/rename`, { name: newName });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] });
      toast({
        title: t("common.success"),
        description: t("notifications.renameSuccess")
      });
    },
    onError: (error) => {
      toast({
        title: t("common.error"),
        description: error.message || t("notifications.renameFailed"),
        variant: "destructive"
      });
    }
  });
  
  // Handle folder click - navigate into folder
  const handleFolderClick = async (folderId: number) => {
    try {
      // Находим папку в текущем списке
      const folder = files?.find(file => file.id === folderId);
      
      if (!folder) {
        toast({
          title: t("common.error"),
          description: t("notifications.folderNotFound"),
          variant: "destructive"
        });
        return;
      }
      
      if (!folder.isFolder) {
        toast({
          title: t("common.error"),
          description: t("dashboard.notAFolder"),
          variant: "destructive"
        });
        return;
      }
      
      // Проверяем доступ к папке перед навигацией
      try {
        // Предварительно запросим содержимое папки, чтобы убедиться, что у нас есть доступ
        const response = await fetch(`/api/files?parentId=${folderId}`, { 
          credentials: 'include'
        });
        
        if (!response.ok) {
          // Если сервер вернул ошибку, показываем ее пользователю
          const errorData = await response.json();
          throw new Error(errorData.message || t("notifications.noPermission"));
        }
      } catch (error) {
        console.error("Folder access error:", error);
        toast({
          title: t("common.error"),
          description: error instanceof Error ? error.message : t("notifications.noPermission"),
          variant: "destructive"
        });
        return;
      }
      
      // Обновляем состояние и переходим в папку
      console.log(`Navigating to folder: ${folder.name} (ID: ${folderId})`);
      setCurrentPath(folderId);
      setPathHistory(prev => [...prev, { id: folderId, name: folder.name }]);
      
      // Принудительно инвалидируем кеш для этой папки
      queryClient.invalidateQueries({ queryKey: ["/api/files", folderId] });
    } catch (error) {
      console.error("Error navigating to folder:", error);
      toast({
        title: t("common.error"),
        description: "Failed to navigate to the selected folder",
        variant: "destructive"
      });
    }
  };
  
  // Handle breadcrumb click - navigate to specific path
  const handleBreadcrumbClick = async (index: number) => {
    try {
      const newPath = pathHistory[index];
      
      // Если переходим в корневую директорию (null) или обратно по пути
      if (newPath.id === null || index < pathHistory.length - 1) {
        console.log(`Navigating to path via breadcrumb: ${newPath.name} (ID: ${newPath.id})`);
        
        // Принудительно инвалидируем кеш для новой директории
        queryClient.invalidateQueries({ queryKey: ["/api/files", newPath.id] });
        
        // Обновляем состояние
        setCurrentPath(newPath.id);
        setPathHistory(prev => prev.slice(0, index + 1));
      } else {
        // Дополнительная проверка для других случаев
        try {
          // Проверяем доступ к папке перед навигацией
          const response = await fetch(`/api/files?parentId=${newPath.id}`, { 
            credentials: 'include'
          });
          
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || t("notifications.noPermission"));
          }
          
          // Если всё в порядке, обновляем состояние
          setCurrentPath(newPath.id);
          setPathHistory(prev => prev.slice(0, index + 1));
          
          // Принудительно инвалидируем кеш
          queryClient.invalidateQueries({ queryKey: ["/api/files", newPath.id] });
        } catch (error) {
          console.error("Breadcrumb navigation error:", error);
          toast({
            title: t("common.error"),
            description: error instanceof Error ? error.message : t("notifications.navigateError"),
            variant: "destructive"
          });
        }
      }
    } catch (error) {
      console.error("Breadcrumb navigation error:", error);
      toast({
        title: t("common.error"),
        description: t("notifications.navigateError"),
        variant: "destructive"
      });
    }
  };
  
  // Handle file download
  const handleFileDownload = async (file: File) => {
    try {
      const response = await fetch(`/api/files/${file.id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      // Create a blob from the response
      const blob = await response.blob();
      
      // Create a link element and trigger download
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      toast({
        title: t("common.error"),
        description: t("notifications.downloadFailed"),
        variant: "destructive"
      });
    }
  };
  
  // Handle file share - generate and copy share link
  const handleFileShare = (file: File) => {
    // In a real app, this would call the API to create a share link
    // For now, we'll just simulate copying a link
    const shareLink = `${window.location.origin}/shared/${file.id}`;
    navigator.clipboard.writeText(shareLink);
    
    toast({
      title: t("common.success"),
      description: "Share link copied to clipboard"
    });
  };
  
  // Handle file rename
  const handleFileRename = (file: File, newName: string) => {
    renameFileMutation.mutate({ fileId: file.id, newName });
  };
  
  // Handle file delete
  const handleFileDelete = (file: File) => {
    deleteFileMutation.mutate(file.id);
  };
  
  // Handle file upload
  const handleUploadFiles = async (files: FileList | File[]) => {
    await uploadFilesMutation.mutateAsync(files);
  };
  
  // Handle create folder
  const handleCreateFolder = async (name: string) => {
    await createFolderMutation.mutateAsync(name);
  };
  
  // Handle search query change
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };
  
  // Handle upload button click
  const handleUploadClick = () => {
    setIsUploadVisible(prev => !prev);
  };
  
  // If loading auth status
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">{t("common.loading")}</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main id="main-content" className="flex-grow flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-gray-50 dark:bg-gray-900 p-4 md:min-h-0 md:h-[calc(100vh-4rem)] overflow-auto">
          <nav>
            <ul className="space-y-2">
              <li>
                <Button 
                  variant="ghost" 
                  className="flex items-center w-full justify-start rounded-lg text-left"
                  onClick={() => {
                    setCurrentPath(null);
                    setPathHistory([{ id: null, name: t("dashboard.myFiles") }]);
                  }}
                >
                  <Folder className="mr-3 h-5 w-5" />
                  <span>{t("dashboard.myFiles")}</span>
                </Button>
              </li>
            </ul>
          </nav>
          
          {/* Storage Quota */}
          {user && (
            <div className="mt-8">
              <StorageQuota 
                usedBytes={user.usedSpace} 
                totalBytes={user.quota} 
              />
            </div>
          )}
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-grow p-6 bg-gray-100 dark:bg-gray-800 overflow-y-auto h-[calc(100vh-4rem)]">
          {/* Breadcrumb */}
          <div className="flex items-center mb-6 overflow-x-auto whitespace-nowrap py-2">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="inline-flex items-center space-x-1 md:space-x-3">
                {pathHistory.map((path, index) => (
                  <li key={index} className="inline-flex items-center">
                    {index > 0 && (
                      <ChevronRight className="mx-2 h-4 w-4 text-gray-400" />
                    )}
                    <Button
                      variant="ghost"
                      className="text-gray-700 dark:text-gray-300 hover:text-primary p-0 h-auto"
                      onClick={() => handleBreadcrumbClick(index)}
                    >
                      {index === 0 && (
                        <Home className="mr-1 h-4 w-4" />
                      )}
                      <span>{path.name}</span>
                    </Button>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
          
          {/* Action Bar */}
          <FileActions 
            onSearchChange={handleSearchChange}
            onCreateFolder={handleCreateFolder}
            onUploadClick={handleUploadClick}
            isUploading={uploadFilesMutation.isPending}
          />
          
          {/* File Upload Area */}
          {isUploadVisible && (
            <FileUpload 
              onUploadFiles={handleUploadFiles}
              currentPath={currentPath}
              disabled={uploadFilesMutation.isPending}
            />
          )}
          
          {/* Loading state */}
          {isLoadingFiles && (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex items-center p-4 border-b border-gray-200 dark:border-gray-600">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="ml-4 space-y-2 flex-grow">
                    <Skeleton className="h-4 w-[250px]" />
                    <Skeleton className="h-4 w-[200px]" />
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Error state */}
          {filesError && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-lg">
              <p className="text-red-700 dark:text-red-300">
                {(filesError as Error).message || "Failed to load files"}
              </p>
              <Button 
                variant="outline" 
                className="mt-2"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/files", currentPath] })}
              >
                Try Again
              </Button>
            </div>
          )}
          
          {/* Files List */}
          {!isLoadingFiles && !filesError && files && (
            <FileList 
              files={files}
              currentPath={currentPath}
              onFolderClick={handleFolderClick}
              onFileDownload={handleFileDownload}
              onFileShare={handleFileShare}
              onFileRename={handleFileRename}
              onFileDelete={handleFileDelete}
            />
          )}
        </div>
      </main>
    </div>
  );
}
