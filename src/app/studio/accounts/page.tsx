"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Platform, SocialAccount } from "@/types";
import { PLATFORM_LABELS } from "@/types";

const PLATFORMS: Platform[] = ["instagram", "tiktok", "linkedin", "twitter", "facebook"];

function AccountsContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState<Platform | null>(null);

  useEffect(() => {
    const err = searchParams.get("error");
    const connected = searchParams.get("connected");
    if (err) toast.error(`OAuth: ${err}`);
    if (connected) toast.success(`${connected} conectado!`);
  }, [searchParams]);

  const load = () => {
    if (!user) return;
    createClient()
      .from("social_accounts")
      .select("id, platform, display_name, username, external_id, user_id, brand_id, avatar_url, is_active")
      .eq("user_id", user.id)
      .then(({ data }) => setAccounts((data as SocialAccount[]) ?? []));
  };

  useEffect(load, [user]);

  const connect = async (platform: Platform) => {
    setConnecting(platform);
    try {
      const res = await fetch(
        `/api/platforms/connect?platform=${platform}&redirect=${encodeURIComponent("/studio/accounts")}`
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
      setConnecting(null);
    }
  };

  const disconnect = async (id: string) => {
    await createClient().from("social_accounts").update({ is_active: false }).eq("id", id);
    toast.success("Conta desconectada");
    load();
  };

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-2xl">
        <h1 className="text-xl font-bold mb-2">Contas conectadas</h1>
        <p className="text-sm text-zinc-500 mb-8">
          Conecte OAuth de cada rede. Em dev, tokens simulados funcionam para testar o fluxo.
        </p>

        <div className="space-y-3 mb-10">
          {accounts.filter((a) => a.is_active).map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between bg-zinc-900 border border-white/5 rounded-xl px-4 py-3"
            >
              <div>
                <p className="font-medium text-sm">{PLATFORM_LABELS[a.platform]}</p>
                <p className="text-xs text-zinc-500">{a.display_name ?? a.username ?? a.external_id}</p>
              </div>
              <button
                onClick={() => disconnect(a.id)}
                className="text-xs text-red-400 hover:underline"
              >
                Desconectar
              </button>
            </div>
          ))}
          {accounts.filter((a) => a.is_active).length === 0 && (
            <p className="text-zinc-600 text-sm">Nenhuma conta ainda.</p>
          )}
        </div>

        <h2 className="text-sm font-medium text-zinc-400 mb-3">Adicionar conta</h2>
        <div className="grid grid-cols-2 gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => connect(p)}
              disabled={connecting === p}
              className="py-3 rounded-xl border border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 text-sm font-medium disabled:opacity-50"
            >
              {connecting === p ? "..." : PLATFORM_LABELS[p]}
            </button>
          ))}
        </div>
      </div>
    </StudioShell>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={<div className="p-10">...</div>}>
      <AccountsContent />
    </Suspense>
  );
}
