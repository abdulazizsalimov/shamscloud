import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { LoginForm } from "@/components/Auth/LoginForm";
import { RegisterForm } from "@/components/Auth/RegisterForm";
import { PasswordResetForm } from "@/components/Auth/PasswordResetForm";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type AuthTab = "login" | "register" | "reset";

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
  
  // Show register form
  const showRegister = () => setActiveTab("register");
  
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
      
      <main id="main-content" className="flex-grow flex items-center justify-center py-12 px-4">
        <Card className="max-w-md w-full bg-white shadow-lg">
          <CardContent className="pt-6">
            <div className="mb-6 text-center">
              <h1 className="text-2xl font-bold">{t("auth.welcome")}</h1>
            </div>
            
            {activeTab !== "reset" ? (
              <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as AuthTab)} className="mb-6">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
                  <TabsTrigger value="register">{t("auth.register")}</TabsTrigger>
                </TabsList>
                
                <TabsContent value="login">
                  <LoginForm onShowRegister={showRegister} onShowReset={showReset} />
                </TabsContent>
                
                <TabsContent value="register">
                  <RegisterForm onShowLogin={showLogin} />
                </TabsContent>
              </Tabs>
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
