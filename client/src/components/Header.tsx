import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { useAccessibility } from "@/providers/AccessibilityProvider";
import { Logo } from "@/components/Logo";
import { AccessibilityPanel } from "@/components/AccessibilityPanel";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Accessibility, Menu, User, LogOut, Globe } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function Header() {
  const [location] = useLocation();
  const { t, locale, setLocale } = useLocale();
  const { user, logout, isAdmin } = useAuth();
  const { togglePanel } = useAccessibility();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const isActive = (path: string) => location === path;
  
  const navItems = [
    { label: t("common.home"), path: "/" },
    { label: t("common.about"), path: "/about" },
    { label: t("common.contact"), path: "/contact" },
  ];

  return (
    <header className="bg-white dark:bg-gray-800 shadow-md">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Logo />
          
          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4">
            {navItems.map((item) => (
              <Link key={item.path} href={item.path}>
                <div 
                  className={`px-3 py-2 rounded hover:bg-blue-50 hover:text-primary transition cursor-pointer ${
                    isActive(item.path) ? "bg-blue-100 text-primary" : ""
                  }`}
                  aria-current={isActive(item.path) ? "page" : undefined}
                >
                  {item.label}
                </div>
              </Link>
            ))}
            
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
                  <Link href="/dashboard">
                    <DropdownMenuItem>
                      {t("dashboard.myFiles")}
                    </DropdownMenuItem>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <DropdownMenuItem>
                        {t("admin.dashboard")}
                      </DropdownMenuItem>
                    </Link>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => logout()}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("common.logout")}</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link href="/auth">
                <div
                  className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition cursor-pointer"
                >
                  {t("common.login")}
                </div>
              </Link>
            )}
            
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
                  className={locale === 'ru' ? "bg-blue-50 font-medium" : ""}
                >
                  Русский
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLocale('en')}
                  className={locale === 'en' ? "bg-blue-50 font-medium" : ""}
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
          </nav>
          
          {/* Mobile Navigation Button */}
          <div className="flex items-center space-x-2 md:hidden">
            {/* Мобильный переключатель языка */}
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
                  className={locale === 'ru' ? "bg-blue-50 font-medium" : ""}
                >
                  Русский
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => setLocale('en')}
                  className={locale === 'en' ? "bg-blue-50 font-medium" : ""}
                >
                  English
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            {/* Mobile theme toggle */}
            <ThemeToggle />
            
            {/* Mobile accessibility button */}
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={togglePanel}
              aria-label={t("common.accessibilitySettings")}
            >
              <Accessibility className="h-5 w-5" />
            </Button>
            
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 py-4 border-t border-gray-200 dark:border-gray-700">
            <nav className="flex flex-col space-y-2">
              {navItems.map((item) => (
                <Link key={item.path} href={item.path}>
                  <div 
                    className={`px-3 py-2 rounded hover:bg-blue-50 hover:text-primary transition cursor-pointer ${
                      isActive(item.path) ? "bg-blue-100 text-primary" : ""
                    }`}
                    onClick={() => setIsMobileMenuOpen(false)}
                    aria-current={isActive(item.path) ? "page" : undefined}
                  >
                    {item.label}
                  </div>
                </Link>
              ))}
              
              {user ? (
                <>
                  <Link href="/dashboard">
                    <div 
                      className="px-3 py-2 rounded hover:bg-blue-50 hover:text-primary transition cursor-pointer"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      {t("dashboard.myFiles")}
                    </div>
                  </Link>
                  {isAdmin && (
                    <Link href="/admin">
                      <div 
                        className="px-3 py-2 rounded hover:bg-blue-50 hover:text-primary transition cursor-pointer"
                        onClick={() => setIsMobileMenuOpen(false)}
                      >
                        {t("admin.dashboard")}
                      </div>
                    </Link>
                  )}
                  <button
                    className="px-3 py-2 rounded hover:bg-blue-50 hover:text-primary transition text-left flex items-center"
                    onClick={() => {
                      logout();
                      setIsMobileMenuOpen(false);
                    }}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>{t("common.logout")}</span>
                  </button>
                </>
              ) : (
                <Link href="/auth">
                  <div
                    className="px-4 py-2 bg-primary text-white rounded hover:bg-blue-600 transition block text-center cursor-pointer"
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    {t("common.login")}
                  </div>
                </Link>
              )}
            </nav>
          </div>
        )}
      </div>
      
      <AccessibilityPanel />
    </header>
  );
}
