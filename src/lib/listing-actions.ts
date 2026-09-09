export const CONTACT_ACTIONS = ["reveal_phone", "whatsapp_click", "callback_request", "brochure_download"] as const;
export type ContactAction = typeof CONTACT_ACTIONS[number];
export const ACTION_LABELS: Record<ContactAction, string> = {
  reveal_phone: "Revealed contact number",
  whatsapp_click: "Clicked WhatsApp",
  callback_request: "Requested a callback",
  brochure_download: "Requested brochure",
};
