import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getIndustries } from "../api/api";

// Compact "industries we serve" strip for the homepage. Deliberately a slim
// link band rather than another full card section -- the home page already
// carries several heavy sections, and the job here is internal linking into
// the industry landing pages, not another visual centrepiece.
//
// Renders nothing at all when the API is unreachable or returns no published
// industries (same contract as the other API-backed sections on this site), so
// a build-time prerender snapshot never freezes an empty heading into the HTML.
const IndustriesStrip = () => {
  const [industries, setIndustries] = useState([]);

  useEffect(() => {
    let active = true;
    getIndustries()
      .then((data) => {
        if (active && Array.isArray(data)) setIndustries(data);
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (industries.length === 0) return null;

  return (
    <section className="py-14 bg-white border-t border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26]">
              Industries We Serve
            </h2>
          </div>
          <Link
            to="/industries"
            className="text-sm font-semibold text-[#1c1f26] underline underline-offset-4 hover:text-[#F4C542] transition"
          >
            View all industries
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {industries.map((industry) => (
            <Link
              key={industry.slug}
              to={`/industries/${industry.slug}`}
              className="group flex items-center justify-center bg-white border border-gray-200 px-4 py-4 text-center text-[13px] font-medium text-[#1c1f26] transition hover:border-[#F4C542] hover:bg-[#F4C542]/10"
            >
              {industry.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default IndustriesStrip;
