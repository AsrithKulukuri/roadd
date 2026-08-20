/**
 * Universal Haptic Feedback Utility for Mobile Web (Android & iOS)
 * 
 * - Android (Chrome, Brave, Samsung Internet, Firefox): Uses native navigator.vibrate()
 * - iOS (Safari, PWA WebKit): Uses Taptic Engine simulation & WebKit switch haptic triggers
 */

export type HapticType = 
  | "light" 
  | "medium" 
  | "heavy" 
  | "selection" 
  | "success" 
  | "warning" 
  | "error" 
  | "favorite";

const VIBRATION_PATTERNS: Record<HapticType, number | number[]> = {
  selection: 10,
  light: 12,
  medium: 22,
  heavy: 38,
  favorite: [15, 45, 25], // Double heartbeat pulse
  success: [12, 40, 20],  // Confirmation ripple
  warning: [30, 40, 30],
  error: [40, 60, 40, 60, 40],
};

// Hidden input element helper for iOS Safari Taptic feedback emulation
let iosHapticElement: HTMLInputElement | null = null;

function triggerIOSHaptic() {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  
  try {
    // Check if on iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

    if (!isIOS) return;

    if (!iosHapticElement) {
      iosHapticElement = document.createElement("input");
      iosHapticElement.type = "checkbox";
      iosHapticElement.setAttribute("aria-hidden", "true");
      iosHapticElement.style.position = "fixed";
      iosHapticElement.style.top = "-9999px";
      iosHapticElement.style.left = "-9999px";
      iosHapticElement.style.opacity = "0";
      iosHapticElement.style.pointerEvents = "none";
      document.body.appendChild(iosHapticElement);
    }

    // Toggle switch trigger for iOS Taptic micro-click
    iosHapticElement.checked = !iosHapticElement.checked;
  } catch (e) {
    // Silently continue if restricted
  }
}

export function triggerHaptic(type: HapticType = "selection") {
  if (typeof window === "undefined") return;

  // 1. Android / Standard Web Vibrate API
  if ("vibrate" in navigator && typeof navigator.vibrate === "function") {
    try {
      const pattern = VIBRATION_PATTERNS[type] || 10;
      navigator.vibrate(pattern);
    } catch (e) {}
  }

  // 2. iOS Taptic Engine Trigger
  triggerIOSHaptic();
}

// Convenience export object
export const haptic = {
  selection: () => triggerHaptic("selection"),
  light: () => triggerHaptic("light"),
  medium: () => triggerHaptic("medium"),
  heavy: () => triggerHaptic("heavy"),
  favorite: () => triggerHaptic("favorite"),
  success: () => triggerHaptic("success"),
  warning: () => triggerHaptic("warning"),
  error: () => triggerHaptic("error"),
};
