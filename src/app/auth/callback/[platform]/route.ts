import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { exchangeCode } from "@/lib/platforms/oauth";
import type { Platform } from "@/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
) {
  const { platform } = await params;
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");

  if (error || !code || !state) {
    return NextResponse.redirect(`${origin}/studio/accounts?error=oauth_denied`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  const admin = createServiceClient();
  const { data: oauthState } = await admin
    .from("oauth_states")
    .select("*")
    .eq("state", state)
    .eq("user_id", user.id)
    .single();

  if (!oauthState || new Date(oauthState.expires_at) < new Date()) {
    return NextResponse.redirect(`${origin}/studio/accounts?error=invalid_state`);
  }

  try {
    const tokens = await exchangeCode(platform as Platform, code);

    await admin.from("social_accounts").upsert(
      {
        user_id: user.id,
        platform: platform as Platform,
        external_id: tokens.externalId,
        display_name: tokens.displayName,
        access_token: tokens.accessToken,
        refresh_token: tokens.refreshToken,
        token_expires_at: tokens.expiresIn
          ? new Date(Date.now() + tokens.expiresIn * 1000).toISOString()
          : null,
        is_active: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id,platform,external_id" }
    );

    await admin.from("oauth_states").delete().eq("id", oauthState.id);

    const redirect = oauthState.redirect_after ?? "/studio/accounts";
    return NextResponse.redirect(`${origin}${redirect}?connected=${platform}`);
  } catch (e) {
    console.error("OAuth callback error:", e);
    return NextResponse.redirect(`${origin}/studio/accounts?error=oauth_failed`);
  }
}
