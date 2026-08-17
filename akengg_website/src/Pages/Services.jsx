import React, { useState, useEffect } from "react";
import { getServices } from "../api/api";
import Seo from "../Components/Seo";

const FALLBACK_SERVICES = [
    {
      title: "Boiler Systems",
      image: "/assets/Boiler Systems.jpg",
      description:
        "Comprehensive boiler solutions for all industrial applications",
      details:
        "Sales, Services & Projects of IBR / Non-IBR Boilers, Thermic Fluid Heaters, Hot Water Generators, Incinerators",
      features: [
        "IBR & Non-IBR Boiler Systems",
        "Thermic Fluid Heaters",
        "Hot Water Generators",
        "Industrial Incinerators",
        "Installation & Commissioning",
        "Maintenance & Service",
      ],
      icon: "🔥",
      gradient: "from-red-500 to-orange-500",
    },
    {
      title: "IBR/Non-IBR Piping Projects",
      image: "/assets/IBR.jpg",
      description:
        "Professional piping solutions meeting all regulatory standards",
      details:
        "Complete piping systems designed and installed according to IBR specifications and industry best practices",
      features: [
        "IBR Compliant Piping Design",
        "Non-IBR Industrial Piping",
        "Steam Distribution Systems",
        "Process Piping Installation",
        "Pressure Testing & Certification",
        "Maintenance & Upgrades",
      ],
      icon: "🔧",
      gradient: "from-blue-500 to-cyan-500",
    },
    {
      title: "Water Treatment Plants",
      image: "/assets/Water Treatment.jpg",
      description:
        "Efficient water treatment solutions for industrial applications",
      details:
        "Custom-designed water treatment plants engineered for maximum efficiency and environmental compliance",
      features: [
        "Industrial Water Treatment",
        "Effluent Treatment Plants",
        "Reverse Osmosis Systems",
        "Softening & Filtration",
        "Chemical Dosing Systems",
        "Automated Control Systems",
      ],
      icon: "💧",
      gradient: "from-blue-400 to-blue-600",
    },
    {
      title: "Industrial Fabrication",
      image: "/assets/Industrial Fab.jpg",
      description:
        "Precision fabrication services for diverse industrial needs",
      details:
        "SS & MS Fabrication for Chimneys, Structural Platforms, Ducting, All Types of Tanks, Piping",
      features: [
        "Stainless Steel Fabrication",
        "Mild Steel Structures",
        "Industrial Chimneys",
        "Storage Tanks & Vessels",
        "Ducting Systems",
        "Structural Platforms",
      ],
      icon: "🏗️",
      gradient: "from-gray-500 to-gray-700",
    },
    {
      title: "Pollution Control Equipment",
      image: "/assets/Pollution Control.jpg",
      description:
        "Advanced pollution control systems for environmental compliance",
      details:
        "Chimneys, Multicyclone Separators, Dust Collectors, ETP Systems designed for optimal performance",
      features: [
        "Industrial Chimneys",
        "Multicyclone Separators",
        "Bag Dust Collectors",
        "Wet Scrubber Systems",
        "ETP Systems",
        "Air Quality Monitoring",
      ],
      icon: "🌱",
      gradient: "from-green-500 to-emerald-500",
    },
  ];

const Services = () => {
  const [services, setServices] = useState(FALLBACK_SERVICES);

  useEffect(() => {
    getServices()
      .then((d) => {
        if (Array.isArray(d) && d.length) setServices(d);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="">
      <Seo title="Our Services" description="Boiler systems, IBR/non-IBR piping, water treatment, industrial fabrication and pollution-control services by A K Engineering." path="/services" />
      {/* Hero Section */}
      <section className="relative h-[200px] md:h-[300px] flex items-center text-white">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/AboutBanner.jpg')" }} // replace with your image
        />

        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-black/50"></div>

        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">
            Services
          </h1>
        </div>
      </section>

      {/* Services Grid */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="space-y-20">
            {services.map((service, index) => (
              <div
                key={index}
                className={`grid grid-cols-1 lg:grid-cols-2 gap-12 items-center ${
                  index % 2 === 1 ? "lg:grid-flow-row-dense" : ""
                }`}
              >
                {/* TEXT SIDE */}
                <div className={index % 2 === 1 ? "lg:col-start-2" : ""}>
                  {/* Yellow Accent Line */}
                  <div className="w-12 h-[3px] bg-[#F4C542] mb-4"></div>

                  {/* Title */}
                  <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-4">
                    {service.title}
                  </h2>

                  {/* Description */}
                  <p className="text-[15px] text-gray-700 mb-4 leading-relaxed">
                    {service.description}
                  </p>

                  <p className="text-[14px] text-gray-600 mb-6 leading-relaxed">
                    {service.details}
                  </p>

                  {/* Features */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {(service.features || []).map((feature, idx) => (
                      <div key={idx} className="flex items-center gap-2">
                        <div className="w-[6px] h-[6px] bg-[#F4C542]"></div>
                        <span className="text-[14px] text-gray-700">
                          {feature}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* IMAGE SIDE */}
                <div
                  className={
                    index % 2 === 1 ? "lg:col-start-1 lg:row-start-1" : ""
                  }
                >
                  <div className="relative overflow-hidden border border-gray-200">
                    {/* Image */}
                    <img
                      src={service.image}
                      alt={service.title}
                      className="w-full h-[300px] object-cover transition duration-500 hover:scale-105"
                      loading="lazy"
                    />

                    {/* Bottom Accent Bar */}
                    <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#F4C542]" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-24 bg-[#1c1f26] text-center text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Accent Line */}
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6"></div>

          {/* Heading */}
          <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
            Ready to Get Started?
          </h2>

          {/* Description */}
          <p className="text-gray-300 text-[16px] leading-relaxed mb-10 max-w-2xl mx-auto">
            Connect with A K Engineering to discuss your industrial requirements
            and get reliable, high-performance solutions tailored to your
            operations.
          </p>

          {/* CTA Button */}
          <a
            href="/contact"
            className="inline-block bg-[#F4C542] text-[#1c1f26] px-10 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
          >
            GET A QUOTE
          </a>
        </div>
      </section>
    </div>
  );
};

export default Services;
