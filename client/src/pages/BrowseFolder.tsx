import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, File, Folder, Lock, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface FileItem {
  id: number;
  name: string;
  isFolder: boolean;
  size: string;
  type: string;
}

interface FolderData {
  name: string;
  files: FileItem[];
  isPasswordProtected: boolean;
  currentPath?: string;
  parentId?: number | null;
}

function BrowseFolder() {
  const { token } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [folderData, setFolderData] = useState<FolderData | null>(null);
  const [password, setPassword] = useState("");
  const [validPassword, setValidPassword] = useState(""); // Сохраняем валидный пароль
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(null); // Текущая папка для навигации
  const [isLoading, setIsLoading] = useState(true);
  const [isPasswordRequired, setIsPasswordRequired] = useState(false);
  const [error, setError] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [ariaAnnouncement, setAriaAnnouncement] = useState("");

  useEffect(() => {
    loadFolderData();
  }, [token]);

  // Устанавливаем фокус на первый элемент при загрузке данных
  useEffect(() => {
    if (folderData?.files && folderData.files.length > 0) {
      setFocusedIndex(0);
      itemRefs.current = itemRefs.current.slice(0, folderData.files.length);
      // Фокусируем первый элемент
      setTimeout(() => {
        if (itemRefs.current[0]) {
          itemRefs.current[0].focus();
        }
      }, 100);
    }
  }, [folderData]);

  // Обработчик клавиатурной навигации
  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (!folderData?.files || folderData.files.length === 0) return;

    const totalItems = folderData.files.length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (focusedIndex < totalItems - 1) {
          const newIndex = focusedIndex + 1;
          setFocusedIndex(newIndex);
          itemRefs.current[newIndex]?.focus();
        } else {
          // Объявляем для скрин-ридера, что это последний элемент
          setAriaAnnouncement(`Это последний элемент списка. ${folderData.files[focusedIndex].name}`);
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (focusedIndex > 0) {
          const newIndex = focusedIndex - 1;
          setFocusedIndex(newIndex);
          itemRefs.current[newIndex]?.focus();
        } else {
          // Объявляем для скрин-ридера, что это первый элемент
          setAriaAnnouncement(`Это первый элемент списка. ${folderData.files[focusedIndex].name}`);
        }
        break;
      case 'Backspace':
        event.preventDefault();
        if (currentFolderId) {
          // Возвращаемся в родительскую папку
          setAriaAnnouncement("Возвращение в родительскую папку");
          navigateBack();
        } else {
          // Уже в корневой папке
          setAriaAnnouncement("Вы уже находитесь в корневой папке");
        }
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        const currentFile = folderData.files[focusedIndex];
        if (currentFile) {
          if (currentFile.isFolder) {
            setAriaAnnouncement(`Открытие папки: ${currentFile.name}`);
            navigateToFolder(currentFile.id);
          } else {
            setAriaAnnouncement(`Скачивание файла: ${currentFile.name}`);
            handleFileDownload(currentFile.id, currentFile.name);
          }
        }
        break;
    }
  }, [focusedIndex, folderData, currentFolderId]);

  const loadFolderData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/public/browse/${token}`);
      
      if (response.status === 401) {
        setIsPasswordRequired(true);
        setIsLoading(false);
        return;
      }
      
      if (!response.ok) {
        throw new Error("Папка не найдена или недоступна");
      }
      
      const data = await response.json();
      setFolderData(data);
      setIsPasswordRequired(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка загрузки папки");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      toast({
        title: "Ошибка",
        description: "Введите пароль",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Sending password:', password);
      const response = await fetch(`/api/public/browse/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (!response.ok) {
        throw new Error("Неверный пароль");
      }

      const data = await response.json();
      setFolderData(data);
      setValidPassword(password); // Сохраняем правильный пароль
      setIsPasswordRequired(false);
      setPassword("");
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Неверный пароль",
        variant: "destructive",
      });
    }
  };

  const navigateToFolder = async (folderId: number) => {
    try {
      setIsLoading(true);
      console.log('Navigating to folder:', folderId, 'with password:', validPassword);
      const requestBody = { 
        password: validPassword,
        folderId: folderId 
      };
      console.log('Request body:', requestBody);
      
      const response = await fetch(`/api/public/browse/${token}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        throw new Error("Ошибка доступа к папке");
      }

      const data = await response.json();
      setFolderData(data);
      setCurrentFolderId(folderId);
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Не удалось открыть папку",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const navigateBack = async () => {
    if (currentFolderId) {
      try {
        setIsLoading(true);
        // Возвращаемся к корневой папке (без folderId)
        const response = await fetch(`/api/public/browse/${token}`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ 
            password: validPassword 
          }),
        });

        if (!response.ok) {
          throw new Error("Ошибка возврата к корневой папке");
        }

        const data = await response.json();
        setFolderData(data);
        setCurrentFolderId(null);
      } catch (err) {
        toast({
          title: "Ошибка",
          description: err instanceof Error ? err.message : "Не удалось вернуться к корневой папке",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleFileDownload = async (fileId: number, fileName: string) => {
    try {
      const passwordToSend = folderData?.isPasswordProtected ? validPassword : "";
      console.log('Download file:', { fileId, passwordToSend, isPasswordProtected: folderData?.isPasswordProtected, validPassword });
      
      const response = await fetch(`/api/public/download-file/${token}/${fileId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password: passwordToSend }),
      });

      if (!response.ok) {
        throw new Error("Ошибка скачивания файла");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      toast({
        title: "Ошибка",
        description: err instanceof Error ? err.message : "Ошибка скачивания файла",
        variant: "destructive",
      });
    }
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size);
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-300">Загрузка папки...</p>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="text-red-600">Ошибка</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600 dark:text-gray-300 mb-4">{error}</p>
              <Button onClick={() => setLocation("/")} className="w-full">
                <ArrowLeft className="h-4 w-4 mr-2" />
                На главную
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  if (isPasswordRequired) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="h-5 w-5" />
                Защищенная папка
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-gray-600 dark:text-gray-300">
                Эта папка защищена паролем. Введите пароль для доступа.
              </p>
              <div className="space-y-2">
                <Input
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={(e) => e.key === "Enter" && handlePasswordSubmit()}
                  autoFocus
                  aria-label="Введите пароль для доступа к папке"
                />
                <Button onClick={handlePasswordSubmit} className="w-full">
                  Открыть папку
                </Button>
              </div>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      {/* ARIA Live регион для объявлений скрин-ридеру */}
      <div 
        aria-live="polite" 
        aria-atomic="true" 
        className="sr-only"
        role="status"
      >
        {ariaAnnouncement}
      </div>
      <main id="main-content" className="flex-grow bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-6 w-6 text-blue-600" />
                {folderData?.name || "Общая папка"}
              </CardTitle>
              {currentFolderId && (
                <Button variant="outline" onClick={navigateBack} className="flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" />
                  Назад
                </Button>
              )}
            </div>
            <p className="text-gray-600 dark:text-gray-300">
              Нажмите на файл, чтобы скачать его, или на папку, чтобы открыть её. 
              Используйте стрелки вверх/вниз для навигации, Enter или пробел для активации, Backspace для возврата назад.
            </p>
          </CardHeader>
          <CardContent>
            {folderData?.files && folderData.files.length > 0 ? (
              <div 
                className="space-y-2" 
                ref={containerRef}
                onKeyDown={handleKeyDown}
                role="listbox"
                aria-label="Список файлов и папок"
              >
                {folderData.files.map((file, index) => (
                  <div
                    key={file.id}
                    ref={(el) => (itemRefs.current[index] = el)}
                    className={`flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-blue-50 dark:focus:bg-blue-900 ${
                      focusedIndex === index ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900' : ''
                    }`}
                    onClick={() => file.isFolder ? navigateToFolder(file.id) : handleFileDownload(file.id, file.name)}
                    onFocus={() => setFocusedIndex(index)}
                    tabIndex={0}
                    role="option"
                    aria-selected={focusedIndex === index}
                    aria-label={`${file.isFolder ? 'Папка' : 'Файл'}: ${file.name}${!file.isFolder ? `, размер: ${formatFileSize(file.size)}` : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {file.isFolder ? (
                        <Folder className="h-5 w-5 text-blue-600" />
                      ) : (
                        <File className="h-5 w-5 text-gray-600" />
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-gray-100">
                          {file.name}
                        </p>
                        {!file.isFolder && (
                          <p className="text-sm text-gray-500">
                            {formatFileSize(file.size)}
                          </p>
                        )}
                      </div>
                    </div>
                    {!file.isFolder && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleFileDownload(file.id, file.name);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Folder className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">Папка пуста</p>
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
}

export default BrowseFolder;