import { useLocale } from "@/providers/LocaleProvider";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

export default function About() {
  const { t } = useLocale();
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
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
      
      <Footer />
    </div>
  );
}
