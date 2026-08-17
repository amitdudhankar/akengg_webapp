import { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X } from "lucide-react";
import gsap from "gsap";
import logo from "../assets/Logo.png"; // adjust path if needed
import { useSettings } from "../context/SettingsContext";

const FALLBACK_COMPANY_PHONE = "+91 9822845408";

const Header = () => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();
  const { settings } = useSettings();
  const companyPhone = settings?.company_phone || FALLBACK_COMPANY_PHONE;

  const navigation = [
    { name: "Who Are We", href: "/about" },
    { name: "Services", href: "/services" },
    { name: "Projects", href: "/projects" },
    { name: "Our Blogs", href: "/blogs" },
    { name: "Contact", href: "/contact" },
  ];

  const isActive = (path) => location.pathname === path;

  // Animate menu open/close
  useEffect(() => {
    if (isMenuOpen) {
      gsap.fromTo(
        menuRef.current,
        { height: 0, opacity: 0 },
        { height: "auto", opacity: 1, duration: 0.4, ease: "power2.out" },
      );
    } else {
      gsap.to(menuRef.current, {
        height: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.inOut",
      });
    }
  }, [isMenuOpen]);

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-gray-200 shadow-md sticky top-0 z-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-4">
          {" "}
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <img
              src={logo}
              alt="A K Engineering Logo"
              className="h-10 w-auto object-contain"
              loading="lazy"
            />
          </Link>
          {/* Mobile Toggle */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-800 hover:text-[#F4C542] focus:outline-none"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
          {/* Desktop Nav */}
          <nav className="hidden md:flex items-center justify-center flex-1 space-x-10">
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

                {/* Underline effect */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] bg-[#F4C542] transition-all duration-300 ${
                    isActive(item.href) ? "w-full" : "w-0 group-hover:w-full"
                  }`}
                />
              </Link>
            ))}
          </nav>
          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-4 text-gray-800">
            <img
              src="/assets/Calling Header.svg"
              alt="Call Icon"
              className="w-9 h-9"
              loading="lazy"
            />
            <div className="flex flex-col text-[#1c1f26]">
              <span className="flex text-sm justify-end">Call us at</span>
              <a href="tel:+919822845408" className="text-base font-bold">
                {companyPhone}
              </a>
            </div>
          </div>
        </div>

        {/* Mobile Navigation */}
        <div
          ref={menuRef}
          className="md:hidden overflow-hidden bg-white"
          style={{ height: 0, opacity: 0 }}
        >
          <div className="mt-4 border-t border-gray-200 pt-6 pb-6 flex flex-col items-center gap-5">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                onClick={() => setIsMenuOpen(false)}
                className={`relative text-[16px] font-medium transition duration-200 ${
                  isActive(item.href) ? "text-[#1c1f26]" : "text-gray-700"
                }`}
              >
                {item.name}

                {/* Underline like desktop */}
                <span
                  className={`absolute left-0 -bottom-1 h-[2px] bg-[#C9A14A] transition-all duration-300 ${
                    isActive(item.href) ? "w-full" : "w-0"
                  }`}
                />
              </Link>
            ))}

            {/* Call Section */}
            <div className="flex items-center gap-3 mt-4">
              <img
                src="/assets/Calling Header.svg"
                alt="Call Icon"
                className="w-6 h-6"
                loading="lazy"
              />
              <div className="flex flex-col text-[#1c1f26]">
                <span className="text-xs">Call us at</span>
                <a href="tel:+919822845408" className="text-sm font-semibold">
                  {companyPhone}
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
