"use client";

import { MessageCircle, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  requestSupportChat,
  SUPPORT_CHAT_REQUEST_EVENT,
} from "@/lib/support-chat";

type TawkApi = {
  onLoad?: () => void;
  maximize?: () => void;
  showWidget?: () => void;
};

declare global {
  interface Window {
    Tawk_API?: TawkApi;
    Tawk_LoadStart?: Date;
  }
}

const TawkChat = () => {
  const [showFallback, setShowFallback] = useState(false);
  const pendingOpen = useRef(false);
  const openTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

  const openWidget = useCallback(() => {
    const tawk = window.Tawk_API;
    if (tawk?.maximize) {
      tawk.maximize();
      return true;
    }
    if (tawk?.showWidget) {
      tawk.showWidget();
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    if (!propertyId || !widgetId) return;

    const tawk = (window.Tawk_API = window.Tawk_API || {});
    tawk.onLoad = () => {
      if (pendingOpen.current && openWidget()) {
        pendingOpen.current = false;
        if (openTimeout.current) clearTimeout(openTimeout.current);
        setShowFallback(false);
      }
    };

    if (!document.getElementById("tawk-to-widget")) {
      window.Tawk_LoadStart = new Date();
      const script = document.createElement("script");
      script.id = "tawk-to-widget";
      script.async = true;
      script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
      script.crossOrigin = "anonymous";
      script.onerror = () => {
        if (pendingOpen.current) {
          pendingOpen.current = false;
          setShowFallback(true);
        }
      };
      document.body.appendChild(script);
    }

    return () => {
      tawk.onLoad = undefined;
    };
  }, [openWidget, propertyId, widgetId]);

  useEffect(() => {
    const handleOpenRequest = () => {
      if (!propertyId || !widgetId) {
        setShowFallback(true);
        return;
      }

      pendingOpen.current = true;
      if (openWidget()) {
        pendingOpen.current = false;
        setShowFallback(false);
        return;
      }

      if (openTimeout.current) clearTimeout(openTimeout.current);
      openTimeout.current = setTimeout(() => {
        if (pendingOpen.current) {
          pendingOpen.current = false;
          setShowFallback(true);
        }
      }, 8000);
    };

    window.addEventListener(SUPPORT_CHAT_REQUEST_EVENT, handleOpenRequest);
    return () => {
      window.removeEventListener(SUPPORT_CHAT_REQUEST_EVENT, handleOpenRequest);
      if (openTimeout.current) clearTimeout(openTimeout.current);
    };
  }, [openWidget, propertyId, widgetId]);

  return (
    <>
      <div className="mobile-support-footer">
        <button
          type="button"
          onClick={requestSupportChat}
        >
          <span className="mobile-support-footer__dot" aria-hidden="true" />
          Chat with First Grade support
        </button>
      </div>
      {showFallback && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4"
          onClick={(event) => {
            if (event.target === event.currentTarget) setShowFallback(false);
          }}
        >
          <section
            aria-labelledby="support-chat-title"
            aria-modal="true"
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl"
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="mb-3 flex size-11 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <MessageCircle aria-hidden="true" />
                </div>
                <h2 id="support-chat-title" className="text-lg font-semibold text-slate-900">
                  First Grade support
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close support message"
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                onClick={() => setShowFallback(false)}
              >
                <X aria-hidden="true" size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm leading-6 text-slate-600">
              Live chat is not available right now. Please try again later or
              contact the app administrator to configure the support chat.
            </p>
            {propertyId && widgetId && (
              <button
                type="button"
                className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl bg-teal-700 px-4 text-sm font-semibold text-white hover:bg-teal-800"
                onClick={requestSupportChat}
              >
                <MessageCircle aria-hidden="true" className="mr-2 size-4" />
                Try chat again
              </button>
            )}
          </section>
        </div>
      )}
    </>
  );
};

export default TawkChat;
