import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { getIndustries } from "../api/api";
import Seo from "../Components/Seo";
import Breadcrumbs from "../Components/Breadcrumbs";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

// Generic seed content so the page renders in full when the API is unreachable
// (the build-time prerenderer captures it exactly that way). Deliberately
// claim-free -- sector names and the kind of work they need, no counts, client
// names or credentials. The real copy comes from the admin panel.
const FALLBACK_INDUSTRIES = [
  {
    slug: "pharmaceutical",
    name: "Pharmaceutical",
    image: "/assets/Pharmaceutical.jpg",
    overview: [
      "Steam generation, distribution piping and utility systems engineered for clean, closely regulated pharmaceutical production environments.",
    ],
  },
  {
    slug: "chemical",
    name: "Chemical",
    image: "/assets/Chemical Water Treat.jpg",
    overview: [
      "Process heating, corrosion-aware fabrication and effluent handling equipment for chemical processing plants.",
    ],
  },
  {
    slug: "food-beverage",
    name: "Food & Beverage",
    image: "/assets/Food Industry Fabrication.jpg",
    overview: [
      "Hygienic stainless-steel fabrication, steam and hot-water systems suited to food and beverage processing lines.",
    ],
  },
  {
    slug: "textiles",
    name: "Textiles",
    image: "/assets/Textile Mill Pollution Control.jpg",
    overview: [
      "Boilers, thermic fluid heaters and pollution-control equipment for dyeing, processing and finishing operations.",
    ],
  },
  {
    slug: "power-generation",
    name: "Power Generation",
    image: "/assets/Power Plant Chimney Construction.jpg",
    overview: [
      "Chimneys, ducting, structural platforms and high-temperature piping built for thermal power generation sites.",
    ],
  },
  {
    slug: "automotive",
    name: "Automotive",
    image: "/assets/Automotive Fabrication.jpg",
    overview: [
      "Custom fabrication and utility piping supporting automotive component manufacturing and assembly plants.",
    ],
  },
];

// First overview paragraph, trimmed to a single card-friendly line.
const teaserFor = (industry) => {
  const first = Array.isArray(industry?.overview) ? industry.overview[0] : "";
  const text = String(first || "").trim();
  if (!text) return "";
  return text.length > 140 ? `${text.slice(0, 140).trimEnd()}...` : text;
};

const Industries = () => {
  const [industries, setIndustries] = useState(FALLBACK_INDUSTRIES);

  useEffect(() => {
    getIndustries()
      .then((data) => {
        if (Array.isArray(data) && data.length) setIndustries(data);
      })
      .catch(() => {
        // API unreachable -- the seeded fallback above simply stays on screen.
      });
  }, []);

  return (
    <div>
      <Seo
        title="Industries We Serve"
        description="Boiler systems, industrial piping, fabrication and pollution-control solutions engineered for pharmaceutical, chemical, food, textile, power and automotive plants."
        path="/industries"
      />

      {/* Hero */}
      <section className="relative h-[200px] md:h-[300px] flex items-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/assets/AboutBanner.jpg')" }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">
            Industries We Serve
          </h1>
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: "Home", path: "/" }, { label: "Industries" }]} />
        </div>
      </div>

      {/* Intro + industry grid */}
      <section className="py-16 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-12">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-4">
              Engineering Built Around Your Sector
            </h2>
            <p className="text-[15px] text-gray-700 leading-relaxed">
              Every plant runs to different pressures, hygiene rules and
              emission limits. Choose your industry to see the challenges we
              design around, how we approach them and the equipment we supply.
            </p>
          </div>

          {industries.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {industries.map((industry, index) => {
                const teaser = teaserFor(industry);

                return (
                  <Link
                    key={industry.slug || industry.id || index}
                    to={`/industries/${industry.slug}`}
                    className="group flex flex-col bg-white border border-gray-200 overflow-hidden hover:border-[#F4C542] transition duration-300"
                  >
                    {industry.image && (
                      <div className="overflow-hidden">
                        <img
                          src={industry.image}
                          alt={industry.name}
                          className="w-full h-52 object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      </div>
                    )}

                    <div className="flex flex-col flex-1 p-6">
                      <h3 className="text-[18px] font-semibold text-[#1c1f26] mb-3 group-hover:text-[#F4C542] transition">
                        {industry.name}
                      </h3>

                      {teaser && (
                        <p className="text-[14px] text-gray-600 leading-relaxed mb-5">
                          {teaser}
                        </p>
                      )}

                      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold tracking-wide text-[#234B97] group-hover:text-[#F4C542] transition">
                        LEARN MORE
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>

                      <div className="mt-6 h-[2px] w-0 bg-[#F4C542] group-hover:w-full transition-all duration-300" />
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-[15px] text-gray-600 bg-white border border-gray-200 p-6">
              Industry pages are being updated. In the meantime, tell us about
              your plant and our team will point you to the right solution.
            </p>
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />
          <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
            Not Sure Which Fits Your Plant?
          </h2>
          <p className="text-[16px] text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
            Share your process, fuel and capacity requirements and our
            engineering team will recommend a suitable configuration.
          </p>
          <RequestQuoteCta
            className="inline-block bg-[#F4C542] text-[#1c1f26] px-10 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
            onClick={() =>
              trackEvent("quote_request_started", { context: "industries_index" })
            }
          >
            REQUEST A QUOTE
          </RequestQuoteCta>
        </div>
      </section>
    </div>
  );
};

export default Industries;
