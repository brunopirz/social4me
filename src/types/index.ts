export type Platform = "instagram" | "tiktok" | "linkedin" | "twitter" | "facebook";

export type PostStatus =
  | "draft"
  | "scheduled"
  | "queued"
  | "posting"
  | "posted"
  | "failed"
  | "cancelled";

export type Plan = "free" | "pro";

export interface Profile {
  id: string;
  email: string | null;
  display_name: string | null;
  avatar_url: string | null;
  plan: Plan;
  posts_used: number;
  posts_limit: number;
}

export interface Brand {
  id: string;
  user_id: string;
  name: string;
  category: string | null;
  target_audience: string | null;
  pain_points: string | null;
  key_benefits: string | null;
  cta_text: string | null;
  brand_tone: string | null;
}

export interface SocialAccount {
  id: string;
  user_id: string;
  brand_id: string | null;
  platform: Platform;
  external_id: string;
  display_name: string | null;
  username: string | null;
  avatar_url: string | null;
  is_active: boolean;
}

export interface Post {
  id: string;
  user_id: string;
  brand_id: string | null;
  caption: string;
  angle_tag: string | null;
  status: PostStatus;
  scheduled_for: string | null;
  published_at: string | null;
  created_at: string;
}

export interface PostMedia {
  id: string;
  post_id: string;
  sort_order: number;
  storage_path: string;
  public_url: string | null;
  aspect_ratio: string;
}

export interface PostTarget {
  id: string;
  post_id: string;
  social_account_id: string;
  caption_override: string | null;
  status: PostStatus;
  platform_post_id: string | null;
}

export interface CarouselVariation {
  angleLabel: string;
  hook: string;
  slideTexts: string[];
}

export interface CloneCarouselResult {
  variations: CarouselVariation[];
  slideImageUrls?: string[];
  slideLayouts?: Array<{ x: number; y: number; scale: number }>;
}

export interface ComposeDraft {
  variation: CarouselVariation;
  slideLayouts: Array<{ x: number; y: number; scale: number }>;
  slideImageUrls: string[];
  brand?: Partial<Brand>;
}

export const PLATFORM_LABELS: Record<Platform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  twitter: "X (Twitter)",
  facebook: "Facebook",
};

export const ASPECT_PRESETS = {
  "9:16": { width: 1080, height: 1920, label: "TikTok / Reels" },
  "1:1": { width: 1080, height: 1080, label: "Quadrado" },
  "4:5": { width: 1080, height: 1350, label: "Instagram Feed" },
} as const;

export type AspectRatio = keyof typeof ASPECT_PRESETS;
