import Link from "next/link";
import { ArrowRight, BarChart3, Calendar, Layers, Sparkles } from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-white/5 bg-zinc-950/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold">
            Social <span className="text-violet-400">Distro</span>
          </span>
          <div className="flex gap-3">
            <Link href="/login" className="text-sm text-zinc-400 hover:text-white px-3 py-1.5">
              Entrar
            </Link>
            <Link
              href="/login"
              className="text-sm font-medium bg-violet-600 hover:bg-violet-500 px-4 py-1.5 rounded-lg"
            >
              Começar grátis
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-20">
        <div className="animate-fade-up text-center max-w-3xl mx-auto">
          <p className="text-violet-400 text-sm font-medium mb-4 tracking-wide uppercase">
            Base self-hosted inspirada no Post4me
          </p>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-[1.1]">
            Clone carrosséis virais. Poste em todas as redes.{" "}
            <span className="text-zinc-500">Com seu próprio stack e controle total.</span>
          </h1>
          <p className="text-lg text-zinc-400 mb-10 leading-relaxed">
            O Social Pulse copia o melhor do fluxo do Post4me: cole screenshots de um carrossel que bombou,
            adapte o texto, bake em 9:16 e agende para TikTok, Instagram, LinkedIn, X e Facebook.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-colors"
          >
            Primeiro post em 4 minutos
            <ArrowRight size={18} />
          </Link>
        </div>

        <div className="grid md:grid-cols-2 gap-4 mt-24">
          {[
            {
              icon: Sparkles,
              title: "Clone inteligente",
              desc: "3 ângulos de copy gerados a partir do seu nicho — com IA ou templates locais.",
            },
            {
              icon: Layers,
              title: "Bake 9:16 automático",
              desc: "Texto renderizado na imagem. O TikTok recebe exatamente o que você previewou.",
            },
            {
              icon: Calendar,
              title: "Multi-conta, um fluxo",
              desc: "Uma marca, várias contas. Caption override por rede. Batch semanal.",
            },
            {
              icon: BarChart3,
              title: "Ranking por ângulo",
              desc: "Tagueie clones e veja qual ângulo você mais publicou — base para iterar.",
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="bg-zinc-900/50 border border-white/5 rounded-2xl p-6 hover:border-violet-500/20 transition-colors"
            >
              <Icon className="text-violet-400 mb-3" size={22} />
              <h3 className="font-semibold mb-2">{title}</h3>
              <p className="text-sm text-zinc-500 leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>

        <div className="mt-20 p-8 rounded-2xl border border-violet-500/20 bg-violet-500/5 text-center">
          <h2 className="text-xl font-semibold mb-2">Seu stack, suas regras</h2>
          <p className="text-zinc-400 text-sm max-w-xl mx-auto">
            Next.js + Supabase. Você controla os tokens OAuth, o banco e os custos.
            Em dev, publicação é simulada até configurar as APIs das redes.
          </p>
        </div>
      </main>
    </div>
  );
}
