import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { getPublisher } from "@/lib/platforms/publishers";
import { refreshAccessToken } from "@/lib/platforms/oauth";
import type { Platform } from "@/types";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const postId = body.postId as string | undefined;

  const admin = createServiceClient();

  let query = admin
    .from("post_targets")
    .select(`
      id, caption_override, status,
      social_accounts ( id, platform, access_token, metadata ),
      posts ( id, caption, status, scheduled_for )
    `)
    .in("status", ["scheduled", "queued"]);

  if (postId) {
    query = query.eq("post_id", postId);
  }

  const { data: targets, error } = await query.limit(20);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const now = new Date();
  const results: Array<{ targetId: string; ok: boolean; error?: string }> = [];

  for (const target of targets ?? []) {
    const postRaw = target.posts;
    const post = (Array.isArray(postRaw) ? postRaw[0] : postRaw) as {
      id: string;
      caption: string;
      status: string;
      scheduled_for: string | null;
    } | null;
    const accountRaw = target.social_accounts;
    const account = (Array.isArray(accountRaw) ? accountRaw[0] : accountRaw) as {
      id: string;
      platform: Platform;
      access_token: string;
      refresh_token: string | null;
      metadata: Record<string, unknown>;
    };

    if (!post || !account) continue;
    if (post.scheduled_for && new Date(post.scheduled_for) > now && !postId) continue;

    await admin.from("post_targets").update({ status: "posting" }).eq("id", target.id);

    const { data: media } = await admin
      .from("post_media")
      .select("public_url")
      .eq("post_id", post.id)
      .order("sort_order");

    const mediaUrls = (media ?? []).map((m) => m.public_url).filter(Boolean) as string[];

    try {
      let accessToken = account.access_token;
      if (account.refresh_token && account.access_token.startsWith("dev_token_")) {
        const refreshed = await refreshAccessToken(account.platform, account.refresh_token);
        accessToken = refreshed.accessToken;
      }

      const publisher = getPublisher(account.platform);
      const result = await publisher.publish({
        accessToken,
        caption: (target.caption_override as string) || post.caption,
        mediaUrls,
        metadata: account.metadata,
      });

      await admin.from("post_targets").update({
        status: "posted",
        platform_post_id: result.platformPostId,
        published_at: new Date().toISOString(),
      }).eq("id", target.id);

      results.push({ targetId: target.id, ok: true });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Publish failed";
      await admin.from("post_targets").update({
        status: "failed",
        error_message: msg,
      }).eq("id", target.id);
      results.push({ targetId: target.id, ok: false, error: msg });
    }
  }

  // Atualizar status do post pai
  const postIds = [...new Set((targets ?? []).map((t) => {
    const p = Array.isArray(t.posts) ? t.posts[0] : t.posts;
    return (p as { id: string } | null)?.id;
  }).filter(Boolean))] as string[];
  for (const pid of postIds) {
    const { data: allTargets } = await admin
      .from("post_targets")
      .select("status")
      .eq("post_id", pid);

    const statuses = (allTargets ?? []).map((t) => t.status);
    let postStatus = "scheduled";
    if (statuses.every((s) => s === "posted")) postStatus = "posted";
    else if (statuses.some((s) => s === "failed")) postStatus = "failed";
    else if (statuses.some((s) => s === "posting" || s === "queued")) postStatus = "posting";

    await admin.from("posts").update({
      status: postStatus,
      published_at: postStatus === "posted" ? new Date().toISOString() : null,
    }).eq("id", pid);
  }

  return NextResponse.json({ processed: results.length, results });
}
