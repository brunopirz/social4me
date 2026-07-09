import type { AspectRatio } from "@/types";
import { ASPECT_PRESETS } from "@/types";

export interface BakeOptions {
  backgroundImage: string;
  text: string;
  aspectRatio?: AspectRatio;
  textPosition?: { x: number; y: number };
  fontSize?: number;
  textColor?: string;
  backgroundColor?: string;
}

/** Bake texto sobre imagem em canvas (client-side) */
export async function bakeSlide(options: BakeOptions): Promise<Blob> {
  const {
    backgroundImage,
    text,
    aspectRatio = "9:16",
    textPosition = { x: 0.5, y: 0.45 },
    fontSize = 48,
    textColor = "#ffffff",
    backgroundColor = "#0D0D1A",
  } = options;

  const preset = ASPECT_PRESETS[aspectRatio];
  const canvas = document.createElement("canvas");
  canvas.width = preset.width;
  canvas.height = preset.height;
  const ctx = canvas.getContext("2d")!;

  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = await loadImage(backgroundImage);
  const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
  const w = img.width * scale;
  const h = img.height * scale;
  ctx.drawImage(img, (canvas.width - w) / 2, (canvas.height - h) / 2, w, h);

  ctx.fillStyle = "rgba(0,0,0,0.35)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = textColor;
  ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const maxWidth = canvas.width * 0.85;
  const lines = wrapText(ctx, text, maxWidth);
  const lineHeight = fontSize * 1.35;
  const totalHeight = lines.length * lineHeight;
  const startY = canvas.height * textPosition.y - totalHeight / 2;

  lines.forEach((line, i) => {
    ctx.fillText(line, canvas.width * textPosition.x, startY + i * lineHeight);
  });

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Falha ao gerar imagem"));
    }, "image/jpeg", 0.92);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let current = "";

  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      lines.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1] ?? "");
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
