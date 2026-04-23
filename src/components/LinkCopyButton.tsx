"use client";
import { useState } from "react";

export default function LinkCopyButton({ token, id }: { token: string; id: string }) {
  const [copied, setCopied] = useState(false);

  const url = typeof window !== "undefined" ? `${window.location.origin}/join/${token}` : `/join/${token}`;

  async function copy() {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function revoke() {
    if (!confirm("¿Revocar esta invitación?")) return;
    await fetch(`/api/admin/invitations/${id}`, { method: "DELETE" });
    location.reload();
  }

  return (
    <div className="flex gap-2">
      <button onClick={copy} className="rounded bg-slate-100 px-2 py-1 text-xs hover:bg-slate-200">{copied ? "✓ Copiado" : "Copiar link"}</button>
      <button onClick={revoke} className="rounded text-xs text-red-600 hover:underline">Revocar</button>
    </div>
  );
}
