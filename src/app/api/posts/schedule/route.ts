import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const scheduleSchema = z.object({
  caption: z.string(),
  angleTag: z.string().optional(),
  brandId: z.string().uuid().optional(),
  scheduledFor: z.string().datetime().optional(),
  publishNow: z.boolean().optional(),
  accountIds: z.array(z.string().uuid()).min(1),
  mediaUrls: z.array(z.string().url()).min(1),
  captionOverrides: z.record(z.string(), z.string()).optional(),
});

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const body = await request.json();
  const parsed = scheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { caption, angleTag, brandId, scheduledFor, publishNow, accountIds, mediaUrls, captionOverrides } =
    parsed.data;

  const { data: profile } = await supabase
    .from("profiles")
    .select("posts_used, posts_limit")
    .eq("id", user.id)
    .single();

  if (profile && profile.posts_used >= profile.posts_limit) {
    return NextResponse.json({ error: "Limite de posts atingido" }, { status: 403 });
  }

  const status = publishNow ? "queued" : scheduledFor ? "scheduled" : "draft";
  const scheduled_at = publishNow ? new Date().toISOString() : scheduledFor ?? null;

  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      user_id: user.id,
      brand_id: brandId ?? null,
      caption,
      angle_tag: angleTag ?? null,
      status,
      scheduled_for: scheduled_at,
    })
    .select()
    .single();

  if (postError || !post) {
    return NextResponse.json({ error: postError?.message ?? "Erro ao criar post" }, { status: 500 });
  }

  await supabase.from("post_media").insert(
    mediaUrls.map((url, i) => ({
      post_id: post.id,
      sort_order: i,
      storage_path: url,
      public_url: url,
      aspect_ratio: "9:16",
    }))
  );

  await supabase.from("post_targets").insert(
    accountIds.map((accountId) => ({
      post_id: post.id,
      social_account_id: accountId,
      caption_override: captionOverrides?.[accountId] ?? null,
      status: publishNow ? "queued" : status,
    }))
  );

  await supabase
    .from("profiles")
    .update({ posts_used: (profile?.posts_used ?? 0) + 1 })
    .eq("id", user.id);

  if (publishNow) {
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/cron/publish`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.CRON_SECRET}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ postId: post.id }),
    }).catch(console.error);
  }

  return NextResponse.json({ data: post });
}
