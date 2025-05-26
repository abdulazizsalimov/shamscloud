import { useState } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { useToast } from "@/hooks/use-toast";
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
import { Copy, Eye, Download, Lock, Globe, Folder, FolderOpen, Archive } from "lucide-react";

interface ShareModalProps {
  file: File | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ShareModal({ file, open, onOpenChange }: ShareModalProps) {
  const { t } = useLocale();
  const { toast } = useToast();
  
  const [shareType, setShareType] = useState<"direct" | "page" | "browse">("browse");
  const [isPasswordProtected, setIsPasswordProtected] = useState(false);
  const [password, setPassword] = useState("");

  // Автоматически отключаем защиту паролем при выборе прямой ссылки
  const handleShareTypeChange = (value: "direct" | "page" | "browse") => {
    setShareType(value);
    if (value === "direct") {
      setIsPasswordProtected(false);
      setPassword("");
    }
  };
  const [shareLink, setShareLink] = useState("");
  const [isPublic, setIsPublic] = useState(false);

  if (!file) return null;

  const handleShare = async () => {
    try {
      const shareData = {
        shareType,
        isPasswordProtected,
        password: isPasswordProtected ? password : null,
      };

      const response = await fetch(`/api/files/${file.id}/share`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(shareData),
      });

      if (!response.ok) {
        throw new Error('Ошибка создания публичной ссылки');
      }

      const data = await response.json();
      console.log("Response data:", data); // Для отладки
      
      // Пробуем разные варианты поля с ссылкой
      const link = data.shareLink || data.shareUrl || data.link || "";
      setShareLink(link);
      setIsPublic(true);
      
      toast({
        title: "Файл опубликован",
        description: `Ссылка создана: ${link}`,
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось создать публичную ссылку",
        variant: "destructive",
      });
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    toast({
      title: "Ссылка скопирована",
      description: "Ссылка скопирована в буфер обмена",
    });
  };

  const handleStopSharing = async () => {
    try {
      const response = await fetch(`/api/files/${file.id}/share`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Ошибка отключения публичного доступа');
      }

      setIsPublic(false);
      setShareLink("");
      
      toast({
        title: "Публичный доступ отключен",
        description: "Файл больше недоступен по ссылке",
      });
    } catch (error) {
      toast({
        title: "Ошибка",
        description: "Не удалось отключить публичный доступ",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {file.isFolder ? <Folder className="h-5 w-5" /> : <Globe className="h-5 w-5" />}
            {file.isFolder ? `Поделиться папкой: ${file.name}` : `Поделиться файлом: ${file.name}`}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!isPublic ? (
            <>
              <div className="space-y-3">
                <Label>Тип ссылки</Label>
                <RadioGroup value={shareType} onValueChange={handleShareTypeChange}>
                  {file.isFolder ? (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="browse" id="browse" />
                        <Label htmlFor="browse" className="flex items-center gap-2">
                          <FolderOpen className="h-4 w-4" />
                          Открыть доступ к папке для просмотра и загрузки (рекомендуется)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="page" id="page" />
                        <Label htmlFor="page" className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Ссылка на страницу просмотра (.zip архив)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="direct" id="direct" />
                        <Label htmlFor="direct" className="flex items-center gap-2">
                          <Archive className="h-4 w-4" />
                          Прямая ссылка на .zip архив
                        </Label>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="page" id="page" />
                        <Label htmlFor="page" className="flex items-center gap-2">
                          <Eye className="h-4 w-4" />
                          Страница просмотра (рекомендуется)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="direct" id="direct" />
                        <Label htmlFor="direct" className="flex items-center gap-2">
                          <Download className="h-4 w-4" />
                          Прямая ссылка на скачивание
                        </Label>
                      </div>
                    </>
                  )}
                </RadioGroup>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="password-protection"
                  checked={isPasswordProtected}
                  onCheckedChange={setIsPasswordProtected}
                  disabled={shareType === "direct"}
                />
                <Label 
                  htmlFor="password-protection" 
                  className={`flex items-center gap-2 ${shareType === "direct" ? "opacity-50 cursor-not-allowed" : ""}`}
                >
                  <Lock className="h-4 w-4" />
                  Защитить паролем
                  {shareType === "direct" && (
                    <span className="text-xs text-muted-foreground ml-1">
                      (недоступно для прямых ссылок)
                    </span>
                  )}
                </Label>
              </div>

              {isPasswordProtected && (
                <div className="space-y-2">
                  <Label htmlFor="password">Пароль</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Введите пароль для доступа"
                  />
                </div>
              )}

              <Button onClick={handleShare} className="w-full">
                <Globe className="h-4 w-4 mr-2" />
                Создать публичную ссылку
              </Button>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Публичная ссылка</Label>
                <div className="flex space-x-2">
                  <Input
                    value={shareLink}
                    readOnly
                    className="flex-1"
                  />
                  <Button onClick={handleCopyLink} size="sm">
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button variant="outline" onClick={handleStopSharing} className="flex-1">
                  Отключить доступ
                </Button>
                <Button onClick={() => onOpenChange(false)} className="flex-1">
                  Готово
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}