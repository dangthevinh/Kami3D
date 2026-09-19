import type { Metadata } from "next";

import { AuthPanel } from "@/components/auth/AuthPanel";
import { DemoAuthNotice } from "@/components/auth/DemoAuthNotice";
import { isClerkEnabled } from "@/lib/env";

export const metadata: Metadata = {
  title: "Create account",
  description: "Create a Kami3D account to save species, track quiz scores and collect badges.",
  robots: { index: false, follow: true },
};

export default function AuthPage() {
  return (
    <div className="section-shell flex min-h-[70vh] items-center justify-center pt-10">
      <div className="w-full max-w-4xl">
        {isClerkEnabled ? <AuthPanel mode="sign-up" /> : <DemoAuthNotice mode="sign-up" />}
      </div>
    </div>
  );
}
