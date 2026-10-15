import type { BorderConfig, TypographyConfig, ImageSplitRatio } from "@/types/shelf-builder";
import React from "react";

/**
 * Maps a shadow token to standard CSS box-shadow
 */
export function getShadowValue(shadow?: string): string | undefined {
  if (!shadow || shadow === "none") return undefined;
  switch (shadow) {
    case "sm":
      return "0 1px 2px 0 rgba(0, 0, 0, 0.05)";
    case "md":
      return "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1)";
    case "lg":
      return "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)";
    case "xl":
      return "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)";
    case "2xl":
      return "0 25px 50px -12px rgba(0, 0, 0, 0.25)";
    case "amber-glow":
      return "0 0 25px rgba(245, 166, 35, 0.4), 0 0 6px rgba(245, 166, 35, 0.2)";
    case "inner":
      return "inset 0 2px 4px 0 rgba(0, 0, 0, 0.06)";
    default:
      return undefined;
  }
}

/**
 * Converts BorderConfig into React.CSSProperties
 */
export function borderConfigToStyles(border?: BorderConfig, isHover?: boolean): React.CSSProperties {
  if (!border) return {};
  const styles: React.CSSProperties = {};

  if (border.enabled) {
    const borderColor = isHover && border.hoverColor ? border.hoverColor : border.color;
    const borderWidth = isHover && typeof border.hoverWidth === "number" ? border.hoverWidth : border.width;
    const borderStyle = border.style || "solid";

    // Handle opacity if provided
    let finalColor = borderColor;
    if (typeof border.opacity === "number" && border.opacity < 100 && border.color.startsWith("#")) {
      const alpha = Math.round((border.opacity / 100) * 255)
        .toString(16)
        .padStart(2, "0");
      finalColor = `${borderColor}${alpha}`;
    }

    styles.border = `${borderWidth}px ${borderStyle} ${finalColor}`;
  } else {
    styles.border = "none";
  }

  // Radii
  if (border.linkCorners === false) {
    styles.borderTopLeftRadius = `${border.radiusTopLeft ?? border.radius ?? 0}px`;
    styles.borderTopRightRadius = `${border.radiusTopRight ?? border.radius ?? 0}px`;
    styles.borderBottomLeftRadius = `${border.radiusBottomLeft ?? border.radius ?? 0}px`;
    styles.borderBottomRightRadius = `${border.radiusBottomRight ?? border.radius ?? 0}px`;
  } else if (typeof border.radius === "number") {
    styles.borderRadius = `${border.radius}px`;
  }

  // Outline
  if (border.outlineEnabled && border.outlineWidth) {
    styles.outline = `${border.outlineWidth}px solid ${border.outlineColor || "rgba(245, 166, 35, 0.4)"}`;
    if (typeof border.outlineOffset === "number") {
      styles.outlineOffset = `${border.outlineOffset}px`;
    }
  }

  // Shadow
  const shadowType = isHover && border.hoverShadow ? border.hoverShadow : border.shadow;
  const shadowValue = getShadowValue(shadowType);
  if (shadowValue) {
    styles.boxShadow = shadowValue;
  }

  return styles;
}

/**
 * Converts TypographyConfig into React.CSSProperties
 */
export function typographyConfigToStyles(typo?: TypographyConfig): React.CSSProperties {
  if (!typo) return {};
  const styles: React.CSSProperties = {};

  if (typo.fontFamily) {
    styles.fontFamily = typo.fontFamily;
  }

  if (typeof typo.fontSize === "number") {
    const unit = typo.fontSizeUnit || "px";
    styles.fontSize = `${typo.fontSize}${unit}`;
  }

  if (typo.fontWeight) {
    styles.fontWeight = typo.fontWeight;
  }

  if (typo.fontStyle) {
    styles.fontStyle = typo.fontStyle;
  }

  if (typo.textColor) {
    let color = typo.textColor;
    if (typeof typo.textOpacity === "number" && typo.textOpacity < 100 && color.startsWith("#")) {
      const alpha = Math.round((typo.textOpacity / 100) * 255)
        .toString(16)
        .padStart(2, "0");
      color = `${color}${alpha}`;
    }
    styles.color = color;
  }

  if (typo.textTransform && typo.textTransform !== "none") {
    styles.textTransform = typo.textTransform;
  }

  if (typo.textDecoration && typo.textDecoration !== "none") {
    styles.textDecoration = typo.textDecoration;
  }

  if (typo.textAlign) {
    styles.textAlign = typo.textAlign;
  }

  if (typo.lineHeight !== undefined) {
    styles.lineHeight = typo.lineHeight;
  }

  if (typo.letterSpacing !== undefined) {
    styles.letterSpacing = typeof typo.letterSpacing === "number" ? `${typo.letterSpacing}px` : typo.letterSpacing;
  }

  if (typo.textShadow) {
    switch (typo.textShadow) {
      case "subtle":
        styles.textShadow = "0 1px 2px rgba(0,0,0,0.4)";
        break;
      case "prominent":
        styles.textShadow = "0 2px 4px rgba(0,0,0,0.8), 0 0 10px rgba(0,0,0,0.5)";
        break;
      case "glow":
        styles.textShadow = "0 0 12px rgba(245, 166, 35, 0.7)";
        break;
      default:
        break;
    }
  }

  return styles;
}

/**
 * Convert ImageSplitRatio string into CSS percentage widths
 */
export function getSplitRatioPercentages(ratio?: ImageSplitRatio): [number, number] {
  switch (ratio) {
    case "60/40":
      return [60, 40];
    case "40/60":
      return [40, 60];
    case "70/30":
      return [70, 30];
    case "30/70":
      return [30, 70];
    case "50/50":
    default:
      return [50, 50];
  }
}
