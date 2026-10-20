"use client";

export const SUPPORT_CHAT_REQUEST_EVENT = "fgf:open-support-chat";

export function requestSupportChat() {
  window.dispatchEvent(new Event(SUPPORT_CHAT_REQUEST_EVENT));
}
