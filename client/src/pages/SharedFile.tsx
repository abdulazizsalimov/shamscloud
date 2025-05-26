import { useState, useEffect } from "react";
import { useParams } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useToast } from "@/hooks/use-toast";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Download, Lock, FileIcon, Image, FileText, FileSpreadsheet } from "lucide-react";

interface FileInfo {
  id: number;
  name: string;
  type: string;
  size: string;
  isPasswordProtected: boolean;
  shareType: string;
  createdAt: string;
}

export default function SharedFile() {
  const params = useParams();
  const token = (params as any).token;
  const { t } = useLocale();
  const { toast } = useToast();
  
  const [fileInfo, setFileInfo] = useState<FileInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    fetchFileInfo();
  }, [token]);

  const fetchFileInfo = async () => {
    try {
      const response = await fetch(`/api/public/info/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError("Файл не найден или ссылка недействительна");
        } else {
          setError("Ошибка загрузки информации о файле");
        }
        return;
      }

      const data = await response.json();
      setFileInfo(data);
    } catch (error) {
      setError("Ошибка подключения к серверу");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!fileInfo) return;

    if (fileInfo.isPasswordProtected) {
      setShowPasswordDialog(true);
      return;
    }

    downloadFile();
  };

  const downloadFile = async (passwordValue?: string) => {
    if (!fileInfo) return;

    setDownloading(true);
    try {
      const response = await fetch(`/api/public/download/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          password: passwordValue || password,
        }),
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast({
            title: "Неверный пароль",
            description: "Проверьте правильность введенного пароля",
            variant: "destructive",
          });
          return;
        } else {
          throw new Error("Ошибка скачивания файла");
        }
      }

      // Создаем blob из ответа
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      
      // Создаем временную ссылку для скачивания
      const a = document.createElement('a');
      a.href = url;
      a.download = fileInfo.name;
      document.body.appendChild(a);
      a.click();
      
      // Очищаем
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setShowPasswordDialog(false);
      setPassword("");
      
      toast({
        title: "Скачивание началось",
        description: `Файл "${fileInfo.name}" загружается`,
      });
    } catch (error) {
      toast({
        title: "Ошибка скачивания",
        description: "Не удалось скачать файл. Попробуйте позже.",
        variant: "destructive",
      });
    } finally {
      setDownloading(false);
    }
  };

  const getFileIcon = (type: string, name: string) => {
    const extension = name.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'svg':
        return <Image className="text-purple-500 w-16 h-16" />;
      case 'pdf':
        return <FileIcon className="text-red-500 w-16 h-16" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="text-green-500 w-16 h-16" />;
      default:
        return <FileText className="text-blue-500 w-16 h-16" />;
    }
  };

  const formatFileSize = (size: string) => {
    const bytes = parseInt(size);
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-gray-600 dark:text-gray-400">Загрузка...</p>
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
        <main className="flex-grow flex items-center justify-center">
          <div className="text-center max-w-md mx-auto px-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
              <h1 className="text-2xl font-bold text-red-700 dark:text-red-300 mb-2">
                Ошибка доступа
              </h1>
              <p className="text-red-600 dark:text-red-400 mb-4">{error}</p>
              <Button 
                onClick={() => window.location.href = '/'}
                variant="outline"
              >
                На главную
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow flex items-center justify-center py-12">
        <div className="max-w-md mx-auto px-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
            <div className="mb-6">
              {getFileIcon(fileInfo!.type, fileInfo!.name)}
            </div>
            
            <h1 className="text-2xl font-bold mb-2 break-words">
              {fileInfo!.name}
            </h1>
            
            <div className="text-gray-600 dark:text-gray-400 mb-6 space-y-1">
              <p>Размер: {formatFileSize(fileInfo!.size)}</p>
              <p>Дата: {new Date(fileInfo!.createdAt).toLocaleDateString('ru-RU')}</p>
              {fileInfo!.isPasswordProtected && (
                <p className="flex items-center justify-center gap-1 text-amber-600 dark:text-amber-400">
                  <Lock className="w-4 h-4" />
                  Защищено паролем
                </p>
              )}
            </div>
            
            <Button 
              onClick={handleDownload}
              disabled={downloading}
              className="w-full"
              size="lg"
            >
              <Download className="w-5 h-5 mr-2" />
              {downloading ? "Загрузка..." : "Скачать файл"}
            </Button>
            
            <p className="text-xs text-gray-500 dark:text-gray-500 mt-4">
              Предоставлено ShamsCloud
            </p>
          </div>
        </div>
      </main>

      {/* Password Dialog */}
      <Dialog open={showPasswordDialog} onOpenChange={setShowPasswordDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Lock className="w-5 h-5" />
              Введите пароль
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Для скачивания файла "{fileInfo?.name}" требуется пароль.
            </p>
            
            <div className="space-y-2">
              <Label htmlFor="file-password">Пароль:</Label>
              <Input
                id="file-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Введите пароль"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    downloadFile();
                  }
                }}
              />
            </div>
            
            <div className="flex gap-2">
              <Button
                onClick={() => setShowPasswordDialog(false)}
                variant="outline"
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={() => downloadFile()}
                disabled={!password.trim() || downloading}
                className="flex-1"
              >
                {downloading ? "Загрузка..." : "Скачать"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
      
      <Footer />
    </div>
  );
}