import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ForgotPasswordForm } from "@/components/auth/forms/ForgotPasswordForm";

export const metadata: Metadata = { title: "Forgot password" };

export default function ForgotPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle>Forgot Password</AuthTitle>
      <ForgotPasswordForm />
    </div>
  );
}
