import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useAccessibility } from "@/providers/AccessibilityProvider";
import { Logo } from "@/components/Logo";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Accessibility, User, LogOut, Globe, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SettingsModal } from "@/components/Admin/SettingsModal";

export function Header() {
  const [location] = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { user, logout, isAdmin } = useAuth();
  const { togglePanel } = useAccessibility();
  const [settingsOpen, setSettingsOpen] = useState(false);
  
  const isActive = (path: string) => location === path;
  
  // Показываем информационные страницы только неавторизованным пользователям
  const navItems = user ? [] : [
    { label: t("common.home"), path: "/" },
    { label: t("common.about"), path: "/about" },
    { label: t("common.contact"), path: "/contact" },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md fixed top-0 left-0 right-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center">
          {/* Logo and Brand */}
          <div className="flex items-center mr-8">
            <Logo />
          </div>
          
          {/* Основное горизонтальное меню навигации */}
          <nav className="flex-1 flex items-center">
            <div className="flex space-x-1 mr-auto">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div 
                    className={`px-3 py-2 rounded-md hover:bg-blue-50 hover:text-primary transition cursor-pointer ${
                      isActive(item.path) ? "bg-blue-100 text-primary font-medium dark:bg-blue-800 dark:text-white" : ""
                    }`}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
              
              {/* Добавляем ссылки для авторизованных пользователей */}
              {user && (
                <>
                  <Link href="/dashboard">
                    <div 
                      className={`px-3 py-2 rounded-md hover:bg-blue-50 hover:text-primary transition cursor-pointer ${
                        isActive("/dashboard") ? "bg-blue-100 text-primary font-medium dark:bg-blue-800 dark:text-white" : ""
                      }`}
                      aria-current={isActive("/dashboard") ? "page" : undefined}
                    >
                      {t("dashboard.myFiles")}
                    </div>
                  </Link>
                  
                  {isAdmin && (
                    <Link href="/admin">
                      <div 
                        className={`px-3 py-2 rounded-md hover:bg-blue-50 hover:text-primary transition cursor-pointer ${
                          isActive("/admin") ? "bg-blue-100 text-primary font-medium dark:bg-blue-800 dark:text-white" : ""
                        }`}
                        aria-current={isActive("/admin") ? "page" : undefined}
                      >
                        {t("admin.users")}
                      </div>
                    </Link>
                  )}
                </>
              )}
            </div>

            {/* Правая группа элементов */}
            <div className="flex items-center space-x-1">
              {/* Переключатель языка */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" aria-label={t("common.language")}>
                    <Globe className="h-5 w-5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>{t("common.selectLanguage")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => setLocale('ru')}
                    className={locale === 'ru' ? "bg-blue-50 dark:bg-blue-800 font-medium dark:text-white" : ""}
                  >
                    Русский
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setLocale('en')}
                    className={locale === 'en' ? "bg-blue-50 dark:bg-blue-800 font-medium dark:text-white" : ""}
                  >
                    English
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              
              {/* Theme Toggle Button */}
              <ThemeToggle />
              
              {/* Accessibility Button */}
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={togglePanel}
                aria-label={t("common.accessibilitySettings")}
              >
                <Accessibility className="h-5 w-5" />
              </Button>
              
              {/* Settings Button (Admin Only) */}
              {isAdmin && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setSettingsOpen(true)}
                  aria-label={t("admin.systemSettings")}
                >
                  <Settings className="h-5 w-5" />
                </Button>
              )}
              
              {/* Кнопка для пользователя */}
              {user ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="relative h-10 w-10 rounded-full">
                      <User className="h-5 w-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>{user.email}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => logout()}>
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>{t("common.logout")}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                <Link href="/auth">
                  <Button size="sm" className="ml-2 px-4">
                    {t("common.login")}
                  </Button>
                </Link>
              )}
            </div>
          </nav>
        </div>
      </div>
      <AccessibilityPanel />
      
      {/* Settings Modal for Admin */}
      <SettingsModal open={settingsOpen} onOpenChange={setSettingsOpen} />
    </header>
  );
}