"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import type { Post } from "@/types";

export default function CalendarPage() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<Post[]>([]);

  useEffect(() => {
    if (!user) return;
    createClient()
      .from("posts")
      .select("*")
      .eq("user_id", user.id)
      .in("status", ["scheduled", "queued", "posted", "failed"])
      .order("scheduled_for", { ascending: true })
      .then(({ data }) => setPosts((data as Post[]) ?? []));
  }, [user]);

  const grouped = posts.reduce<Record<string, Post[]>>((acc, p) => {
    const key = p.scheduled_for
      ? format(new Date(p.scheduled_for), "yyyy-MM-dd")
      : "sem data";
    (acc[key] ??= []).push(p);
    return acc;
  }, {});

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-3xl">
        <h1 className="text-xl font-bold mb-6">Calendário</h1>

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
                      className="bg-zinc-900 border border-white/5 rounded-xl px-4 py-3 flex justify-between gap-4"
                    >
                      <span className="text-sm truncate">{p.caption || "—"}</span>
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
