export function normalizeWhatsAppPhone(value: string): string | null {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 10) digits = `91${digits}`;
  if (digits.length < 10 || digits.length > 15 || /^0+$/.test(digits)) return null;
  return digits;
}

export function maskWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length < 7) return "***";
  return `+${digits.slice(0, 2)} ${digits.slice(2, 6)}***${digits.slice(-3)}`;
}

export function withWhatsAppOptOut(message: string): string {
  const clean = message.trim();
  if (/reply\s+['\"]?stop['\"]?\s+to\s+unsubscribe/i.test(clean)) return clean;
  return `${clean}\n\nReply STOP to unsubscribe.`;
}

export function readImageUrl(item: Record<string, unknown>): string {
  const cover = item.coverImage;
  if (typeof cover === "string" && cover.trim()) return cover.trim();
  const snakeCover = item.cover_image;
  if (typeof snakeCover === "string" && snakeCover.trim()) return snakeCover.trim();
  const desktop = item.image_url;
  if (typeof desktop === "string" && desktop.trim()) return desktop.trim();

  if (Array.isArray(item.images)) {
    for (const image of item.images) {
      if (typeof image === "string" && image.trim()) return image.trim();
      if (image && typeof image === "object") {
        const url = (image as Record<string, unknown>).url;
        if (typeof url === "string" && url.trim()) return url.trim();
      }
    }
  }
  return "";
}

export function toPublicMediaUrl(value: string): string {
  const clean = value.trim();
  if (!clean) return "";
  if (/^https:\/\//i.test(clean)) return clean;
  const siteUrl = (
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    ""
  ).replace(/\/$/, "");
  if (!siteUrl) return "";
  return `${siteUrl}${clean.startsWith("/") ? "" : "/"}${clean}`;
}

export function isTrustedCustomMediaUrl(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;

    const trustedHosts = [
      process.env.NEXT_PUBLIC_SITE_URL,
      process.env.NEXT_PUBLIC_APP_URL,
      process.env.NEXT_PUBLIC_SUPABASE_URL,
      process.env.AWS_CLOUDFRONT_URL,
      process.env.AWS_S3_PUBLIC_URL,
    ]
      .filter(Boolean)
      .map((candidate) => {
        try {
          return new URL(candidate as string).hostname;
        } catch {
          return "";
        }
      })
      .filter(Boolean);

    return (
      trustedHosts.includes(url.hostname) ||
      url.hostname.endsWith(".amazonaws.com") ||
      url.hostname.endsWith(".cloudfront.net")
    );
  } catch {
    return false;
  }
}
