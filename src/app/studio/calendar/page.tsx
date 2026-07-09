"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/types";

interface PostWithTargets extends Post {
  post_targets?: Array<{
    status: string;
    platform_post_id?: string | null;
  }>;
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<PostWithTargets[]>([]);

  useEffect(() => {
    if (!user) return;
    createClient()
      .from("posts")
      .select("*, post_targets(status, platform_post_id)")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "queued", "posted", "failed"])
      .order("scheduled_for", { ascending: true })
      .then(({ data }) => setPosts((data as PostWithTargets[]) ?? []));
  }, [user]);

  const grouped = posts.reduce<Record<string, PostWithTargets[]>>((acc, p) => {
    const key = p.scheduled_for
      ? format(new Date(p.scheduled_for), "yyyy-MM-dd")
      : "sem data";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  const totalPosted = posts.filter((p) => p.status === "posted").length;
  const totalFailed = posts.filter((p) => p.status === "failed").length;
  const totalTargets = posts.reduce((sum, p) => sum + (p.post_targets?.length ?? 0), 0);

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-4xl">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-xl font-bold">Analytics & calendário</h1>
            <p className="text-sm text-zinc-500">Veja o estado dos posts e a evolução da sua fila.</p>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-8">
          <div className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Postados</p>
            <p className="text-2xl font-semibold mt-1">{totalPosted}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Falhas</p>
            <p className="text-2xl font-semibold mt-1">{totalFailed}</p>
          </div>
          <div className="rounded-2xl border border-white/5 bg-zinc-900/70 p-4">
            <p className="text-xs uppercase tracking-wider text-zinc-500">Alvos ativos</p>
            <p className="text-2xl font-semibold mt-1">{totalTargets}</p>
          </div>
        </div>

        {Object.keys(grouped).length === 0 ? (
          <p className="text-zinc-500 text-sm">Nenhum post agendado.</p>
        ) : (
          <div className="space-y-8">
            {Object.entries(grouped).map(([date, dayPosts]) => (
              <section key={date}>
                <h2 className="text-sm font-medium text-violet-400 mb-3">
                  {date === "sem data"
                    ? "Rascunhos / sem data"
                    : format(new Date(date), "EEEE, d 'de' MMMM", { locale: ptBR })}
                </h2>
                <ul className="space-y-2">
                  {dayPosts.map((p) => (
                    <li
                      key={p.id}
                      className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <p className="text-sm truncate">{p.caption || "—"}</p>
                        <p className="text-xs text-zinc-500 mt-1">
                          {p.post_targets?.length ? `${p.post_targets.length} alvos · ${p.post_targets.filter((t) => t.status === "posted").length} publicados` : "Sem alvos"}
                        </p>
                      </div>
                      <span className="text-xs text-zinc-500 shrink-0 capitalize">{p.status}</span>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
    </StudioShell>
  );
}
