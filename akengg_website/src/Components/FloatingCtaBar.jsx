import { useLocation } from "react-router-dom";
import { Phone } from "lucide-react";
import { FaWhatsapp } from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { buildWaLink } from "../utils/whatsapp";
import { trackEvent } from "../utils/analytics";
import WhatsAppLink from "./WhatsAppLink";

// Persistent call-to-action surface, mounted once near the app root.
//
// - Mobile/small viewports: a fixed bottom bar with a "Call Now" link and
//   (when a usable WhatsApp number exists) a WhatsApp link, side by side.
// - Medium+ viewports: the bottom bar is hidden and a circular WhatsApp
//   bubble is fixed to the bottom-right corner instead, again only when a
//   usable WhatsApp number exists.
// - Hidden entirely on /request-quote — the form there already ends in its
//   own submit CTA, so a duplicate call/WhatsApp bar would only compete
//   with it.
const FloatingCtaBar = () => {
  const location = useLocation();
  const { settings } = useSettings();

  if (location.pathname === "/request-quote") return null;

  const phone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(phone).replace(/\s+/g, "")}`;

  // Same fallback chain WhatsAppLink itself uses, so this component's layout
  // decision (equal-width vs. Call-only) always matches what WhatsAppLink
  // actually renders.
  const waNumber = settings?.whatsapp_number || settings?.company_phone || SITE.phone;
  const hasWhatsApp = Boolean(buildWaLink(waNumber));

  const handleCallClick = () => {
    trackEvent("phone_click", { context: "floating_bar", path: location.pathname });
  };

  return (
    <>
      {/* Mobile/small viewports: fixed bottom bar */}
      <div className="md:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-gray-200 bg-white shadow-[0_-2px_12px_rgba(0,0,0,0.1)]">
        <a
          href={telHref}
          onClick={handleCallClick}
          className={`flex items-center justify-center gap-2 bg-[#1c1f26] py-3.5 text-sm font-semibold text-[#F4C542] transition hover:bg-[#2a2d33] ${
            hasWhatsApp ? "w-1/2" : "w-full"
          }`}
        >
          <Phone size={18} aria-hidden="true" />
          Call Now
        </a>

        {hasWhatsApp && (
          <WhatsAppLink
            context="floating_bar"
            className="flex w-1/2 items-center justify-center gap-2 bg-[#25D366] py-3.5 text-sm font-semibold text-white transition hover:bg-[#20bd5b]"
          />
        )}
      </div>

      {/* Medium+ viewports: circular WhatsApp bubble, bottom-right */}
      {hasWhatsApp && (
        <WhatsAppLink
          context="floating_bar_desktop"
          className="hidden md:flex fixed bottom-6 right-6 z-40 h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-[0_4px_16px_rgba(0,0,0,0.25)] transition hover:bg-[#20bd5b]"
        >
          <FaWhatsapp size={28} aria-hidden="true" />
          <span className="sr-only">Chat on WhatsApp</span>
        </WhatsAppLink>
      )}
    </>
  );
};

export default FloatingCtaBar;
