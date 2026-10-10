"use client";

export interface RememberedProfile {
  id?: string;
  phone: string;
  name: string;
  email?: string;
  role: string;
  isProfileComplete: boolean;
  isVerified?: boolean;
  savedAt: number;
}

const STORAGE_PREFIX = "road_remembered_profile_";
const LAST_PHONE_KEY = "road_last_phone";
const ACCOUNTS_INDEX_KEY = "road_remembered_accounts";

/**
 * Normalizes phone numbers to 10 Indian digits for consistent storage keys.
 */
export function normalizePhoneDigits(phone: string): string {
  if (!phone) return "";
  const digits = phone.replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

/**
 * Persists a user's completed profile to device local storage.
 * This survives standard logouts and is ONLY removed when the user explicitly
 * chooses "Delete My Account".
 */
export function saveRememberedProfile(
  phone: string,
  profile: Partial<RememberedProfile> & { name?: string; role?: string; email?: string }
): void {
  if (typeof window === "undefined") return;
  const digits = normalizePhoneDigits(phone);
  if (!digits || digits.length < 10) return;

  try {
    const existing = getRememberedProfile(digits);
    const resolvedName = (profile.name || existing?.name || "").trim();
    const resolvedRole = (profile.role || existing?.role || "buyer").trim();
    const resolvedEmail = (profile.email !== undefined ? profile.email : existing?.email || "").trim();
    const isComplete = Boolean(
      profile.isProfileComplete ||
      (resolvedName.length >= 2 && !resolvedName.toLowerCase().includes("user"))
    );

    const payload: RememberedProfile = {
      id: profile.id || existing?.id,
      phone: phone.startsWith("+91") ? phone : `+91${digits}`,
      name: resolvedName,
      email: resolvedEmail,
      role: resolvedRole,
      isProfileComplete: isComplete,
      isVerified: profile.isVerified ?? existing?.isVerified ?? true,
      savedAt: Date.now(),
    };

    localStorage.setItem(`${STORAGE_PREFIX}${digits}`, JSON.stringify(payload));
    localStorage.setItem(LAST_PHONE_KEY, payload.phone);

    // Keep an index of all remembered phone numbers on this device
    try {
      const rawAccounts = localStorage.getItem(ACCOUNTS_INDEX_KEY);
      const accounts: string[] = rawAccounts ? JSON.parse(rawAccounts) : [];
      if (!accounts.includes(digits)) {
        accounts.push(digits);
        localStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(accounts));
      }
    } catch {}
  } catch (err) {
    console.warn("[UserProfileMemory] Failed to save remembered profile:", err);
  }
}

/**
 * Retrieves a remembered profile by phone number (if saved previously on this device).
 */
export function getRememberedProfile(phone: string): RememberedProfile | null {
  if (typeof window === "undefined") return null;
  const digits = normalizePhoneDigits(phone);
  if (!digits || digits.length < 10) return null;

  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}${digits}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as RememberedProfile;
    if (parsed && parsed.name && parsed.name.trim().length >= 2) {
      return parsed;
    }
  } catch (err) {
    console.warn("[UserProfileMemory] Error reading remembered profile:", err);
  }
  return null;
}

/**
 * Returns the most recent phone number used to log into this device.
 */
export function getLastRememberedPhone(): string {
  if (typeof window === "undefined") return "";
  try {
    return localStorage.getItem(LAST_PHONE_KEY) || "";
  } catch {
    return "";
  }
}

/**
 * Clears remembered profile for a specific phone number.
 */
export function clearRememberedProfile(phone: string): void {
  if (typeof window === "undefined") return;
  const digits = normalizePhoneDigits(phone);
  if (!digits) return;

  try {
    localStorage.removeItem(`${STORAGE_PREFIX}${digits}`);

    const rawAccounts = localStorage.getItem(ACCOUNTS_INDEX_KEY);
    if (rawAccounts) {
      const accounts: string[] = JSON.parse(rawAccounts);
      const filtered = accounts.filter((a) => a !== digits);
      localStorage.setItem(ACCOUNTS_INDEX_KEY, JSON.stringify(filtered));
    }

    if (localStorage.getItem(LAST_PHONE_KEY)?.includes(digits)) {
      localStorage.removeItem(LAST_PHONE_KEY);
    }
  } catch {}
}

/**
 * Completely purges all user data and remembered profiles from local device storage.
 * Called ONLY when the user explicitly triggers "Delete My Account".
 */
export function purgeAllAccountData(): void {
  if (typeof window === "undefined") return;

  try {
    // 1. Clear session keys
    localStorage.removeItem("road_user");
    localStorage.removeItem("road_admin_user");
    localStorage.removeItem(LAST_PHONE_KEY);

    // 2. Clear all remembered profiles and auth tokens from localStorage
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key &&
        (key.startsWith(STORAGE_PREFIX) ||
          key === ACCOUNTS_INDEX_KEY ||
          key.startsWith("sb-") ||
          key.startsWith("supabase") ||
          key.startsWith("road_"))
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => localStorage.removeItem(key));

    // 3. Clear session storage
    try {
      sessionStorage.clear();
    } catch {}

    // 4. Clear all session cookies
    const cookieNames = [
      "road_user",
      "road_auth_token",
      "road_admin_user",
      "road_builder_id",
      "sb-access-token",
      "sb-refresh-token",
    ];
    cookieNames.forEach((name) => {
      document.cookie = `${name}=; Max-Age=0; path=/; SameSite=Lax`;
    });
  } catch (err) {
    console.warn("[UserProfileMemory] Error purging account data:", err);
  }

  window.dispatchEvent(new Event("storage"));
  window.dispatchEvent(new CustomEvent("road_auth_changed"));
}
