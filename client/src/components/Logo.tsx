import { useLocale } from "@/providers/LocaleProvider";
import { Cloud } from "lucide-react";
import { Link } from "wouter";

interface LogoProps {
  size?: "small" | "medium" | "large";
}

export function Logo({ size = "medium" }: LogoProps) {
  const { t } = useLocale();
  
  const sizeClasses = {
    small: "text-lg",
    medium: "text-2xl",
    large: "text-4xl"
  };
  
  const iconSizes = {
    small: 16,
    medium: 24,
    large: 32
  };
  
  return (
    <Link href="/">
      <a className={`font-bold text-primary flex items-center ${sizeClasses[size]}`}>
        <Cloud className="mr-2" size={iconSizes[size]} />
        <span>{t("common.appName")}</span>
      </a>
    </Link>
  );
}
