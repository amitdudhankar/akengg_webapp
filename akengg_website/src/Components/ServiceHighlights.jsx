import { Link } from "react-router-dom";
import React, { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

gsap.registerPlugin(ScrollTrigger);

const ServiceHighlights = () => {
  const navigate = useNavigate();

  const sectionRef = useRef(null);

  const services = [
    {
      title: "Boiler Systems",
      description:
        "IBR/Non-IBR Boilers, Thermic Fluid Heaters, Hot Water Generators built for reliability",
      image: "/assets/BoilerSystems.svg", // Replace with real image
    },
    {
      title: "Industrial Fabrication",
      description:
        "SS & MS Fabrication for Chimneys, Structural Platforms, Ducting, and All Types of Tanks",
      image: "/assets/IF.svg", // Replace with real image
    },
    {
      title: "Pollution Control",
      description:
        "Chimneys, Multicyclone Separators, Dust Collectors, ETP Systems engineered for efficiency",
      image: "/assets/Pollution.svg", // Replace with real image
    },
    {
      title: "Water Treatment",
      description:
        "Custom‑engineered water treatment plants for compliance & efficiency",
      image: "/assets/WT.svg", // Replace with real image
    },
  ];

  const whatMakesUsDifferent = [
    {
      title: "20+ Years of Experience",
      description:
        "Proven industry legacy delivering robust engineering solutions across diverse sectors.",
      image: "/assets/20+.jpg", // Replace with real image
    },
    {
      title: "Tailored Engineering",
      description:
        "Custom-built solutions tailored for Pharma, Chemical, Food & Textile industries.",
      image: "/assets/TailoredBoiler.jpg", // Replace with real image
    },
    {
      title: "End-to-End Solutions",
      description:
        "From design to delivery — we handle fabrication, installation & commissioning all in-house.",
      image: "/assets/E2E.jpg",
    },
    {
      title: "Pollution Control Experts",
      description:
        "Multicyclone separators, dust collectors & ETPs built for high-efficiency compliance.",
      image: "/assets/PC.jpg",
    },
    {
      title: "Precision & Quality",
      description:
        "MS & SS Fabrication with uncompromised welding, finishing, and structural strength.",
      image: "/assets/SS.jpg",
    },
    {
      title: "Support That Scales",
      description:
        "24/7 service with agile project handling and scalable solutions that grow with you.",
      image: "/assets/24x7.jpg",
    },
  ];

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

          <Link
            to="/contact"
            className="inline-block bg-[#F4C542] text-black px-8 py-3 font-medium text-sm shadow-md hover:opacity-90 transition"
          >
            Get a Quote
          </Link>
        </div>

        {/* RIGHT IMAGES */}
        <div className="flex flex-col gap-6">
          {/* Card 1 */}
          <div className="relative">
            <img
              src="/assets/BoilerSystems.svg"
              alt="Boiler Systems"
              className="w-full h-[220px] object-cover"
              loading="lazy"
            />
            <div className="absolute top-4 left-4 bg-black px-4 py-2">
              <span className="text-[#F4C542] text-sm font-semibold">
                BOILER SYSTEMS
              </span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="relative">
            <img
              src="/assets/Pollution.svg"
              alt="Pollution Control"
              className="w-full h-[220px] object-cover"
              loading="lazy"
            />
            <div className="absolute top-4 left-4 bg-black px-4 py-2">
              <span className="text-[#F4C542] text-sm font-semibold">
                POLLUTION CONTROL
              </span>
            </div>
          </div>
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
