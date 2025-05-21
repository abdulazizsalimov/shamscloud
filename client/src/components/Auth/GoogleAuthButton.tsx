import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FcGoogle } from "react-icons/fc";
import { signInWithGoogle } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { apiRequest } from "@/lib/queryClient";

export function GoogleAuthButton() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { t } = useLocale();
  const { refreshUser } = useAuth();

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      
      // Вход через Google
      const googleUser = await signInWithGoogle();
      
      if (!googleUser) {
        throw new Error(t("auth.google.error"));
      }
      
      // Получаем токен ID пользователя
      const idToken = await googleUser.getIdToken();
      
      // Отправляем токен на сервер для верификации и создания/входа в аккаунт
      await apiRequest("POST", "/api/auth/google", { 
        idToken,
        name: googleUser.displayName,
        email: googleUser.email,
        photoURL: googleUser.photoURL
      });
      
      // Обновляем данные пользователя в контексте
      await refreshUser();
      
      toast({
        title: t("auth.google.success"),
        description: t("auth.google.successMessage"),
      });
    } catch (error) {
      console.error("Ошибка входа через Google:", error);
      toast({
        title: t("auth.google.error"),
        description: error instanceof Error ? error.message : t("auth.google.errorMessage"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant="outline"
      type="button"
      disabled={isLoading}
      className="w-full"
      onClick={handleGoogleSignIn}
    >
      {isLoading ? (
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        <FcGoogle className="mr-2 h-4 w-4" />
      )}
      {t("auth.google.button")}
    </Button>
  );
}