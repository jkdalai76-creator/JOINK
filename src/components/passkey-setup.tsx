"use client";

import * as React from "react";
import { Fingerprint, Trash2 } from "lucide-react";
import { startRegistration } from "@simplewebauthn/browser";
import type { PublicKeyCredentialCreationOptionsJSON } from "@simplewebauthn/browser";
import { api } from "@/lib/client";
import { Alert, Button, Card } from "@/components/ui";

interface Passkey {
  id: string;
  device_label: string | null;
  created_at: string;
  last_used_at: string | null;
}

/** Lets a signed-in user add or remove passkeys for biometric sign-in. */
export function PasskeySetup() {
  const [list, setList] = React.useState<Passkey[] | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [supported, setSupported] = React.useState(false);

  const load = React.useCallback(async () => {
    const res = await api<{ passkeys: Passkey[] }>("/api/auth/passkey");
    if (res.success) setList(res.data.passkeys);
  }, []);

  React.useEffect(() => {
    setSupported(typeof window !== "undefined" && !!window.PublicKeyCredential);
    void load();
  }, [load]);

  if (!supported) return null;

  async function add() {
    setBusy(true);
    setError(null);
    try {
      const opt = await api<PublicKeyCredentialCreationOptionsJSON>(
        "/api/auth/passkey/register/options",
        { method: "POST" },
      );
      if (!opt.success) return setError(opt.error.message);

      let attestation;
      try {
        attestation = await startRegistration({ optionsJSON: opt.data });
      } catch (e) {
        const name = (e as { name?: string })?.name;
        return setError(
          name === "InvalidStateError"
            ? "This device already has a passkey for Joink."
            : "Passkey setup was cancelled.",
        );
      }

      const label = `${navigator.platform || "This device"} · ${new Date().toLocaleDateString()}`;
      const res = await api("/api/auth/passkey/register/verify", {
        method: "POST",
        json: { ...attestation, deviceLabel: label },
      });
      if (!res.success) return setError(res.error.message);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: string) {
    await api("/api/auth/passkey", { method: "DELETE", json: { id } });
    void load();
  }

  return (
    <Card className="space-y-4 p-6">
      <div className="flex items-start gap-3">
        <span className="mt-0.5 inline-flex rounded-lg bg-indigo-100 p-2 text-indigo-700">
          <Fingerprint className="h-5 w-5" aria-hidden />
        </span>
        <div>
          <h2 className="font-semibold text-slate-900">Biometric sign-in (passkeys)</h2>
          <p className="mt-0.5 text-sm text-slate-500">
            Add a passkey to sign in with Face&nbsp;ID, your fingerprint, or Windows Hello — no
            password to type. It stays on this device.
          </p>
        </div>
      </div>

      {error && <Alert tone="error">{error}</Alert>}

      {list && list.length > 0 && (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200">
          {list.map((p) => (
            <li key={p.id} className="flex items-center justify-between px-3 py-2.5 text-sm">
              <span className="text-slate-700">
                {p.device_label || "Passkey"}
                {p.last_used_at && (
                  <span className="ml-2 text-xs text-slate-400">
                    last used {new Date(p.last_used_at).toLocaleDateString()}
                  </span>
                )}
              </span>
              <button
                onClick={() => remove(p.id)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-slate-500 hover:bg-red-50 hover:text-red-600"
                aria-label="Remove passkey"
              >
                <Trash2 className="h-3.5 w-3.5" /> Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      <Button type="button" variant="outline" loading={busy} onClick={add}>
        <Fingerprint className="mr-1.5 h-4 w-4" aria-hidden />
        {list && list.length > 0 ? "Add another passkey" : "Set up biometric sign-in"}
      </Button>
    </Card>
  );
}
