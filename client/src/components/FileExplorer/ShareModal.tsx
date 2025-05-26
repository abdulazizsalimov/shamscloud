import { useState, useEffect } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { File } from "@shared/schema";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Copy, Eye, Download, Lock, Globe } from "lucide-react";

interface ShareModalProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ file, open, onOpenChange }: ShareModalProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [shareType, setShareType] = useState<"direct" | "page">("page");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");
  const [shareUrl, setShareUrl] = useState("");

  if (!file) return null;

  // Проверяем, опубликован ли файл уже
  const isPublic = file.isPublic || false;

  useEffect(() => {
    if (file && file.isPublic) {
      setShareType(file.shareType as "direct" | "page" || "page");
      setIsPasswordProtected(file.isPasswordProtected || false);
      
      // Генерируем URL на основе данных файла
      const baseUrl = window.location.origin;
      if (file.shareType === "direct") {
        setShareUrl(`${baseUrl}/api/public/download/${file.publicToken}`);
      } else {
        setShareUrl(`${baseUrl}/shared/${file.publicToken}`);
      }
    }
  }, [file]);

  // Мутация для создания публичной ссылки
  const shareMutation = useMutation({
    mutationFn: async (shareData: { shareType: string; isPasswordProtected: boolean; password?: string }) => {
      return apiRequest("POST", `/api/files/${file.id}/share`, shareData);
    },
    onSuccess: (data) => {
      setShareUrl(data.shareUrl);
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Файл опубликован",
        description: "Ссылка для публичного доступа создана",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось создать публичную ссылку",
        variant: "destructive",
      });
    }
  });

  // Мутация для отключения публичного доступа
  const unshareMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", `/api/files/${file.id}/share`);
    },
    onSuccess: () => {
      setShareUrl("");
      queryClient.invalidateQueries({ queryKey: ["/api/files"] });
      toast({
        title: "Публичный доступ отключен",
        description: "Файл больше недоступен по ссылке",
      });
    },
    onError: () => {
      toast({
        title: "Ошибка",
        description: "Не удалось отключить публичный доступ",
        variant: "destructive",
      });
    }
  });

  const handleShare = () => {
    shareMutation.mutate({
      shareType,
      isPasswordProtected,
      password: isPasswordProtected ? password : undefined
    });
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка скопирована в буфер обмена",
    });
  };

  const handleStopSharing = () => {
    unshareMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Globe className="w-5 h-5" />
            Поделиться файлом: {file.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!isPublic ? (
            <>
              <div className="space-y-4">
                <Label>Способ публичного доступа:</Label>
                <RadioGroup value={shareType} onValueChange={(value) => setShareType(value as "direct" | "page")}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="direct" id="direct" />
                    <Label htmlFor="direct" className="flex items-center gap-2">
                      <Download className="w-4 h-4" />
                      Прямая ссылка на скачивание
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="page" id="page" />
                    <Label htmlFor="page" className="flex items-center gap-2">
                      <Eye className="w-4 h-4" />
                      Ссылка на страницу загрузки
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {shareType === "page" && (
                <div className="flex items-center justify-between">
                  <Label htmlFor="password-protection" className="flex items-center gap-2">
                    <Lock className="w-4 h-4" />
                    Защитить паролем
                  </Label>
                  <Switch
                    id="password-protection"
                    checked={isPasswordProtected}
                    onCheckedChange={setIsPasswordProtected}
                  />
                </div>
              )}

              {isPasswordProtected && shareType === "page" && (
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль для доступа:</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль"
                  />
                </div>
              )}

              <Button onClick={handleShare} className="w-full">
                Создать публичную ссылку
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                  <p className="text-sm text-green-700 dark:text-green-300 font-medium mb-2">
                    ✅ Файл доступен по публичной ссылке
                  </p>
                  <div className="flex items-center gap-2">
                    <Input
                      value={generateShareLink()}
                      readOnly
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleCopyLink}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Тип доступа:</strong> {shareType === "direct" ? "Прямая ссылка" : "Страница загрузки"}
                  </p>
                  {isPasswordProtected && (
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Защита:</strong> Требуется пароль
                    </p>
                  )}
                </div>

                {shareType === "page" && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label>Защитить паролем</Label>
                      <Switch
                        checked={isPasswordProtected}
                        onCheckedChange={setIsPasswordProtected}
                      />
                    </div>
                    
                    {isPasswordProtected && (
                      <div className="space-y-2">
                        <Label htmlFor="password-change">Изменить пароль:</Label>
                        <Input
                          id="password-change"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Новый пароль"
                        />
                      </div>
                    )}
                  </div>
                )}

                <Button
                  variant="destructive"
                  onClick={handleStopSharing}
                  className="w-full"
                >
                  Закрыть доступ к файлу
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}