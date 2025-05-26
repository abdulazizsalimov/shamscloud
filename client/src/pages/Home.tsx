import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Shield, Accessibility, Zap, Users } from "lucide-react";
import { EditableContent } from "@/components/EditableContent";
import { usePageContent } from "@/hooks/usePageContent";
import { useState, useEffect } from "react";

export default function Home() {
  const { t } = useLocale();
  const { user } = useAuth();
  const [isEditMode, setIsEditMode] = useState(false);
  

  
  // Применяем сохраненный контент к странице
  usePageContent();

  useEffect(() => {
    // Проверяем параметр edit в URL и права администратора
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit') === 'true';
    
    // Если нет параметра edit, режим редактирования выключен
    if (!editParam) {
      setIsEditMode(false);
      return;
    }
    
    // Проверяем права администратора
    const isAdmin = user?.role === 'admin';
    
    // Режим редактирования доступен только администраторам
    if (user && isAdmin) {
      setIsEditMode(true);
    } else {
      // Если пользователь не админ или не авторизован, убираем параметр из URL
      setIsEditMode(false);
      const url = new URL(window.location.href);
      url.searchParams.delete('edit');
      window.history.replaceState({}, '', url.toString());
    }
  }, [user]);

  const handleSave = () => {
    // Здесь можно сохранить изменения на сервер
    console.log('Saving changes...');
    setIsEditMode(false);
    // Убираем параметр edit из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.toString());
  };

  const handleCancel = () => {
    setIsEditMode(false);
    // Убираем параметр edit из URL
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.toString());
  };
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <EditableContent
        isEditMode={isEditMode}
        onSave={handleSave}
        onCancel={handleCancel}
      >
        <main id="main-content" className="flex-grow">
        {/* Hero Section */}
        <section className="py-16 md:py-24 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center">
              <div className="md:w-1/2 mb-8 md:mb-0">
                <h1 className="text-4xl md:text-5xl font-bold mb-4 text-gray-900 dark:text-white">
                  {t("home.title")}
                </h1>
                <p className="text-xl mb-6 text-gray-600 dark:text-gray-300">
                  {t("home.subtitle")}
                </p>
                <div className="flex flex-col sm:flex-row space-y-3 sm:space-y-0 sm:space-x-4">
                  <Link href="/auth">
                    <Button size="lg" className="btn inline-block px-6 py-3 font-medium text-center">
                      {t("home.startFree")}
                    </Button>
                  </Link>
                  <Link href="/about">
                    <Button variant="outline" size="lg" className="btn inline-block px-6 py-3 font-medium text-center">
                      {t("home.learnMore")}
                    </Button>
                  </Link>
                </div>
              </div>
              
              <div className="md:w-1/2">
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 relative overflow-hidden" aria-hidden="true">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-400 via-purple-500 to-pink-500"></div>
                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center">
                      <div className="h-10 w-10 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 dark:text-blue-300">SC</span>
                      </div>
                      <span className="ml-3 font-semibold">ShamsCloud</span>
                    </div>
                    <div className="flex space-x-1">
                      <div className="h-3 w-3 bg-red-400 rounded-full"></div>
                      <div className="h-3 w-3 bg-yellow-400 rounded-full"></div>
                      <div className="h-3 w-3 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-3 mb-4">
                    <div className="col-span-3 h-12 bg-gray-100 dark:bg-gray-700 rounded flex items-center px-4">
                      <span className="text-gray-500 dark:text-gray-400 text-sm truncate">Documents</span>
                    </div>
                    <div className="h-12 bg-blue-100 dark:bg-blue-900 rounded flex items-center justify-center">
                      <span className="text-blue-600 dark:text-blue-300 text-sm">+</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {["Document1.pdf", "Presentation.pptx", "Spreadsheet.xlsx", "Image.jpg"].map((file, index) => (
                      <div
                        key={index}
                        className="flex items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className={`h-8 w-8 rounded flex items-center justify-center ${
                          index % 4 === 0 ? "bg-red-100 text-red-600 dark:bg-red-900 dark:text-red-300" :
                          index % 4 === 1 ? "bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300" :
                          index % 4 === 2 ? "bg-green-100 text-green-600 dark:bg-green-900 dark:text-green-300" :
                          "bg-purple-100 text-purple-600 dark:bg-purple-900 dark:text-purple-300"
                        }`}>
                          <span>{file.substring(0, 1)}</span>
                        </div>
                        <span className="ml-3 flex-grow truncate">{file}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{(index + 1) * 1.2} MB</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
        
        {/* Features Section */}
        <section className="py-16 bg-white dark:bg-gray-800">
          <div className="container mx-auto px-4">
            <h2 className="text-3xl font-bold text-center mb-12 text-gray-900 dark:text-white">
              {t("home.benefits")}
            </h2>
            
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
              {/* Security Feature */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-600">
                <div className="text-primary mb-4 flex justify-center">
                  <Shield className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">
                  {t("home.security")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("home.securityDesc")}
                </p>
              </div>
              
              {/* Accessibility Feature */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-600">
                <div className="text-primary mb-4 flex justify-center">
                  <Accessibility className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">
                  {t("home.accessibility")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("home.accessibilityDesc")}
                </p>
              </div>
              
              {/* Minimalism Feature */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-600">
                <div className="text-primary mb-4 flex justify-center">
                  <Zap className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">
                  {t("home.minimalism")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("home.minimalismDesc")}
                </p>
              </div>
              
              {/* Support Feature */}
              <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md border border-gray-100 dark:border-gray-600">
                <div className="text-primary mb-4 flex justify-center">
                  <Users className="h-12 w-12" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-center">
                  {t("home.support")}
                </h3>
                <p className="text-gray-600 dark:text-gray-300">
                  {t("home.supportDesc")}
                </p>
              </div>
            </div>
          </div>
        </section>
        </main>
      </EditableContent>
      
      <Footer />
    </div>
  );
}
