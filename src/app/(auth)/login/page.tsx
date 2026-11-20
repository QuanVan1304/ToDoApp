"use client";

import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6">
      <div className="text-center">
        <h1 className="font-serif text-4xl mb-2">Notebook</h1>
        <p className="text-sm text-[var(--ink-muted)]">
          Sổ tay công việc của riêng bạn.
        </p>
      </div>
      <Button variant="accent" onClick={() => signIn("google", { callbackUrl: "/" })}>
        Đăng nhập với Google
      </Button>
    </div>
  );
}
