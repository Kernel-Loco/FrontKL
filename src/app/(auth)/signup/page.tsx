import type { Metadata } from "next";
import { AuthPrompt } from "@/components/auth/AuthLinks";
import { AuthTitle } from "@/components/auth/AuthTitle";
import { SignUpForm } from "@/components/auth/forms/SignUpForm";
import { Divider } from "@/components/Divider";
import { SocialButtons } from "@/components/SocialButtons";

export const metadata: Metadata = { title: "Sign Up" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <AuthTitle>Sign Up</AuthTitle>
      <SignUpForm />
      <AuthPrompt text="Already have an account?" linkText="Log In" href="/login" />
      <Divider />
      <SocialButtons />
    </div>
  );
}
