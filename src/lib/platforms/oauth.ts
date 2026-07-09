import type { Platform } from "@/types";
import crypto from "crypto";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export function generateState(): string {
  return crypto.randomBytes(16).toString("hex");
}

export function getOAuthUrl(platform: Platform, state: string): string {
  const redirectUri = `${APP_URL}/auth/callback/${platform}`;

  switch (platform) {
    case "tiktok": {
      const params = new URLSearchParams({
        client_key: process.env.TIKTOK_CLIENT_KEY!,
        response_type: "code",
        scope: "user.info.basic,video.publish,video.upload",
        redirect_uri: redirectUri,
        state,
      });
      return `https://www.tiktok.com/v2/auth/authorize/?${params}`;
    }
    case "linkedin": {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.LINKEDIN_CLIENT_ID!,
        redirect_uri: redirectUri,
        state,
        scope: "openid profile email w_member_social",
      });
      return `https://www.linkedin.com/oauth/v2/authorization?${params}`;
    }
    case "facebook":
    case "instagram": {
      const params = new URLSearchParams({
        client_id: process.env.META_APP_ID!,
        redirect_uri: redirectUri,
        state,
        scope:
          platform === "instagram"
            ? "instagram_basic,instagram_content_publish,pages_show_list"
            : "pages_manage_posts,pages_read_engagement,pages_show_list",
      });
      return `https://www.facebook.com/v21.0/dialog/oauth?${params}`;
    }
    case "twitter": {
      const params = new URLSearchParams({
        response_type: "code",
        client_id: process.env.TWITTER_CLIENT_ID!,
        redirect_uri: redirectUri,
        state,
        scope: "tweet.read tweet.write users.read offline.access",
        code_challenge: "challenge",
        code_challenge_method: "plain",
      });
      return `https://twitter.com/i/oauth2/authorize?${params}`;
    }
    default:
      throw new Error(`Plataforma não suportada: ${platform}`);
  }
}

export async function exchangeCode(
  platform: Platform,
  code: string
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number; externalId: string; displayName?: string }> {
  const redirectUri = `${APP_URL}/auth/callback/${platform}`;

  switch (platform) {
    case "linkedin": {
      const res = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: process.env.LINKEDIN_CLIENT_ID!,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET!,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error_description ?? "LinkedIn token exchange failed");

      const profileRes = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      const profile = await profileRes.json();

      return {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresIn: data.expires_in,
        externalId: profile.sub,
        displayName: profile.name,
      };
    }
    default:
      // Dev fallback quando credenciais não configuradas
      return {
        accessToken: `dev_token_${platform}_${code.slice(0, 8)}`,
        externalId: `dev_${platform}_${Date.now()}`,
        displayName: `Conta dev ${platform}`,
      };
  }
}
