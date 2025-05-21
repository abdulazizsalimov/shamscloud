import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/providers/AuthProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/queryClient";

export default function EmailVerification() {
  const { t } = useLocale();
  const [, setLocation] = useLocation();
  const { refreshUser } = useAuth();

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  // Получаем токен из параметров запроса
  const params = new URLSearchParams(window.location.search);
  const token = params.get("token");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage(t("auth.verification.noToken"));
      return;
    }

    // Отправляем запрос на подтверждение email
    const verifyEmail = async () => {
      try {
        const response = await apiRequest("GET", `/api/auth/verify-email?token=${token}`);
        setStatus("success");
        setMessage(response?.message || t("auth.verification.success"));
        
        // Обновляем информацию о пользователе, если он уже авторизован
        await refreshUser();
      } catch (error) {
        setStatus("error");
        if (error instanceof Error) {
          setMessage(error.message || t("auth.verification.error"));
        } else {
          setMessage(t("auth.verification.error"));
        }
      }
    };

    verifyEmail();
  }, [token, refreshUser, t]);

  const handleContinue = () => {
    setLocation("/dashboard");
  };

  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="container mx-auto py-10 flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>{t("auth.verification.title")}</CardTitle>
          <CardDescription>
            {status === "loading" ? t("auth.verification.processing") : null}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex items-center justify-center p-10">
              <div className="w-8 h-8 border-4 border-t-primary border-r-transparent border-b-transparent border-l-transparent rounded-full animate-spin"></div>
            </div>
          )}

          {status === "success" && (
            <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-md border border-green-200 dark:border-green-800">
              <p className="text-green-800 dark:text-green-200">{message}</p>
            </div>
          )}

          {status === "error" && (
            <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-md border border-red-200 dark:border-red-800">
              <p className="text-red-800 dark:text-red-200">{message}</p>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-end space-x-2">
          {status === "error" && (
            <Button variant="outline" onClick={handleRetry}>
              {t("common.retry")}
            </Button>
          )}
          {status === "success" && (
            <Button onClick={handleContinue}>
              {t("common.continue")}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}