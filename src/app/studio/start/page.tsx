"use client";

import { useCallback, useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { StudioShell } from "@/components/studio/studio-shell";
import { useAuth } from "@/components/providers/auth-provider";
import { createClient } from "@/lib/supabase/client";
import { fileToBase64 } from "@/lib/canvas/bake-slide";
import type { CloneCarouselResult, SocialAccount } from "@/types";

const STEPS = [
  { n: 1, label: "Sua marca" },
  { n: 2, label: "Clone viral" },
  { n: 3, label: "Conectar" },
  { n: 4, label: "Publicar" },
];

const DEFAULT_BRAND = {
  name: "",
  category: "produtividade",
  pain_points: "perder tempo postando manualmente",
  key_benefits: "publicar em minutos, não horas",
  cta_text: "Teste grátis",
};

function StartWizard() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [step, setStep] = useState(1);
  const [brand, setBrand] = useState(DEFAULT_BRAND);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const [cloning, setCloning] = useState(false);
  const [cloneResult, setCloneResult] = useState<CloneCarouselResult | null>(null);
  const [chosenVar, setChosenVar] = useState(0);
  const [accounts, setAccounts] = useState<SocialAccount[]>([]);
  const [connecting, setConnecting] = useState(false);

  useEffect(() => {
    const s = Number(searchParams.get("step"));
    if (s >= 1 && s <= 4) setStep(s);
    if (searchParams.get("connected")) toast.success("Conta conectada!");
  }, [searchParams]);

  useEffect(() => {
    if (!user || step < 3) return;
    createClient()
      .from("social_accounts")
      .select("id, platform, display_name, username, external_id, user_id, brand_id, avatar_url, is_active")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .then(({ data }) => {
        setAccounts((data as SocialAccount[]) ?? []);
        if ((data?.length ?? 0) > 0 && step === 3) setStep(4);
      });
  }, [user, step]);

  const onDrop = useCallback((accepted: File[]) => {
    const room = 8 - files.length;
    const added = accepted.slice(0, room);
    setFiles((f) => [...f, ...added]);
    added.forEach((file) => {
      setPreviews((p) => [...p, URL.createObjectURL(file)]);
    });
  }, [files.length]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [] },
    multiple: true,
    disabled: files.length >= 8 || cloning,
  });

  const handleClone = async () => {
    if (!files.length || !user) return;
    setCloning(true);
    try {
      const images = await Promise.all(files.map(fileToBase64));
      const res = await fetch("/api/content/clone-carousel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, brand }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Falha");
      setCloneResult(json.data);
      toast.success("3 ângulos prontos!");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro no clone");
    } finally {
      setCloning(false);
    }
  };

  const connectTikTok = async () => {
    setConnecting(true);
    try {
      const authRes = await fetch(
        `/api/platforms/connect?platform=tiktok&redirect=${encodeURIComponent("/studio/start?step=4&connected=tiktok")}`
      );
      const json = await authRes.json();
      if (!authRes.ok) throw new Error(json.error);
      window.location.href = json.data.url;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao conectar");
      setConnecting(false);
    }
  };

  const variation = cloneResult?.variations[chosenVar];

  const openComposer = () => {
    if (!variation) return;
    sessionStorage.setItem(
      "compose_draft",
      JSON.stringify({
        variation,
        slideLayouts: [],
        slideImageUrls: previews,
        brand,
      })
    );
    router.push("/studio/compose?from=start");
  };

  return (
    <StudioShell>
      <div className="p-6 md:p-10 max-w-2xl">
        <h1 className="text-xl font-bold mb-1">Primeiro post em 4 minutos</h1>
        <p className="text-sm text-zinc-500 mb-8">Clone → adapte → conecte → publique</p>

        <div className="flex gap-2 mb-8">
          {STEPS.map((s) => (
            <div key={s.n} className="flex-1 text-center">
              <div
                className={`w-8 h-8 mx-auto rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                  step > s.n
                    ? "bg-green-500/20 text-green-400"
                    : step === s.n
                      ? "bg-violet-500 text-white"
                      : "bg-white/5 text-zinc-600"
                }`}
              >
                {step > s.n ? "✓" : s.n}
              </div>
              <span className="text-[10px] text-zinc-500">{s.label}</span>
            </div>
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 space-y-4">
              <label className="block text-xs text-zinc-500">Nome do projeto / app</label>
              <input
                value={brand.name}
                onChange={(e) => setBrand((b) => ({ ...b, name: e.target.value }))}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                placeholder="Meu App"
              />
              <label className="block text-xs text-zinc-500">Categoria</label>
              <input
                value={brand.category}
                onChange={(e) => setBrand((b) => ({ ...b, category: e.target.value }))}
                className="w-full bg-zinc-950 border border-white/10 rounded-lg px-3 py-2.5 text-sm"
                placeholder="fintech, fitness..."
              />
            </div>
            <button
              onClick={() => setStep(2)}
              disabled={!brand.name.trim()}
              className="w-full py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40"
            >
              Continuar → clonar carrossel
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer ${
                isDragActive ? "border-violet-500 bg-violet-500/5" : "border-white/10"
              }`}
            >
              <input {...getInputProps()} />
              <p className="text-sm font-medium">
                {files.length >= 8 ? "Máximo 8 slides" : "Arraste screenshots de carrossel viral"}
              </p>
              <p className="text-xs text-zinc-500 mt-1">{files.length} / 8</p>
            </div>

            {previews.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {previews.map((url, i) => (
                  <img key={i} src={url} alt="" className="w-14 h-20 object-cover rounded-lg border border-white/10" />
                ))}
              </div>
            )}

            {!cloneResult && (
              <button
                onClick={handleClone}
                disabled={!files.length || cloning}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-40"
              >
                {cloning ? "Clonando..." : "Clonar este carrossel →"}
              </button>
            )}

            {cloneResult && variation && (
              <div className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {cloneResult.variations.map((v, i) => (
                    <button
                      key={i}
                      onClick={() => setChosenVar(i)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium ${
                        i === chosenVar
                          ? "bg-violet-500 text-white"
                          : "bg-violet-500/10 text-violet-300 border border-violet-500/20"
                      }`}
                    >
                      {v.angleLabel}
                    </button>
                  ))}
                </div>
                <div className="bg-zinc-900 border border-violet-500/20 rounded-2xl p-5">
                  <p className="font-semibold mb-3">{variation.hook}</p>
                  {variation.slideTexts.map((t, i) => (
                    <p key={i} className="text-sm text-zinc-300 mb-2">
                      <span className="text-violet-400 mr-2">{i + 1}.</span>
                      {t}
                    </p>
                  ))}
                </div>
                <button
                  onClick={() => setStep(3)}
                  className="w-full py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500"
                >
                  Usar este ângulo → conectar conta
                </button>
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-white/5 rounded-2xl p-6 text-center">
              <h2 className="font-semibold mb-2">Conecte uma conta social</h2>
              <p className="text-sm text-zinc-500 mb-5">
                Comece com TikTok ou vá em Contas para conectar outras redes.
              </p>
              <button
                onClick={connectTikTok}
                disabled={connecting}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500 disabled:opacity-50"
              >
                {connecting ? "Redirecionando..." : "Conectar TikTok →"}
              </button>
            </div>
            <button onClick={() => setStep(4)} className="w-full py-2 text-sm text-zinc-500">
              Pular por agora →
            </button>
          </div>
        )}

        {step === 4 && variation && (
          <div className="space-y-4">
            <div className="bg-zinc-900 border border-green-500/20 rounded-2xl p-6">
              <p className="text-xs text-green-400 font-semibold uppercase mb-2">✓ Pronto para postar</p>
              <p className="font-semibold mb-3">{variation.hook}</p>
              {accounts.length > 0 && (
                <p className="text-xs text-zinc-400 mb-4">
                  Postando em: {accounts[0].display_name ?? accounts[0].platform}
                </p>
              )}
              <button
                onClick={openComposer}
                className="w-full py-3.5 rounded-xl font-semibold text-sm bg-violet-600 hover:bg-violet-500"
              >
                Abrir no compositor →
              </button>
            </div>
          </div>
        )}
      </div>
    </StudioShell>
  );
}

export default function StartPage() {
  return (
    <Suspense fallback={<div className="p-10">Carregando...</div>}>
      <StartWizard />
    </Suspense>
  );
}
