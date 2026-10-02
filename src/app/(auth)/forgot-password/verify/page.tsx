import type { Metadata } from "next";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { VerifyResetCodeForm } from "@/components/auth/forms/VerifyResetCodeForm";

export const metadata: Metadata = { title: "Check your email" };

export default function VerifyResetCodePage() {
  return (
    <div className="space-y-6">
      <AuthTitle>Forgot Password</AuthTitle>
      <VerifyResetCodeForm />
    </div>
  );
}
