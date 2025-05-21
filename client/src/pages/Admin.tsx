import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useLocale } from "@/providers/LocaleProvider";
import { useAuth } from "@/providers/AuthProvider";
import { Header } from "@/components/Header";
import { UserManagement } from "@/components/Admin/UserManagement";
import { Button } from "@/components/ui/button";
import { 
  Users, Settings, LucideIcon, Home,
  Database, BarChart 
} from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  component: React.ReactNode;
};

export default function Admin() {
  const { t } = useLocale();
  const { user, status, isAdmin } = useAuth();
  const [, navigate] = useLocation();
  const [activeTab, setActiveTab] = useState("users");
  
  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (status === "unauthenticated") {
      navigate("/auth");
    } else if (status === "authenticated" && !isAdmin) {
      navigate("/dashboard");
    }
  }, [status, isAdmin, navigate]);
  
  // Navigation items
  const navItems: NavItem[] = [
    { 
      id: "dashboard", 
      label: t("admin.dashboard"), 
      icon: BarChart,
      component: <div className="p-8 text-center text-gray-500">Dashboard content would go here</div>
    },
    { 
      id: "users", 
      label: t("admin.users"), 
      icon: Users,
      component: <UserManagement />
    },
    { 
      id: "quotas", 
      label: t("admin.quotaManagement"), 
      icon: Database,
      component: <div className="p-8 text-center text-gray-500">Quota management would go here</div>
    },
    { 
      id: "settings", 
      label: t("dashboard.settings"), 
      icon: Settings,
      component: <div className="p-8 text-center text-gray-500">Settings would go here</div>
    }
  ];
  
  // If loading auth status
  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">{t("common.loading")}</p>
      </div>
    );
  }
  
  // If not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-center">You do not have permission to view this page.</p>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main id="main-content" className="flex-grow flex flex-col md:flex-row">
        {/* Sidebar Navigation */}
        <aside className="w-full md:w-64 bg-gray-50 dark:bg-gray-900 p-4 md:min-h-0 md:h-[calc(100vh-4rem)] overflow-auto">
          <nav>
            <ul className="space-y-2">
              {navItems.map((item) => (
                <li key={item.id}>
                  <Button 
                    variant={activeTab === item.id ? "default" : "ghost"}
                    className={`flex items-center w-full justify-start rounded-lg text-left
                      ${activeTab === item.id ? "bg-primary text-white" : ""}
                    `}
                    onClick={() => setActiveTab(item.id)}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    <span>{item.label}</span>
                  </Button>
                </li>
              ))}
              
              <li className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                <Button 
                  variant="ghost"
                  className="flex items-center w-full justify-start rounded-lg text-left"
                  onClick={() => navigate("/dashboard")}
                >
                  <Home className="mr-3 h-5 w-5" />
                  <span>{t("dashboard.myFiles")}</span>
                </Button>
              </li>
            </ul>
          </nav>
        </aside>
        
        {/* Main Content Area */}
        <div className="flex-grow p-6 bg-gray-100 dark:bg-gray-800 overflow-y-auto h-[calc(100vh-4rem)]">
          {navItems.find(item => item.id === activeTab)?.component}
        </div>
      </main>
    </div>
  );
}
