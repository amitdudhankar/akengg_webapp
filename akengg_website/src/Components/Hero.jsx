import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ArrowUpRight } from "lucide-react";
import { useSettings } from "../context/SettingsContext";
import RequestQuoteCta from "./RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

const Hero = () => {
  const containerRef = useRef(null);
  const { settings } = useSettings();

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.from(".hero-animate", {
        opacity: 0,
        y: 40,
        duration: 1,
        ease: "power3.out",
        stagger: 0.2,
      });
    }, containerRef);

    return () => ctx.revert(); // Clean up GSAP context on unmount
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative bg-gradient-to-br from-gray-900 via-blue-900 to-gray-800 text-white h-[92vh] overflow-hidden"
    >
      {/* Background Video */}
      <video
        className="absolute inset-0 w-full h-full object-cover"
        src="/assets/HeroVideo.mp4"
        autoPlay
        loop
        muted
        playsInline
      />

      {/* Black Overlay */}
      <div className="absolute inset-0 bg-black opacity-40"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 sm:py-28 md:py-32">
        <div className="text-left">
          {/* Heading */}
          <p className="hero-animate text-[36px] sm:text-[48px] md:text-[60px] leading-[45px] sm:leading-[55px] md:leading-[65px] font-extrabold text-[#F4F4F4] mb-6 sm:mb-8">
            {settings?.hero_headline || (
              <>
                Engineering Excellence <br />
                in Boilers, Fabrication <br /> & Pollution Control
              </>
            )}
          </p>

          {/* Subheading */}
          <p className="hero-animate text-[16px] sm:text-[18px] leading-[30px] sm:leading-[35px] font-semibold text-[#F4F4F4] mb-12 sm:mb-20 max-w-4xl">
            {settings?.hero_subtext ||
              "Turnkey IBR Boiler Solutions • End-to-End Fabrication & Installation • Pollution Control You Can Trust"}
          </p>

          {/* Buttons */}
          <div className="hero-animate flex flex-col sm:flex-row gap-4 justify-start items-stretch sm:items-center">
            <RequestQuoteCta
              className="w-full sm:w-[292px] h-[59px] flex-shrink-0 bg-[#F4C542] text-black rounded-none font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center justify-center"
              onClick={() =>
                trackEvent("quote_request_started", { context: "hero" })
              }
            >
              Request a Quote
            </RequestQuoteCta>

            <Link
              to="/contact"
              className="w-full sm:w-auto h-[59px] px-8 flex-shrink-0 rounded-none border-2 border-white/70 text-[#F4F4F4] font-semibold text-lg flex items-center justify-center transition-all duration-300 hover:border-[#F4C542] hover:text-[#F4C542]"
            >
              Get in Touch
            </Link>

            <Link
              to="/services"
              aria-label="Explore our services"
              className="hidden sm:flex w-[59px] h-[59px] flex-shrink-0 rounded-none bg-[#F4C542] items-center justify-center transition-all duration-300 transform hover:scale-105 shadow-md"
            >
              <ArrowUpRight className=" w-7 h-7 text-black" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;