import { useState, useEffect } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/providers/LocaleProvider";

export function ThemeToggle() {
  const { t } = useLocale();
  const [theme, setTheme] = useState<string>("light");
  const [mounted, setMounted] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  // Effect to initialize theme
  useEffect(() => {
    // Check if user has saved theme preference
    const savedTheme = localStorage.getItem("theme");
    
    // Set theme based on localStorage or system preference
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setTheme("dark");
      document.documentElement.classList.add("dark");
    }
    
    setMounted(true);
  }, []);

  // Handle theme toggle
  const toggleTheme = () => {
    setIsAnimating(true);
    const newTheme = theme === "dark" ? "light" : "dark";
    
    // Update state and localStorage
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    
    // Toggle dark class on document
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    
    // Reset animation after completion
    setTimeout(() => setIsAnimating(false), 600);
  };

  // Avoid hydration mismatch
  if (!mounted) return null;

  const isDark = theme === "dark";
  const label = isDark ? t("accessibility.light") : t("accessibility.dark");
  
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="relative"
      title={label}
      aria-label={label}
    >
      <div className={`transform transition-transform duration-500 ${isAnimating ? (isDark ? 'rotate-[360deg]' : '-rotate-[360deg]') : ''}`}>
        {isDark ? (
          <Sun size={20} className="text-yellow-400" />
        ) : (
          <Moon size={20} className="text-primary" />
        )}
      </div>
    </Button>
  );
}