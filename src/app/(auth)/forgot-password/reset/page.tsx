import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { ResetPasswordForm } from "@/components/auth/forms/ResetPasswordForm";

export const metadata: Metadata = { title: "Reset password" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <AuthTitle>Reset Password</AuthTitle>
      <ResetPasswordForm />
    </div>
  );
}
