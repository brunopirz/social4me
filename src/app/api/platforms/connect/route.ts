import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { generateState, getOAuthUrl } from "@/lib/platforms/oauth";
import type { Platform } from "@/types";

const PLATFORMS: Platform[] = ["instagram", "tiktok", "linkedin", "twitter", "facebook"];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const platform = searchParams.get("platform") as Platform;
  const redirectAfter = searchParams.get("redirect") ?? "/studio/accounts";

  if (!PLATFORMS.includes(platform)) {
    return NextResponse.json({ error: "Plataforma inválida" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const state = generateState();
  const admin = createServiceClient();

  await admin.from("oauth_states").insert({
    user_id: user.id,
    platform,
    state,
    redirect_after: redirectAfter,
  });

  const url = getOAuthUrl(platform, state);
  return NextResponse.json({ data: { url, state } });
}
