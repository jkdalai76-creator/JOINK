"use client";

import { useRouter } from "next/navigation";
import * as React from "react";
import { Fingerprint } from "lucide-react";
import { startAuthentication } from "@simplewebauthn/browser";
import type { PublicKeyCredentialRequestOptionsJSON } from "@simplewebauthn/browser";
import { api } from "@/lib/client";
import { Button } from "@/components/ui";

/** "Sign in with a passkey" — Face ID / fingerprint / Windows Hello. */
export function PasskeySignInButton({ onError }: { onError?: (message: string) => void }) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);
  const [supported, setSupported] = React.useState(false);

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
  }, []);

  if (!supported) return null;

  async function signIn() {
    setLoading(true);
    onError?.("");
    try {
      const opt = await api<PublicKeyCredentialRequestOptionsJSON>(
        "/api/auth/passkey/login/options",
        { method: "POST" },
      );
      if (!opt.success) return onError?.(opt.error.message);

      let assertion;
      try {
        assertion = await startAuthentication({ optionsJSON: opt.data });
      } catch (e) {
        const name = (e as { name?: string })?.name;
        return onError?.(
          name === "NotAllowedError"
            ? "Passkey sign-in was cancelled or timed out."
            : "No passkey is available on this device for this site.",
        );
      }

      const res = await api<{ signedIn: boolean }>("/api/auth/passkey/login/verify", {
        method: "POST",
        json: assertion,
      });
      if (!res.success) return onError?.(res.error.message);
      router.push("/dashboard");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="w-full"
      loading={loading}
      onClick={signIn}
    >
      <Fingerprint className="mr-1.5 h-4 w-4" aria-hidden />
      Sign in with a passkey
    </Button>
  );
}
