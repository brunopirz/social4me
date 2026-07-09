import type { Brand, CloneCarouselResult } from "@/types";

/** Clone local (sem IA) — gera 3 variações a partir do contexto da marca */
export function cloneCarouselLocal(
  brand: Partial<Brand>,
  slideCount: number
): CloneCarouselResult {
  const name = brand.name ?? "seu produto";
  const category = brand.category ?? "produtividade";
  const pain = brand.pain_points ?? "perder tempo com tarefas repetitivas";
  const benefit = brand.key_benefits ?? "ganhar horas na semana";
  const cta = brand.cta_text ?? "Teste grátis";

  const templates = [
    {
      angleLabel: "Dor → solução",
      hook: `Você ainda sofre com ${pain}?`,
      slideTexts: [
        `O problema: ${pain}`,
        `A maioria tenta resolver com planilhas e lembretes`,
        `${name} automatiza isso em minutos`,
        `Resultado: ${benefit}`,
        cta,
      ],
    },
    {
      angleLabel: "Prova social",
      hook: `Por que times de ${category} estão migrando para ${name}`,
      slideTexts: [
        `Antes: processos manuais e posts esquecidos`,
        `Depois: fluxo único, tudo agendado`,
        `${benefit}`,
        `Setup em menos de 5 minutos`,
        cta,
      ],
    },
    {
      angleLabel: "Lista rápida",
      hook: `3 coisas que ${name} faz por você`,
      slideTexts: [
        `1. Planeja a semana inteira de posts`,
        `2. Adapta formato para cada rede`,
        `3. Mostra o que funcionou`,
        `Ideal para quem odeia distribuição`,
        cta,
      ],
    },
  ];

  return {
    variations: templates.map((t) => ({
      ...t,
      slideTexts: t.slideTexts.slice(0, Math.max(slideCount, 3)),
    })),
  };
}

/** Clone com OpenAI (quando OPENAI_API_KEY configurada) */
export async function cloneCarouselAI(
  imagesBase64: string[],
  brand: Partial<Brand>
): Promise<CloneCarouselResult> {
  if (!process.env.OPENAI_API_KEY) {
    return cloneCarouselLocal(brand, imagesBase64.length);
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você adapta carrosséis virais para a marca do usuário. Responda JSON: { variations: [{ angleLabel, hook, slideTexts: string[] }] } com 3 variações em pt-BR.",
        },
        {
          role: "user",
          content: `Marca: ${JSON.stringify(brand)}. Slides de referência: ${imagesBase64.length} imagens.`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "IA falhou");

  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed as CloneCarouselResult;
}

export async function generateCaptionVariants(
  currentCaption: string,
  brand?: Partial<Brand>
): Promise<string[]> {
  if (!process.env.OPENAI_API_KEY) {
    const name = brand?.name ?? "seu produto";
    const category = brand?.category ?? "produtividade";
    const cta = brand?.cta_text ?? "Teste grátis";
    const base = currentCaption || `Como ${name} ajuda times de ${category} a ganhar tempo.`;
    return [
      `${base} ${cta}`,
      `${base} de forma simples e prática.`,
      `A melhor forma de transformar ${category} em execução real com ${name}.`,
    ];
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Você gera 3 variações de legenda para posts de marketing em pt-BR. Responda JSON: { suggestions: string[] }.",
        },
        {
          role: "user",
          content: `Marca: ${JSON.stringify(brand ?? {})}. Legenda atual: ${currentCaption}`,
        },
      ],
    }),
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message ?? "Falha ao gerar legendas");

  const parsed = JSON.parse(data.choices[0].message.content);
  return parsed.suggestions as string[];
}
