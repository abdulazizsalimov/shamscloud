import { useState } from "react";
import { useAuth } from "@/providers/AuthProvider";
import { useLocale } from "@/providers/LocaleProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { resetPasswordSchema } from "@shared/schema";
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

interface PasswordResetFormProps {
  onShowLogin: () => void;
}

type ResetFormValues = z.infer<typeof resetPasswordSchema>;

export function PasswordResetForm({ onShowLogin }: PasswordResetFormProps) {
  const { resetPassword } = useAuth();
  const { t } = useLocale();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const form = useForm<ResetFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      email: "",
    },
  });

  const onSubmit = async (values: ResetFormValues) => {
    try {
      setIsLoading(true);
      await resetPassword(values.email);
      setIsSuccess(true);
    } catch (error) {
      console.error("Password reset error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">Check your email</h3>
        <p className="mb-6 text-gray-600 dark:text-gray-300">
          If an account exists with this email, we've sent a password reset link.
        </p>
        <Button onClick={onShowLogin}>{t("auth.backToLogin")}</Button>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="text-center mb-6">
          <p className="text-gray-600 dark:text-gray-300">
            Enter your email address and we'll send you a link to reset your password.
          </p>
        </div>
        
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

        <Button 
          type="submit" 
          className="w-full" 
          disabled={isLoading}
        >
          {isLoading ? t("common.loading") : t("auth.resetButton")}
        </Button>

        <div className="text-center mt-4">
          <Button 
            type="button" 
            variant="link" 
            onClick={onShowLogin}
            className="text-sm text-primary hover:underline"
          >
            {t("auth.backToLogin")}
          </Button>
        </div>
      </form>
    </Form>
  );
}
