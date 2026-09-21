export const CONTACT_ACTIONS = ["reveal_phone", "whatsapp_click", "callback_request", "brochure_download", "schedule_visit", "information_request"] as const;
export type ContactAction = typeof CONTACT_ACTIONS[number];
export const ACTION_LABELS: Record<ContactAction, string> = {
  schedule_visit: "Opened site visit scheduling",
  information_request: "Requested listing information",
  reveal_phone: "Revealed contact number",
  whatsapp_click: "Clicked WhatsApp",
  callback_request: "Requested a callback",
  brochure_download: "Requested brochure",
};
