import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema } from "@shared/schema";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { GoogleAuthButton } from "./GoogleAuthButton";

interface LoginFormProps {
  onShowReset: () => void;
}

type LoginFormValues = z.infer<typeof loginSchema>;

export function LoginForm({ onShowReset }: LoginFormProps) {
  const { login } = useAuth();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setIsLoading(true);
      await login(values.email, values.password);
      // Redirect handled by AuthProvider
    } catch (error) {
      console.error("Login error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.email")}</FormLabel>
              <FormControl>
                <Input 
                  type="email" 
                  placeholder="email@example.com" 
                  {...field} 
                  disabled={isLoading}
                  required
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{t("auth.password")}</FormLabel>
              <FormControl>
                <Input 
                  type="password" 
                  {...field} 
                  disabled={isLoading}
                  required
                  aria-required="true"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Checkbox 
              id="remember-me" 
              checked={rememberMe} 
              onCheckedChange={(checked) => setRememberMe(!!checked)}
            />
            <label 
              htmlFor="remember-me" 
              className="text-sm text-gray-600 dark:text-gray-400"
            >
              {t("auth.rememberMe")}
            </label>
          </div>

          <Button 
            type="button" 
            variant="link" 
            onClick={onShowReset}
            className="p-0 h-auto text-sm text-primary hover:underline"
          >
            {t("auth.forgotPassword")}
          </Button>
        </div>

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? t("common.loading") : t("auth.loginButton")}
        </Button>
        
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <Separator className="w-full" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-background px-2 text-xs text-muted-foreground">
              {t("common.or")}
            </span>
          </div>
        </div>
        
        <GoogleAuthButton />
      </form>
    </Form>
  );
}
