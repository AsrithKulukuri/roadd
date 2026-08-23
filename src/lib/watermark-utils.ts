/**
 * Client-Side Watermarking Utility
 * Automatically burns "roadfacing.com" watermark onto uploaded photos (left side in the middle)
 */

export interface WatermarkOptions {
  text?: string;
  position?: "left-middle" | "center" | "bottom-right";
  opacity?: number;
  fontSizeRatio?: number; // ratio of image width, e.g. 0.028
}

/**
 * Loads an image File or Blob into an HTMLImageElement safely
 */
function loadImage(file: File | Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
}

/**
 * Draws the "roadfacing.com" watermark directly onto the image canvas on the left side vertically in the middle.
 * Returns a new File/Blob with the burned-in watermark.
 */
export async function addWatermarkToImage(
  file: File | Blob,
  options: WatermarkOptions = {}
): Promise<File | Blob> {
  if (typeof window === "undefined") return file;

  const {
    text = "roadfacing.com",
    position = "left-middle",
    opacity = 0.85,
    fontSizeRatio = 0.026,
  } = options;

  try {
    const img = await loadImage(file);
    const width = img.naturalWidth || img.width;
    const height = img.naturalHeight || img.height;

    if (!width || !height) return file;

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    // Draw the base image
    ctx.drawImage(img, 0, 0, width, height);

    // Dynamic responsive font sizing based on image dimensions
    const fontSize = Math.max(14, Math.round(width * fontSizeRatio));
    const paddingX = Math.round(fontSize * 0.75);
    const paddingY = Math.round(fontSize * 0.45);
    const borderRadius = Math.round(fontSize * 0.4);

    ctx.save();
    ctx.font = `bold ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;

    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = fontSize;

    const badgeWidth = textWidth + paddingX * 2 + Math.round(fontSize * 0.6); // Extra for amber dot
    const badgeHeight = textHeight + paddingY * 2;

    let posX = 0;
    let posY = 0;

    if (position === "left-middle") {
      // Left side vertically in the middle (per user requirement)
      posX = Math.max(16, Math.round(width * 0.035));
      posY = Math.round(height / 2 - badgeHeight / 2);
    } else if (position === "bottom-right") {
      posX = width - badgeWidth - Math.max(16, Math.round(width * 0.03));
      posY = height - badgeHeight - Math.max(16, Math.round(height * 0.03));
    } else {
      posX = Math.round((width - badgeWidth) / 2);
      posY = Math.round((height - badgeHeight) / 2);
    }

    // 1. Draw subtle frosted background pill
    ctx.fillStyle = `rgba(15, 23, 42, ${0.65 * opacity})`;
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.3 * opacity})`;
    ctx.lineWidth = Math.max(1, Math.round(fontSize * 0.06));

    ctx.beginPath();
    ctx.roundRect(posX, posY, badgeWidth, badgeHeight, borderRadius);
    ctx.fill();
    ctx.stroke();

    // 2. Draw amber indicator dot
    const dotRadius = Math.max(3, Math.round(fontSize * 0.18));
    const dotX = posX + paddingX + dotRadius;
    const dotY = posY + badgeHeight / 2;

    ctx.fillStyle = `rgba(245, 158, 11, ${opacity})`; // Amber #f59e0b
    ctx.beginPath();
    ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Draw text with subtle drop shadow
    ctx.shadowColor = "rgba(0, 0, 0, 0.6)";
    ctx.shadowBlur = Math.round(fontSize * 0.2);
    ctx.shadowOffsetX = 1;
    ctx.shadowOffsetY = 1;

    ctx.fillStyle = `rgba(255, 255, 255, ${opacity})`;
    ctx.textBaseline = "middle";
    ctx.fillText(text, dotX + dotRadius + Math.round(fontSize * 0.4), posY + badgeHeight / 2);

    ctx.restore();

    // Export to Blob
    const mimeType = (file as File).type || "image/jpeg";
    const quality = 0.92;

    const watermarkedBlob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((b) => resolve(b), mimeType, quality);
    });

    if (!watermarkedBlob) return file;

    // Convert back to File if input was a File
    if (file instanceof File) {
      return new File([watermarkedBlob], file.name, {
        type: mimeType,
        lastModified: Date.now(),
      });
    }

    return watermarkedBlob;
  } catch (err) {
    console.warn("[Watermark] Failed to apply watermark, falling back to original:", err);
    return file;
  }
}
