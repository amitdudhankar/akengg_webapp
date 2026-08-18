import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Cookie } from "lucide-react";
import { getConsent, setConsent, onConsentChange } from "../utils/cookieConsent";

// Cookie consent banner.
//
// The decision is read inside an effect rather than during render, because
// localStorage does not exist until the browser runs.
//
// NOTE: that alone does NOT keep the banner out of the static HTML —
// scripts/prerender.mjs snapshots the DOM *after* effects have run, with an
// empty localStorage, so the banner is visible at capture time. The root
// carries data-cookie-consent and the prerender step strips it; without that,
// visitors who already accepted would get a flash of the banner from the static
// HTML before React hydrated, and its copy would land in the indexed text.
export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(getConsent() === null);

    // The footer's "Cookie settings" link clears the decision; reopen for that.
    return onConsentChange((state) => setVisible(state === null));
  }, []);

  if (!visible) return null;

  const decide = (granted) => {
    setConsent(granted);
    setVisible(false);
  };

  return (
    <div
      data-cookie-consent
      role="dialog"
      aria-modal="false"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4"
    >
      <div className="mx-auto max-w-4xl rounded-xl border border-gray-200 bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.18)] sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <Cookie
            className="hidden h-8 w-8 shrink-0 text-[#F4C542] sm:block"
            aria-hidden="true"
          />

          <p className="flex-grow text-sm leading-relaxed text-gray-700">
            We use only the cookies needed to make this site work. With your
            permission we would also like to measure how the site is used, so we
            can improve it. See our{" "}
            <Link className="text-[#234B97] underline" to="/privacy-policy">
              Privacy Policy
            </Link>
            .
          </p>

          <div className="flex shrink-0 gap-3">
            <button
              type="button"
              onClick={() => decide(false)}
              className="flex-1 rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 sm:flex-none"
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => decide(true)}
              className="flex-1 rounded-lg bg-[#234B97] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-[#1c3c79] sm:flex-none"
            >
              Accept
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
