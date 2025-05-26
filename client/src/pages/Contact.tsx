import { useState, useEffect } from "react";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { usePageContent } from "@/hooks/usePageContent";
import { EditableContent } from "@/components/EditableContent";
import { Mail, Phone, MapPin } from "lucide-react";

export default function Contact() {
  const { t } = useLocale();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isEditMode, setIsEditMode] = useState(false);
  
  // Применяем сохраненный контент к странице
  usePageContent();

  useEffect(() => {
    // Проверяем параметр edit в URL и права администратора
    const urlParams = new URLSearchParams(window.location.search);
    const editParam = urlParams.get('edit') === 'true';
    const isAdmin = user?.role === 'admin';
    
    // Режим редактирования доступен только администраторам
    setIsEditMode(editParam && isAdmin);
    
    // Если пользователь не админ, но пытается редактировать - убираем параметр из URL
    if (editParam && !isAdmin) {
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    message: ""
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.name || !formData.email || !formData.message) {
      toast({
        title: t("common.error"),
        description: "Please fill in all fields",
        variant: "destructive"
      });
      return;
    }
    
    setIsSubmitting(true);
    
    try {
      // Mock form submission
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      toast({
        title: t("common.success"),
        description: "Your message has been sent successfully. We'll get back to you soon."
      });
      
      // Reset form
      setFormData({ name: "", email: "", message: "" });
    } catch (error) {
      toast({
        title: t("common.error"),
        description: "There was a problem sending your message. Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
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
              {t("contact.title")}
            </h1>
            
            <div className="max-w-5xl mx-auto">
              <div className="flex flex-col md:flex-row gap-8">
                {/* Contact Form */}
                <div className="md:w-1/2 bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md">
                  <h2 className="text-xl font-semibold mb-4">
                    {t("contact.writeToUs")}
                  </h2>
                  
                  <form onSubmit={handleSubmit}>
                    <div className="mb-4">
                      <label htmlFor="name" className="block mb-2 text-sm font-medium">
                        {t("contact.name")}
                      </label>
                      <Input 
                        type="text" 
                        id="name" 
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        required 
                        aria-required="true"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="email" className="block mb-2 text-sm font-medium">
                        {t("contact.email")}
                      </label>
                      <Input 
                        type="email" 
                        id="email" 
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        required 
                        aria-required="true"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <div className="mb-4">
                      <label htmlFor="message" className="block mb-2 text-sm font-medium">
                        {t("contact.message")}
                      </label>
                      <Textarea 
                        id="message" 
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        rows={5} 
                        required 
                        aria-required="true"
                        disabled={isSubmitting}
                      />
                    </div>
                    
                    <Button 
                      type="submit" 
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? t("common.loading") : t("contact.send")}
                    </Button>
                  </form>
                </div>
                
                {/* Contact Info */}
                <div className="md:w-1/2">
                  <div className="bg-white dark:bg-gray-700 p-6 rounded-lg shadow-md mb-6">
                    <h2 className="text-xl font-semibold mb-4">
                      {t("contact.contactInfo")}
                    </h2>
                    
                    <div className="space-y-4">
                      <div className="flex items-start">
                        <Mail className="text-primary mr-3 mt-1" />
                        <div>
                          <h3 className="font-medium">Email:</h3>
                          <p className="text-gray-600 dark:text-gray-300">support@shamscloud.com</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <Phone className="text-primary mr-3 mt-1" />
                        <div>
                          <h3 className="font-medium">{t("contact.phone")}</h3>
                          <p className="text-gray-600 dark:text-gray-300">+7 (123) 456-7890</p>
                        </div>
                      </div>
                      
                      <div className="flex items-start">
                        <MapPin className="text-primary mr-3 mt-1" />
                        <div>
                          <h3 className="font-medium">{t("contact.address")}</h3>
                          <p className="text-gray-600 dark:text-gray-300">
                            {t("contact.addressText")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Embedded Map Placeholder */}
                  <div className="bg-gray-200 dark:bg-gray-600 rounded-lg shadow-md h-64 flex items-center justify-center">
                    <p className="text-gray-600 dark:text-gray-300 text-center px-4">
                      {t("contact.mapPlaceholder")}
                    </p>
                  </div>
                </div>
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
