import { Link } from "react-router-dom";
import { CheckCircle2, Phone } from "lucide-react";
import { useSettings } from "../../context/SettingsContext";
import SITE from "../../config/site";
import WhatsAppLink from "../../Components/WhatsAppLink";

// Shown in place of the form once submitLead() resolves. `lead` is the
// created lead merged with the selected product (see QuoteForm's onSuccess
// call), so it carries at least { id, lead_number, product }.
const QuoteSuccess = ({ lead }) => {
  const { settings } = useSettings();
  const phone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(phone).replace(/\s+/g, "")}`;

  const waMessage = lead?.product
    ? `Hi, I recently submitted a quote request (Ref: ${lead?.lead_number}) for ${lead.product}. I'd like to follow up.`
    : `Hi, I recently submitted a quote request (Ref: ${lead?.lead_number}). I'd like to follow up.`;

  return (
    <section className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 text-center">
      <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#234B97]/10">
        <CheckCircle2 className="text-[#234B97]" size={40} aria-hidden="true" />
      </div>

      <h1 className="text-2xl md:text-3xl font-semibold text-[#1c1f26] mb-4">Request Received</h1>

      <p className="text-[15px] text-gray-600 leading-relaxed mb-8">
        Thank you. Your technical requirement has been received. Our team will review your
        requirement and contact you shortly.
      </p>

      <div className="mx-auto mb-10 max-w-sm border-2 border-[#F4C542] bg-white px-6 py-6">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-500 mb-2">
          Your Reference Number
        </p>
        <p className="text-2xl md:text-3xl font-bold text-[#1c1f26]">{lead?.lead_number}</p>
      </div>

      <div className="mb-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        <a
          href={telHref}
          className="flex w-full items-center justify-center gap-2 bg-[#1c1f26] px-6 py-3 text-sm font-semibold text-white transition hover:bg-black sm:w-auto"
        >
          <Phone size={16} aria-hidden="true" /> Call Us
        </a>

        <WhatsAppLink
          text={waMessage}
          context="quote_success"
          className="flex w-full items-center justify-center gap-2 border border-[#234B97] px-6 py-3 text-sm font-semibold text-[#234B97] transition hover:bg-[#234B97]/5 sm:w-auto"
        />
      </div>

      <div className="flex items-center justify-center gap-6 text-sm">
        <Link
          to="/"
          className="font-medium text-[#1c1f26] underline underline-offset-2 hover:text-[#F4C542]"
        >
          Back to Home
        </Link>
        <Link
          to="/projects"
          className="font-medium text-[#1c1f26] underline underline-offset-2 hover:text-[#F4C542]"
        >
          View Our Projects
        </Link>
      </div>
    </section>
  );
};

export default QuoteSuccess;
