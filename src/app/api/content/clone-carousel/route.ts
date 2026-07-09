import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { cloneCarouselAI } from "@/lib/content/clone-carousel";

const schema = z.object({
  images: z.array(z.string()).min(1).max(8),
  brand: z.object({
    name: z.string().optional(),
    category: z.string().optional(),
    target_audience: z.string().optional(),
    pain_points: z.string().optional(),
    key_benefits: z.string().optional(),
    cta_text: z.string().optional(),
    brand_tone: z.string().optional(),
  }),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const result = await cloneCarouselAI(parsed.data.images, parsed.data.brand);
    return NextResponse.json({ data: result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Falha no clone" },
      { status: 500 }
    );
  }
}
