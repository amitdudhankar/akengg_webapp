import { useLocation } from "react-router-dom";
import { FaWhatsapp } from "react-icons/fa";
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { buildWaLink } from "../utils/whatsapp";
import { trackEvent } from "../utils/analytics";

// Reusable "chat on WhatsApp" link. Renders nothing when no usable WhatsApp
// number is available anywhere in the fallback chain, so callers can drop
// it in without a manual null-check.
//
//   <WhatsAppLink context="services_cta" className="btn-primary" />
//   <WhatsAppLink context="hero" text="Hi, I'd like a quote for...">
//     Chat with us
//   </WhatsAppLink>
const WhatsAppLink = ({ text = "", context = "generic", className, children }) => {
  const { settings } = useSettings();
  const location = useLocation();

  const number =
    settings?.whatsapp_number || settings?.company_phone || SITE.phone;

  const link = buildWaLink(number, text);
  if (!link) return null;

  const handleClick = () => {
    trackEvent("whatsapp_click", { context, path: location.pathname });
  };

  return (
    <a
      href={link}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={handleClick}
    >
      {children || (
        <>
          <FaWhatsapp className="inline-block" />
          <span>WhatsApp Us</span>
        </>
      )}
    </a>
  );
};

export default WhatsAppLink;
