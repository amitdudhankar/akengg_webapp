import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Phone } from "lucide-react";
import logo from "../assets/Logo.png"; // adjust path if needed
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { trackEvent } from "../utils/analytics";
import RequestQuoteCta from "./RequestQuoteCta";

const navigation = [
  { name: "Who Are We", href: "/about" },
  { name: "Services", href: "/services" },
  { name: "Industries", href: "/industries" },
  { name: "Projects", href: "/projects" },
  { name: "Our Blogs", href: "/blogs" },
  { name: "Contact", href: "/contact" },
];

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  // `hidden` slides the bar up out of view on downward scroll; `scrolled`
  // just tightens the padding + strengthens the shadow once off the top.
  const [hidden, setHidden] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const lastScrollY = useRef(0);

  const location = useLocation();
  const { settings } = useSettings();
  const companyPhone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(companyPhone).replace(/\s+/g, "")}`;

  const handleCallClick = (context) => {
    trackEvent("phone_click", { context, path: location.pathname });
  };

  const isActive = (path) => location.pathname === path;

  // Hide-on-scroll-down / reveal-on-scroll-up.
  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 8);

      // Never hide while near the top of the page or while the mobile
      // drawer is open (hiding the bar would drag the drawer up with it).
      if (y < 80 || isMenuOpen) {
        setHidden(false);
      } else if (Math.abs(y - lastScrollY.current) > 6) {
        // The 6px dead-zone stops trackpad/momentum jitter from flipping
        // the bar back and forth on tiny scroll deltas.
        setHidden(y > lastScrollY.current);
      }

      lastScrollY.current = y;
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isMenuOpen]);

  // Close the drawer whenever the route changes (tapping a link).
  useEffect(() => {
    setIsMenuOpen(false);
  }, [location.pathname]);

  // Lock background scrolling while the drawer is open.
  useEffect(() => {
    if (!isMenuOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [isMenuOpen]);

  // Allow Esc to dismiss the drawer.
  useEffect(() => {
    if (!isMenuOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setIsMenuOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isMenuOpen]);

  return (
    <>
      <header
        className={`sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-200 transition-transform duration-300 ease-out ${
          hidden ? "-translate-y-full" : "translate-y-0"
        } ${scrolled ? "shadow-md" : "shadow-sm"}`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div
            className={`flex items-center justify-between transition-all duration-300 ${
              scrolled ? "py-2.5" : "py-4"
            }`}
          >
            {/* Logo */}
            <Link to="/" className="flex items-center flex-shrink-0">
              <img
                src={logo}
                alt="A K Engineering Logo"
                className={`w-auto object-contain transition-all duration-300 ${
                  scrolled ? "h-8" : "h-10"
                }`}
              />
            </Link>

            {/* Desktop Nav */}
            <nav className="hidden lg:flex items-center justify-center flex-1 gap-6 xl:gap-9">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`group relative text-[15px] font-medium transition duration-200 ${
                    isActive(item.href)
                      ? "text-[#1c1f26]"
                      : "text-gray-700 hover:text-[#1c1f26]"
                  }`}
                >
                  {item.name}
                  <span
                    className={`absolute left-0 -bottom-1 h-[2px] bg-[#F4C542] transition-all duration-300 ${
                      isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                    }`}
                  />
                </Link>
              ))}
            </nav>

            {/* Desktop CTA cluster */}
            <div className="hidden lg:flex items-center gap-3 xl:gap-4 flex-shrink-0">
              <a
                href={telHref}
                onClick={() => handleCallClick("header")}
                className="group flex items-center gap-2.5"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4C542]/20 text-[#1c1f26] transition group-hover:bg-[#F4C542]/35">
                  <Phone size={16} />
                </span>
                <span className="hidden xl:flex flex-col leading-tight">
                  <span className="text-[11px] uppercase tracking-wide text-gray-500">
                    Call us at
                  </span>
                  <span className="text-[15px] font-bold text-[#1c1f26] whitespace-nowrap">
                    {companyPhone}
                  </span>
                </span>
              </a>

              <span className="hidden xl:block h-8 w-px bg-gray-200" aria-hidden="true" />

              <RequestQuoteCta
                className="inline-flex items-center justify-center whitespace-nowrap bg-[#F4C542] text-black px-5 py-2.5 text-sm font-semibold shadow-sm transition hover:opacity-90"
                onClick={() =>
                  trackEvent("quote_request_started", { context: "header" })
                }
              >
                Request Quote
              </RequestQuoteCta>
            </div>

            {/* Mobile toggle */}
            <button
              type="button"
              onClick={() => setIsMenuOpen(true)}
              aria-label="Open menu"
              aria-expanded={isMenuOpen}
              className="lg:hidden text-gray-800 transition hover:text-[#F4C542] focus:outline-none"
            >
              <Menu size={26} />
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile drawer ──────────────────────────────────────────────
          Rendered OUTSIDE <header> on purpose: the header carries a
          translate transform for the hide-on-scroll behaviour, and a
          fixed-position child of a transformed ancestor would be
          positioned against that ancestor instead of the viewport.
          Keeping it a sibling also means opening the menu no longer
          stretches the header's own height. */}
      <div
        onClick={() => setIsMenuOpen(false)}
        aria-hidden="true"
        className={`lg:hidden fixed inset-0 z-[60] bg-black/50 transition-opacity duration-300 ${
          isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Menu"
        className={`lg:hidden fixed top-0 right-0 z-[70] flex h-full w-[82%] max-w-sm flex-col bg-white shadow-2xl transition-transform duration-300 ease-out ${
          isMenuOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-gray-200 px-5 py-4">
          <img
            src={logo}
            alt="A K Engineering Logo"
            className="h-8 w-auto object-contain"
          />
          <button
            type="button"
            onClick={() => setIsMenuOpen(false)}
            aria-label="Close menu"
            className="text-gray-700 transition hover:text-[#F4C542] focus:outline-none"
          >
            <X size={24} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col overflow-y-auto py-2">
          {navigation.map((item) => (
            <Link
              key={item.name}
              to={item.href}
              className={`border-l-[3px] px-5 py-3.5 text-[16px] font-medium transition ${
                isActive(item.href)
                  ? "border-[#F4C542] bg-[#F4C542]/10 text-[#1c1f26]"
                  : "border-transparent text-gray-700 hover:bg-gray-50"
              }`}
            >
              {item.name}
            </Link>
          ))}
        </nav>

        <div className="border-t border-gray-200 px-5 py-5">
          <RequestQuoteCta
            className="flex w-full items-center justify-center bg-[#F4C542] px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
            onClick={() =>
              trackEvent("quote_request_started", { context: "header_mobile" })
            }
          >
            Request Quote
          </RequestQuoteCta>

          <a
            href={telHref}
            onClick={() => handleCallClick("header_mobile")}
            className="mt-4 flex items-center gap-3"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#F4C542]/20 text-[#1c1f26]">
              <Phone size={16} />
            </span>
            <span className="flex flex-col leading-tight">
              <span className="text-[11px] uppercase tracking-wide text-gray-500">
                Call us at
              </span>
              <span className="text-[15px] font-bold text-[#1c1f26]">
                {companyPhone}
              </span>
            </span>
          </a>
        </div>
      </aside>
    </>
  );
};

export default Header;
