import React from "react";
import CTASection from "./CTASection";
import Seo from "../Components/Seo";
import { useSettings } from "../context/SettingsContext";

const FALLBACK_FOUNDING_YEAR = "2005";
const FALLBACK_ABOUT_TEXT =
  "We are committed to delivering complete satisfaction by aligning our solutions with our clients’ requirements. Over the years, we have earned strong trust and long-term relationships through our quality work, dependable systems, and customer-focused approach.";

const AboutUs = () => {
  const { settings } = useSettings();
  const foundingYear = settings?.founding_year || FALLBACK_FOUNDING_YEAR;
  const aboutText = settings?.about_text || FALLBACK_ABOUT_TEXT;

  return (
    <div className="">
      <Seo
        title="About Us"
        description="Learn about A K Engineering — our experience delivering boiler systems, industrial fabrication and pollution-control projects across multiple industries."
        path="/about"
      />
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
            About Us
          </h1>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* LEFT CONTENT */}
            <div>
              <h2 className="text-3xl font-semibold text-[#1c1f26] mb-6">
                About A K Engineering
              </h2>

              <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
                A. K. Engineering was established in the year {foundingYear} and has grown
                into a leading manufacturer and service provider of IBR Steam
                Boilers, Non-IBR Steam Boilers, and related industrial
                solutions. Our products are widely recognized for their
                reliability, efficiency, and consistent performance across
                industries.
              </p>

              <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
                {aboutText}
              </p>

              <p className="text-[15px] text-gray-700 leading-relaxed mb-5">
                Quality remains the foundation of our operations. We source
                high-grade raw materials and conduct strict quality checks at
                every stage of production to ensure superior output and
                durability.
              </p>

              <p className="text-[15px] text-gray-700 leading-relaxed">
                With advanced infrastructure, modern manufacturing facilities,
                and a dedicated team of skilled professionals, we continuously
                strive to deliver engineering excellence and achieve our
                organizational goals while exceeding customer expectations.
              </p>
            </div>

            {/* RIGHT IMAGE */}
            <div className=" p-6">
              <img
                src="/assets/AboutUs.png" // replace with your image
                alt="Industrial facility"
                className="w-full h-64 object-cover"
                loading="lazy"
              />
            </div>
          </div>
        </div>
      </section>
      <CTASection/>
    </div>
  );
};

export default AboutUs;
