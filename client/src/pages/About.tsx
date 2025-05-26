import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { usePageContent } from "@/hooks/usePageContent";
import { EditableContent } from "@/components/EditableContent";
import { useState, useEffect } from "react";

export default function About() {
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
    console.log('Saving changes...');
    setIsEditMode(false);
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, '', url.toString());
  };

  const handleCancel = () => {
    setIsEditMode(false);
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
            <section className="py-12 md:py-16 bg-white dark:bg-gray-800">
              <div className="container mx-auto px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              {t("about.title")}
            </h1>
            
            <div className="max-w-3xl mx-auto">
              <div className="prose dark:prose-invert prose-lg mx-auto">
                <p className="mb-4">
                  {t("about.intro")}
                </p>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">
                  {t("about.mission")}
                </h2>
                <p className="mb-4">
                  {t("about.missionText")}
                </p>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">
                  {t("about.team")}
                </h2>
                <p className="mb-4">
                  {t("about.teamText")}
                </p>
                
                <h2 className="text-2xl font-semibold mt-8 mb-4">
                  {t("about.standards")}
                </h2>
                <p className="mb-4">
                  {t("about.standardsText")}
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
