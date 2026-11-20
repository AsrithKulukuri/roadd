export type SupportedLanguage = "en" | "te" | "tenglish";

/**
 * Detects whether incoming user text is English, Telugu script, or Tenglish.
 */
export function detectLanguage(text: string): SupportedLanguage {
  if (!text || !text.trim()) return "en";

  // 1. Telugu Script Unicode block (U+0C00 to U+0C7F)
  if (/[\u0C00-\u0C7F]/.test(text)) {
    return "te";
  }

  const norm = text.toLowerCase().trim();

  // 2. Common Tenglish (Romanized Telugu) tokens and suffixes
  const tenglishPatterns = [
    /\b(?:kavali|kaavali|unnaya|unnaaya|unai|unnayi|unnai|chupinchu|chupinchandi|cheppandi|cheppu)\b/i,
    /\b(?:illu|illulu|dharalu|entha|eppudu|ekkada|manchi|pedda|chinna)\b/i,
    /\b(?:lo|ki|kosam|nunchi|varaku|gurinchi)\b/i,
    /\b(?:namaskaram|namasthe|babu|andi)\b/i,
    /\b(?:konali|ammali|rent\s*ki|adige)\b/i,
  ];

  const matchCount = tenglishPatterns.filter((p) => p.test(norm)).length;
  if (matchCount >= 1) {
    return "tenglish";
  }

  return "en";
}

/**
 * Returns localized greeting message based on user's preferred language.
 */
export function getLocalizedGreeting(lang: SupportedLanguage, userName?: string): string {
  const name = userName ? ` ${userName}` : "";

  if (lang === "te") {
    const askName = userName ? "" : "నేను మిమ్మల్ని ఏమని పిలవాలి? (మీ పేరు తెలియజేయండి)\n\n";
    return (
      `👋 *నమస్కారం${name}!* ROADFACING AI Concierge కి స్వాగతం 🏡\n\n` +
      `నేను ఆంధ్రప్రదేశ్ (విజయవాడ, గుంటూరు, అమరావతి, వైజాగ్) లోని వెరిఫైడ్ ప్రాపర్టీలను శోధించడంలో మీకు సహాయపడతాను.\n\n` +
      askName +
      `*ఇలా అడగండి:*\n` +
      `• _"పోరంకి లో 3 BHK ఫ్లాట్లు"_\n` +
      `• _"విజయవాడ లో 1 కోటి లోపు ఫ్లాట్స్"_\n` +
      `• _"గుంటూరు లో విల్లాలు"_\n` +
      `• _"REF0001"_\n` +
      `• _"ఎవరితోనైనా మాట్లాడాలి"_`
    );
  }

  if (lang === "tenglish") {
    const askName = userName ? "" : "Meeru mee peru cheppandi, what may I call you?\n\n";
    return (
      `👋 *Namaskaram${name}!* Welcome to ROADFACING Concierge 🏡\n\n` +
      `Vijayawada, Guntur, Amaravati mariyu Vizag lo verified properties search cheyadaniki nenu meeku 24/7 help chestanu.\n\n` +
      askName +
      `*Try asking:*\n` +
      `• _"Poranki lo 3 BHK flats"_\n` +
      `• _"Flats under 1 Crore in Vijayawada"_\n` +
      `• _"Villas in Guntur"_\n` +
      `• _"REF0001"_\n` +
      `• _"Talk to agent"_`
    );
  }

  const askName = userName ? "" : "What may I call you?\n\n";
  return (
    `👋 *Hi${name}! Welcome to ROADFACING Concierge* 🏡\n\n` +
    `I am your 24/7 personal real estate assistant for Andhra Pradesh. ${askName}` +
    `*Try asking:*\n` +
    `• _"3 bhk flats in Poranki"_\n` +
    `• _"Flats in Vijayawada under 1 Crore"_\n` +
    `• _"Avenue Serene project"_\n` +
    `• _"REF0001"_\n` +
    `• _"Talk to agent"_`
  );
}
