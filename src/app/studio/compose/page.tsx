"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { bakeSlide } from "@/lib/canvas/bake-slide";
import type { AspectRatio, ComposeDraft, SocialAccount } from "@/types";
import { ASPECT_PRESETS } from "@/types";

export default function ComposePage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<ComposeDraft | null>(null);
  const [caption, setCaption] = useState("");
  const [aspect, setAspect] = useState<AspectRatio>("9:16");
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [bakedUrls, setBakedUrls] = useState<string[]>([]);
  const [baking, setBaking] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const [scheduledFor, setScheduledFor] = useState("");

  useEffect(() => {
    const raw = sessionStorage.getItem("compose_draft");
    if (raw) {
      const d = JSON.parse(raw) as ComposeDraft;
      setDraft(d);
      setCaption(d.variation.hook);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    createClient()
      .from("social_accounts")
      .select("id, platform, display_name, username, external_id, user_id, brand_id, avatar_url, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => {
        const accs = (data as SocialAccount[]) ?? [];
        setAccounts(accs);
        if (accs.length) setSelectedAccounts([accs[0].id]);
      });
  }, [user]);

  const bakeAll = async () => {
    if (!draft) return;
    setBaking(true);
    try {
      const urls: string[] = [];
      const bg = draft.slideImageUrls[0] ?? "";

      for (let i = 0; i < draft.variation.slideTexts.length; i++) {
        const blob = await bakeSlide({
          backgroundImage: draft.slideImageUrls[i] ?? bg,
          text: draft.variation.slideTexts[i],
          aspectRatio: aspect,
        });
        urls.push(URL.createObjectURL(blob));
      }
      setBakedUrls(urls);
      toast.success(`${urls.length} slides em ${aspect}`);
    } catch (e) {
      toast.error("Erro ao gerar slides");
    } finally {
      setBaking(false);
    }
  };

  const submit = async (publishNow: boolean) => {
    if (!bakedUrls.length || !selectedAccounts.length) {
      toast.error("Bake os slides e selecione contas");
      return;
    }
    setScheduling(true);
    try {
      // Em produção: upload para Supabase Storage e URLs públicas
      const mediaUrls = bakedUrls; // blob URLs funcionam só em dev local

      const res = await fetch("/api/posts/schedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          caption,
          angleTag: draft?.variation.angleLabel,
          accountIds: selectedAccounts,
          mediaUrls,
          publishNow,
          scheduledFor: scheduledFor ? new Date(scheduledFor).toISOString() : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha");
      toast.success(publishNow ? "Publicando..." : "Agendado!");
      sessionStorage.removeItem("compose_draft");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro");
    } finally {
      setScheduling(false);
    }
  };

  if (!draft) {
    return (
      <StudioShell>
        <div className="p-10 text-zinc-500">
          Nenhum rascunho. Comece em{" "}
          <a href="/studio/start" className="text-violet-400 underline">
            Primeiro post
          </a>
          .
        </div>
      </StudioShell>
    );
  }

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-3xl">
        <h1 className="text-xl font-bold mb-6">Compositor</h1>

        <div className="flex gap-2 mb-6">
          {(Object.keys(ASPECT_PRESETS) as AspectRatio[]).map((r) => (
            <button
              key={r}
              onClick={() => setAspect(r)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium ${
                aspect === r ? "bg-violet-500 text-white" : "bg-white/5 text-zinc-400"
              }`}
            >
              {ASPECT_PRESETS[r].label}
            </button>
          ))}
        </div>

        <div className="grid sm:grid-cols-3 gap-3 mb-6">
          {draft.variation.slideTexts.map((text, i) => (
            <div key={i} className="bg-zinc-900 border border-white/5 rounded-xl p-3">
              <span className="text-violet-400 text-xs font-bold">{i + 1}</span>
              <p className="text-sm mt-1 line-clamp-4">{text}</p>
              {bakedUrls[i] && (
                <img src={bakedUrls[i]} alt="" className="mt-2 rounded-lg w-full aspect-[9/16] object-cover" />
              )}
            </div>
          ))}
        </div>

        <button
          onClick={bakeAll}
          disabled={baking}
          className="w-full mb-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-sm font-medium disabled:opacity-50"
        >
          {baking ? "Gerando..." : `Bake slides em ${aspect}`}
        </button>

        <label className="block text-xs text-zinc-500 mb-1">Legenda</label>
        <textarea
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={3}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-3 text-sm mb-4"
        />

        <label className="block text-xs text-zinc-500 mb-2">Contas</label>
        <div className="flex flex-wrap gap-2 mb-6">
          {accounts.map((a) => (
            <button
              key={a.id}
              onClick={() =>
                setSelectedAccounts((s) =>
                  s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]
                )
              }
              className={`text-xs px-3 py-1.5 rounded-full border ${
                selectedAccounts.includes(a.id)
                  ? "border-violet-500 bg-violet-500/20 text-violet-300"
                  : "border-white/10 text-zinc-500"
              }`}
            >
              {a.platform} · {a.display_name ?? a.id.slice(0, 8)}
            </button>
          ))}
        </div>

        <label className="block text-xs text-zinc-500 mb-1">Agendar para (opcional)</label>
        <input
          type="datetime-local"
          value={scheduledFor}
          onChange={(e) => setScheduledFor(e.target.value)}
          className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm mb-6"
        />

        <div className="flex gap-3">
          <button
            onClick={() => submit(true)}
            disabled={scheduling}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
          >
            Publicar agora
          </button>
          <button
            onClick={() => submit(false)}
            disabled={scheduling || !scheduledFor}
            className="flex-1 py-3.5 rounded-xl font-semibold text-sm border border-white/10 hover:bg-white/5 disabled:opacity-50"
          >
            Agendar
          </button>
        </div>
      </div>
    </StudioShell>
  );
}
