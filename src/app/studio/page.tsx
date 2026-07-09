"use client";

import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Post, SocialAccount } from "@/types";
import { PLATFORM_LABELS } from "@/types";
import { ArrowRight, Plus } from "lucide-react";

export default function StudioDashboard() {
  const { user, profile } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);

  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    supabase
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => setPosts((data as Post[]) ?? []));

    supabase
      .from("social_accounts")
      .select("id, user_id, brand_id, platform, external_id, display_name, username, avatar_url, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => setAccounts((data as SocialAccount[]) ?? []));
  }, [user]);

  const postsLeft = (profile?.posts_limit ?? 50) - (profile?.posts_used ?? 0);

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-4xl">
        <h1 className="text-2xl font-bold mb-1">Studio</h1>
        <p className="text-zinc-500 text-sm mb-8">
          {postsLeft} posts restantes no plano {profile?.plan ?? "free"}
        </p>

        <div className="grid sm:grid-cols-2 gap-4 mb-10">
          <Link
            href="/studio/start"
            className="group bg-gradient-to-br from-violet-600/20 to-violet-900/20 border border-violet-500/30 rounded-2xl p-6 hover:border-violet-400/50 transition-colors"
          >
            <Plus className="text-violet-400 mb-3" size={24} />
            <h2 className="font-semibold mb-1">Primeiro post em 4 min</h2>
            <p className="text-sm text-zinc-500">Wizard guiado: marca → clone → conectar → publicar</p>
            <ArrowRight className="mt-4 text-violet-400 group-hover:translate-x-1 transition-transform" size={18} />
          </Link>
          <Link
            href="/studio/compose"
            className="bg-zinc-900 border border-white/5 rounded-2xl p-6 hover:border-white/10 transition-colors"
          >
            <h2 className="font-semibold mb-1">Compositor</h2>
            <p className="text-sm text-zinc-500">Criar carrossel, bake 9:16 e agendar</p>
          </Link>
        </div>

        <section className="mb-10">
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Contas conectadas ({accounts.length})
          </h2>
          {accounts.length === 0 ? (
            <Link href="/studio/accounts" className="text-violet-400 text-sm hover:underline">
              Conectar primeira conta →
            </Link>
          ) : (
            <div className="flex flex-wrap gap-2">
              {accounts.map((a) => (
                <span
                  key={a.id}
                  className="text-xs px-3 py-1.5 rounded-full border border-white/10 bg-white/5"
                >
                  {PLATFORM_LABELS[a.platform]} · {a.display_name ?? a.username ?? a.external_id}
                </span>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
            Posts recentes
          </h2>
          {posts.length === 0 ? (
            <p className="text-zinc-600 text-sm">Nenhum post ainda.</p>
          ) : (
            <ul className="space-y-2">
              {posts.map((p) => (
                <li
                  key={p.id}
                  className="flex items-center justify-between bg-zinc-900/50 border border-white/5 rounded-xl px-4 py-3 text-sm"
                >
                  <span className="truncate flex-1 mr-4">{p.caption || "(sem legenda)"}</span>
                  <span className="text-xs text-zinc-500 capitalize">{p.status}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </StudioShell>
  );
}
