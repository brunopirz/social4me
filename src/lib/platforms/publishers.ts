import type { Platform } from "@/types";

export interface PublishPayload {
  accessToken: string;
  caption: string;
  mediaUrls: string[];
  metadata?: Record<string, unknown>;
}

export interface PublishResult {
  platformPostId: string;
  raw?: unknown;
}

export interface PlatformPublisher {
  publish(payload: PublishPayload): Promise<PublishResult>;
}

/** Stub para desenvolvimento — simula publicação */
export class DevPublisher implements PlatformPublisher {
  constructor(private platform: Platform) {}

  async publish(payload: PublishPayload): Promise<PublishResult> {
    await new Promise((r) => setTimeout(r, 800));
    return {
      platformPostId: `dev_${this.platform}_${Date.now()}`,
      raw: { simulated: true, caption: payload.caption.slice(0, 50) },
    };
  }
}

export function getPublisher(platform: Platform): PlatformPublisher {
  const hasCreds = checkPlatformCreds(platform);
  if (!hasCreds || process.env.NODE_ENV === "development") {
    return new DevPublisher(platform);
  }

  switch (platform) {
    case "tiktok":
      return new TikTokPublisher();
    case "linkedin":
      return new LinkedInPublisher();
    case "facebook":
    case "instagram":
      return new MetaPublisher(platform);
    case "twitter":
      return new TwitterPublisher();
    default:
      return new DevPublisher(platform);
  }
}

function checkPlatformCreds(platform: Platform): boolean {
  switch (platform) {
    case "tiktok":
      return !!(process.env.TIKTOK_CLIENT_KEY && process.env.TIKTOK_CLIENT_SECRET);
    case "linkedin":
      return !!(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);
    case "facebook":
    case "instagram":
      return !!(process.env.META_APP_ID && process.env.META_APP_SECRET);
    case "twitter":
      return !!(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
    default:
      return false;
  }
}

class TikTokPublisher implements PlatformPublisher {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    const res = await fetch("https://open.tiktokapis.com/v2/post/publish/content/init/", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        post_info: { title: payload.caption, privacy_level: "PUBLIC_TO_EVERYONE" },
        source_info: { source: "PULL_FROM_URL", photo_images: payload.mediaUrls },
        post_mode: "DIRECT_POST",
        media_type: "PHOTO",
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "TikTok publish failed");
    return { platformPostId: data.data?.publish_id ?? "", raw: data };
  }
}

class LinkedInPublisher implements PlatformPublisher {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    // UGC Post com imagem — requer upload em 2 etapas na API real
    const res = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: payload.metadata?.authorUrn,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text: payload.caption },
            shareMediaCategory: "IMAGE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message ?? "LinkedIn publish failed");
    return { platformPostId: data.id ?? "", raw: data };
  }
}

class MetaPublisher implements PlatformPublisher {
  constructor(private platform: "facebook" | "instagram") {}

  async publish(payload: PublishPayload): Promise<PublishResult> {
    const pageId = payload.metadata?.pageId as string;
    const endpoint =
      this.platform === "instagram"
        ? `https://graph.facebook.com/v21.0/${pageId}/media`
        : `https://graph.facebook.com/v21.0/${pageId}/photos`;

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        access_token: payload.accessToken,
        caption: payload.caption,
        url: payload.mediaUrls[0],
        ...(this.platform === "instagram" && { media_type: "IMAGE" }),
      }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error?.message ?? "Meta publish failed");
    return { platformPostId: data.id ?? data.post_id ?? "", raw: data };
  }
}

class TwitterPublisher implements PlatformPublisher {
  async publish(payload: PublishPayload): Promise<PublishResult> {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${payload.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: payload.caption }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail ?? "Twitter publish failed");
    return { platformPostId: data.data?.id ?? "", raw: data };
  }
}
