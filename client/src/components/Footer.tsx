import { useLocale } from "@/providers/LocaleProvider";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";

export function Footer() {
  const { t } = useLocale();
  
  return (
    <footer className="bg-gray-100 dark:bg-gray-800 py-8">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <Logo size="small" />
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
              {t("footer.copyright")}
            </p>
          </div>
          
          <div className="flex space-x-6">
            <Link href="/about">
              <a className="text-gray-600 dark:text-gray-400 hover:text-primary">
                {t("common.about")}
              </a>
            </Link>
            
            <Link href="/contact">
              <a className="text-gray-600 dark:text-gray-400 hover:text-primary">
                {t("common.contact")}
              </a>
            </Link>
            
            <Link href="/privacy">
              <a className="text-gray-600 dark:text-gray-400 hover:text-primary">
                {t("footer.privacyPolicy")}
              </a>
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
