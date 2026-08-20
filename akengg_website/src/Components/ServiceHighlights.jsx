import { Link } from "react-router-dom";
import React, { useEffect, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { getServices } from "../api/api";
import RequestQuoteCta from "./RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

gsap.registerPlugin(ScrollTrigger);

// Shown until the Services admin has rows — same fallback contract the rest of
// the site uses, so the homepage never renders an empty panel.
const FALLBACK_SERVICES = [
  {
    title: "Boiler Systems",
    description:
      "IBR/Non-IBR Boilers, Thermic Fluid Heaters, Hot Water Generators built for reliability",
    image: "/assets/BoilerSystems.svg",
  },
  {
    title: "Industrial Fabrication",
    description:
      "SS & MS Fabrication for Chimneys, Structural Platforms, Ducting, and All Types of Tanks",
    image: "/assets/IF.svg",
  },
  {
    title: "Pollution Control",
    description:
      "Chimneys, Multicyclone Separators, Dust Collectors, ETP Systems engineered for efficiency",
    image: "/assets/Pollution.svg",
  },
  {
    title: "Water Treatment",
    description:
      "Custom‑engineered water treatment plants for compliance & efficiency",
    image: "/assets/WT.svg",
  },
];

// The panel is a teaser beside the copy, not the full catalogue — "View More
// Services" goes to /services for the rest.
const MAX_CARDS = 4;

const ServiceHighlights = () => {
  const [services, setServices] = useState(FALLBACK_SERVICES);

  useEffect(() => {
    getServices()
      .then((d) => {
        if (Array.isArray(d) && d.length) setServices(d);
      })
      .catch(() => {});
  }, []);

  const cards = services.slice(0, MAX_CARDS);


  return (
    <section className="py-10 bg-[#1c1f26] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid lg:grid-cols-2 gap-12 items-center">
        {/* LEFT CONTENT */}
        <div>
          <p className="text-sm tracking-wide uppercase mb-4 text-gray-300">
            Welcome to A K Engineering
          </p>

          <h2 className="text-[28px] sm:text-[36px] md:text-[44px] font-medium text-[#F4C542] leading-snug mb-6">
            The premier industrial engineering solutions provider in India
          </h2>

          <p className="text-gray-300 text-[15px] leading-relaxed mb-8 max-w-md">
            Delivering reliable boilers, fabrication systems, and pollution
            control solutions tailored for modern industries.
          </p>

          <RequestQuoteCta
            className="inline-block bg-[#F4C542] text-black px-8 py-3 font-medium text-sm shadow-md hover:opacity-90 transition"
            onClick={() =>
              trackEvent("quote_request_started", {
                context: "service_highlights",
              })
            }
          >
            Request a Quote
          </RequestQuoteCta>
        </div>

        {/* RIGHT IMAGES — driven by the Services admin, FALLBACK_SERVICES until
            it has rows. A service saved without an image still gets a card, so
            one missing upload can't punch a hole in the grid. */}
        <div
          className={`grid gap-4 sm:gap-6 ${
            cards.length > 2 ? "sm:grid-cols-2" : "grid-cols-1"
          }`}
        >
          {cards.map((service, index) => (
            <div key={service.id ?? index} className="relative">
              {service.image ? (
                <img
                  src={service.image}
                  alt={service.title || "Service"}
                  className="w-full h-[220px] object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-[220px] bg-black/40" />
              )}
              <div className="absolute top-4 left-4 bg-black px-4 py-2">
                <span className="text-[#F4C542] text-sm font-semibold uppercase">
                  {service.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* View More Button */}
      <div className="mt-16 flex justify-center">
        <Link
          to="/services"
          className="bg-transparent border border-[#F4C542] text-[#F4C542] px-8 py-3 text-sm font-medium tracking-wide hover:bg-[#F4C542] hover:text-black transition duration-300"
        >
          View More Services
        </Link>
      </div>
    </section>
  );
};

export default ServiceHighlights;
