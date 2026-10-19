"use client";

import Script from "next/script";

const openSupportChat = () => {
  const tawk = (window as Window & { Tawk_API?: { maximize?: () => void } }).Tawk_API;
  tawk?.maximize?.();
};

const TawkChat = () => {
  const propertyId = process.env.NEXT_PUBLIC_TAWK_PROPERTY_ID;
  const widgetId = process.env.NEXT_PUBLIC_TAWK_WIDGET_ID;

  if (!propertyId || !widgetId) return null;

  return (
    <>
      <Script
        id="tawk-to-widget"
        strategy="afterInteractive"
        src={`https://embed.tawk.to/${propertyId}/${widgetId}`}
        charSet="UTF-8"
        crossOrigin="anonymous"
      />
      <div className="mobile-support-footer">
        <button type="button" onClick={openSupportChat}>
          <span className="mobile-support-footer__dot" aria-hidden="true" />
          Chat with First Grade support
        </button>
      </div>
    </>
  );
};

export default TawkChat;
