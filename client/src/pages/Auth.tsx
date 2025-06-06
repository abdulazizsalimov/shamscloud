import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/Auth/LoginForm";
import { PasswordResetForm } from "@/components/Auth/PasswordResetForm";
import { Card, CardContent } from "@/components/ui/card";

type AuthTab = "login" | "reset";

export default function Auth() {
  const { t } = useLocale();
  const { status } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState<AuthTab>("login");
  
  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (status === "authenticated") {
      navigate("/dashboard");
    }
  }, [status, navigate]);
  
  // Show login form by default
  const showLogin = () => setActiveTab("login");
  
  // Show password reset form
  const showReset = () => setActiveTab("reset");
  
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
      
      <main id="main-content" className="flex-grow flex items-center justify-center py-12 px-4 bg-gray-50 dark:bg-gray-900">
        <Card className="max-w-md w-full shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">{t("auth.welcome")}</h1>
            </div>
            
            {activeTab === "login" ? (
              <LoginForm onShowReset={showReset} />
            ) : (
              <PasswordResetForm onShowLogin={showLogin} />
            )}
          </CardContent>
        </Card>
      </main>
      
      <Footer />
    </div>
  );
}
