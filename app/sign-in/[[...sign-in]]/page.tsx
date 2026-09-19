import type { Metadata } from "next";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { DemoAuthNotice } from "@/components/auth/DemoAuthNotice";
import { isClerkEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Kami3D to sync your favourite species, quiz scores and badges.",
  robots: { index: false, follow: true },
};

export default function AuthPage() {
  return (
    <div className="section-shell flex min-h-[70vh] items-center justify-center pt-10">
      <div className="w-full max-w-4xl">
        {isClerkEnabled ? <AuthPanel mode="sign-in" /> : <DemoAuthNotice mode="sign-in" />}
      </div>
    </div>
  );
}
