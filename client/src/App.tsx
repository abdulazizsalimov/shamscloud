import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/providers/ThemeProvider";
import { AccessibilityProvider } from "@/providers/AccessibilityProvider";
import { LocaleProvider } from "@/providers/LocaleProvider";
import { AuthProvider } from "@/providers/AuthProvider";

import NotFound from "@/pages/not-found";
import Home from "@/pages/Home";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Auth from "@/pages/Auth";
import Dashboard from "@/pages/Dashboard";
import Admin from "@/pages/Admin";

// Screen reader announcements element for accessibility
const ScreenReaderAnnounce = () => (
  <div id="sr-announce" className="sr-only" aria-live="polite"></div>
);

// Skip to content link for keyboard users
const SkipToContent = ({ t = (key: string) => key }) => (
  <a 
    href="#main-content" 
    className="skip-link focus:top-0 absolute top-[-40px] left-0 p-2 z-50 bg-primary text-white transition-all"
    aria-label={t("accessibility.skipToContent")}
  >
    {t("accessibility.skipToContent")}
  </a>
);

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/about" component={About} />
      <Route path="/contact" component={Contact} />
      <Route path="/auth" component={Auth} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/admin" component={Admin} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <LocaleProvider>
          <AccessibilityProvider>
            <AuthProvider>
              <TooltipProvider>
                <SkipToContent />
                <ScreenReaderAnnounce />
                <Toaster />
                <Router />
              </TooltipProvider>
            </AuthProvider>
          </AccessibilityProvider>
        </LocaleProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
