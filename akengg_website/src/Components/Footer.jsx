import { Link } from "react-router-dom";
import { FaFacebookF, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { Phone, Mail, MapPin } from "lucide-react";
import { useSettings } from "../context/SettingsContext";

const Footer = () => {
  const { settings } = useSettings();

  const phone = settings?.company_phone || "+91 9822845408";
  const email = settings?.company_email || "kiran.dudhankar@akengg.in";
  const address =
    settings?.company_address ||
    "A K Engineering, Sai Shraddha Bungalow Society, near KUMAR PALMCREST, Anthon Nagar, Pisoli, Pune, Maharashtra 411060";
  const footerDescription =
    settings?.footer_description ||
    "Leading provider of industrial engineering solutions including boilers, fabrication, and pollution control systems. Engineering excellence since inception.";
  const linkedinHref = settings?.social_linkedin || "#";
  const facebookHref = settings?.social_facebook || "#";
  const instagramHref = settings?.social_instagram || "#";

  return (
    <footer className="bg-[#1c1f26] text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="flex flex-col md:flex-row justify-between gap-10">
          {/* LEFT */}
          <div className="md:w-1/2">
            <div className="mb-4">
              <img
                src="/assets/LogoLight.png"
                alt="A K Engineering"
                className="h-14"
                loading="lazy"
              />
            </div>

            <p className="text-sm mb-5 text-gray-400">{footerDescription}</p>

            <ul className="text-sm space-y-4">
              {/* Phone + Email */}
              <li className="flex flex-col sm:flex-row sm:items-center sm:gap-6">
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-[#F4C542]" />
                  <a
                    href={`tel:${phone.replace(/\s+/g, "")}`}
                    className="hover:text-[#F4C542]"
                  >
                    {phone}
                  </a>
                </div>

                <div className="flex items-center gap-2 mt-2 sm:mt-0">
                  <Mail className="w-4 h-4 text-[#F4C542]" />
                  <a
                    href={`mailto:${email}`}
                    className="hover:text-[#F4C542]"
                  >
                    {email}
                  </a>
                </div>
              </li>

              {/* Address */}
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-[#F4C542] mt-[2px]" />
                <a
                  href="https://share.google/oHfcNzm14HHvkMC4m"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#F4C542]"
                >
                  {settings?.company_address ? (
                    address
                  ) : (
                    <>
                      A K Engineering, Sai Shraddha Bungalow Society, <br />
                      near KUMAR PALMCREST, Anthon Nagar, <br />
                      Pisoli, Pune, Maharashtra 411060
                    </>
                  )}
                </a>
              </li>
            </ul>
          </div>

          {/* RIGHT */}
          <div className="md:w-1/2 flex flex-col sm:flex-row justify-between gap-10">
            {/* Quick Links */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">
                Quick Links
              </h3>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/about" className="hover:text-[#F4C542]">
                    Who we are
                  </Link>
                </li>
                <li>
                  <Link to="/services" className="hover:text-[#F4C542]">
                    Services
                  </Link>
                </li>
                <li>
                  <Link to="/projects" className="hover:text-[#F4C542]">
                    Projects
                  </Link>
                </li>
                <li>
                  <Link to="/blogs" className="hover:text-[#F4C542]">
                    Our Blogs
                  </Link>
                </li>
                <li>
                  <Link to="/contact" className="hover:text-[#F4C542]">
                    Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Services */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-white">
                Our Services
              </h3>

              <ul className="space-y-2 text-sm">
                <li>Boiler Systems</li>
                <li>IBR/Non-IBR Piping</li>
                <li>Water Treatment Plants</li>
                <li>Industrial Fabrication</li>
                <li>Pollution Control</li>
              </ul>

              {/* Social */}
              <div className="flex space-x-4 mt-5">
                <a
                  href={linkedinHref}
                  className="p-2 border border-gray-600 text-[#F4C542] hover:bg-[#F4C542] hover:text-black transition"
                >
                  <FaLinkedinIn size={16} />
                </a>
                <a
                  href={facebookHref}
                  className="p-2 border border-gray-600 text-[#F4C542] hover:bg-[#F4C542] hover:text-black transition"
                >
                  <FaFacebookF size={16} />
                </a>
                <a
                  href={instagramHref}
                  className="p-2 border border-gray-600 text-[#F4C542] hover:bg-[#F4C542] hover:text-black transition"
                >
                  <FaInstagram size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-700 mt-10 pt-5 text-center text-xs text-gray-400 md:text-sm">
          &copy; 2026 A K Engineering. All rights reserved. | &nbsp;
          <Link to="/privacy-policy" className="hover:text-[#F4C542]">
            Privacy Policy
          </Link>
          &nbsp;|&nbsp;
          <Link to="/terms" className="hover:text-[#F4C542]">
            Terms &amp; Conditions
          </Link>
          &nbsp;|&nbsp;
          <Link to="/faq" className="hover:text-[#F4C542]">
            FAQ
          </Link>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
