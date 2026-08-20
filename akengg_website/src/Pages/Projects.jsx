import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight } from "lucide-react";
import { getProjects, getIndustryStats, getIndustries } from "../api/api";
import Seo from "../Components/Seo";
import Breadcrumbs from "../Components/Breadcrumbs";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import { trackEvent } from "../utils/analytics";

// NOTE: there is deliberately no hardcoded fallback list of projects. Every
// project card is a claim about work actually delivered, so inventing one for
// the API-down/prerender path would ship fabricated case studies (with dead
// /projects/:slug links). When the API returns nothing the section shows a
// short generic note instead — the rest of the page still renders in full.
const FALLBACK_INDUSTRY_STATS = [
  { name: "Pharmaceutical", count: 8, color: "bg-blue-500" },
  { name: "Chemical", count: 12, color: "bg-green-500" },
  { name: "Food & Beverage", count: 6, color: "bg-orange-500" },
  { name: "Textiles", count: 9, color: "bg-purple-500" },
  { name: "Automotive", count: 5, color: "bg-red-500" },
  { name: "Power Generation", count: 4, color: "bg-yellow-500" },
];

const ALL = "all";

const normalise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

// A project row carries a legacy free-text `industry` label and, once linked to
// an industry record, either a nested industry object or `industry_id`.
const industryLabelOf = (project) =>
  typeof project?.industry === "string" ? project.industry : project?.industry?.name || "";

const industrySlugOf = (project) =>
  typeof project?.industry === "object" ? project.industry?.slug || null : null;

// Client-side filter match: by linked id or slug where the API gives us one,
// otherwise by the legacy label text.
const matchesIndustry = (project, filter) => {
  if (filter.id != null && project.industry_id === filter.id) return true;
  if (filter.slug && industrySlugOf(project) === filter.slug) return true;
  return normalise(industryLabelOf(project)) === normalise(filter.label);
};

const formatCompleted = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

const Projects = () => {
  const [projects, setProjects] = useState([]);
  const [industries, setIndustries] = useState([]);
  const [industryStats, setIndustryStats] = useState(FALLBACK_INDUSTRY_STATS);
  const [activeFilter, setActiveFilter] = useState(ALL);

  useEffect(() => {
    getProjects()
      .then((d) => {
        if (Array.isArray(d)) setProjects(d);
      })
      .catch(() => {});

    // Powers the filter chips. A failure here just means the chips fall back to
    // the distinct labels present on the projects themselves.
    getIndustries()
      .then((d) => {
        if (Array.isArray(d) && d.length) setIndustries(d);
      })
      .catch(() => {});

    getIndustryStats()
      .then((d) => {
        if (Array.isArray(d) && d.length)
          setIndustryStats(
            d.map((row, i) => ({
              ...row,
              color: row?.color || FALLBACK_INDUSTRY_STATS[i]?.color,
            }))
          );
      })
      .catch(() => {});
  }, []);

  // Prefer the real industry records (they carry the slug we link to); fall back
  // to the distinct legacy labels on the returned projects. Either way only
  // industries that actually have a project are offered as a filter.
  const filters = (
    industries.length
      ? industries.map((industry) => ({
          key: industry.slug || normalise(industry.name),
          label: industry.name,
          slug: industry.slug || null,
          id: industry.id ?? null,
        }))
      : [
          ...new Map(
            projects
              .map((project) => industryLabelOf(project))
              .filter(Boolean)
              .map((label) => [normalise(label), label])
          ).values(),
        ].map((label) => ({
          key: normalise(label),
          label,
          slug: null,
          id: null,
        }))
  ).filter((filter) => projects.some((project) => matchesIndustry(project, filter)));

  const active = filters.find((filter) => filter.key === activeFilter) || null;
  const visibleProjects = active
    ? projects.filter((project) => matchesIndustry(project, active))
    : projects;

  return (
    <div className="">
      <Seo
        title="Projects & Case Studies"
        description="Industrial case studies from A K Engineering — boiler systems, piping, fabrication and pollution-control projects across pharmaceutical, chemical, food, textile, power and automotive plants."
        path="/projects"
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
            Our Projects
          </h1>
        </div>
      </section>

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs items={[{ label: "Home", path: "/" }, { label: "Projects" }]} />
        </div>
      </div>

      {/* Industry Stats */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-16">
            <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-4"></div>

            <h2 className="text-[32px] sm:text-[40px] font-semibold text-[#1c1f26] mb-4">
              Industries We Serve
            </h2>

            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
              Delivering reliable engineering solutions tailored for diverse
              industrial sectors.
            </p>
          </div>

          {/* Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
            {industryStats.map((industry, index) => (
              <div
                key={index}
                className="group bg-white border border-gray-200 p-6 text-center hover:border-[#F4C542] transition duration-300"
              >
                {/* Count */}
                <div className="text-[28px] font-semibold text-[#1c1f26] mb-2 group-hover:text-[#F4C542] transition">
                  {industry.count}+
                </div>

                {/* Industry Name */}
                <p className="text-[14px] font-medium text-[#1c1f26] mb-1">
                  {industry.name}
                </p>

                {/* Label */}
                <p className="text-[12px] text-gray-500">Projects Delivered</p>

                {/* Bottom Accent */}
                <div className="mt-4 h-[2px] w-0 bg-[#F4C542] group-hover:w-full transition-all duration-300 mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Case Studies */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-12">
            <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-4"></div>

            <h2 className="text-[32px] sm:text-[40px] font-semibold text-[#1c1f26] mb-4">
              Project Case Studies
            </h2>

            <p className="text-[15px] text-gray-600 max-w-2xl mx-auto">
              The requirement, the engineering behind it and how each system was
              delivered — read the full story of the work we have executed.
            </p>
          </div>

          {/* Industry filter — each chip filters the cards below and links
              through to that industry's landing page. */}
          {filters.length > 0 && (
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <button
                type="button"
                onClick={() => setActiveFilter(ALL)}
                aria-pressed={activeFilter === ALL}
                className={`px-5 py-2 text-[13px] font-medium border transition ${
                  activeFilter === ALL
                    ? "bg-[#1c1f26] text-white border-[#1c1f26]"
                    : "bg-white text-[#1c1f26] border-gray-200 hover:border-[#F4C542]"
                }`}
              >
                All Projects
              </button>

              {filters.map((filter) => {
                const isActive = filter.key === activeFilter;

                return (
                  <span
                    key={filter.key}
                    className={`inline-flex items-stretch border transition ${
                      isActive
                        ? "bg-[#1c1f26] border-[#1c1f26]"
                        : "bg-white border-gray-200 hover:border-[#F4C542]"
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFilter(filter.key)}
                      aria-pressed={isActive}
                      className={`px-5 py-2 text-[13px] font-medium transition ${
                        isActive ? "text-white" : "text-[#1c1f26]"
                      }`}
                    >
                      {filter.label}
                    </button>

                    {filter.slug && (
                      <Link
                        to={`/industries/${filter.slug}`}
                        aria-label={`Open the ${filter.label} industry page`}
                        title={`${filter.label} industry page`}
                        className={`flex items-center px-2 border-l transition ${
                          isActive
                            ? "border-gray-700 text-[#F4C542]"
                            : "border-gray-200 text-[#234B97] hover:text-[#F4C542]"
                        }`}
                      >
                        <ArrowUpRight size={15} aria-hidden="true" />
                      </Link>
                    )}
                  </span>
                );
              })}
            </div>
          )}

          {/* Grid */}
          {visibleProjects.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {visibleProjects.map((project, index) => {
                const label = industryLabelOf(project);
                const completed = formatCompleted(project.completed_on);
                const meta = [project.location, project.capacity].filter(Boolean);

                return (
                  <Link
                    key={project.id ?? index}
                    to={`/projects/${project.slug || project.id}`}
                    className="group flex flex-col bg-white border border-gray-200 overflow-hidden hover:border-[#F4C542] transition duration-300"
                  >
                    {/* Image */}
                    {project.image && (
                      <div className="relative overflow-hidden">
                        <img
                          src={project.image}
                          alt={project.title}
                          className="w-full h-52 object-cover transition duration-500 group-hover:scale-105"
                          loading="lazy"
                        />

                        {/* Industry Tag */}
                        {label && (
                          <div className="absolute top-4 left-4 bg-[#1c1f26] text-[#F4C542] text-xs px-3 py-1 font-medium">
                            {label}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Content */}
                    <div className="flex flex-col flex-1 p-6">
                      {/* Title */}
                      <h3 className="text-[18px] font-semibold text-[#1c1f26] mb-2 group-hover:text-[#F4C542] transition">
                        {project.title}
                      </h3>

                      {/* Meta */}
                      {(meta.length > 0 || completed) && (
                        <p className="text-[13px] text-gray-500 mb-3">
                          {[...meta, completed].filter(Boolean).join(" • ")}
                        </p>
                      )}

                      {/* Description */}
                      {project.description && (
                        <p className="text-[14px] text-gray-600 leading-relaxed mb-5 line-clamp-2">
                          {project.description}
                        </p>
                      )}

                      <span className="mt-auto inline-flex items-center gap-1 text-[13px] font-semibold tracking-wide text-[#234B97] group-hover:text-[#F4C542] transition">
                        READ CASE STUDY
                        <ArrowUpRight size={16} aria-hidden="true" />
                      </span>

                      {/* Bottom Accent Line */}
                      <div className="mt-6 h-[2px] w-0 bg-[#F4C542] group-hover:w-full transition-all duration-300"></div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-[15px] text-gray-600 bg-white border border-gray-200 p-6 text-center">
              {projects.length > 0
                ? "No case studies published for this industry yet."
                : "Our project case studies are being published. Tell us about your requirement and we will share relevant references from our work."}
            </p>
          )}
        </div>
      </section>

      {/* Custom Solutions */}
      <section className="py-20 bg-[#f5f5f5]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            {/* LEFT CONTENT */}
            <div>
              {/* Accent Line */}
              <div className="w-12 h-[3px] bg-[#F4C542] mb-4"></div>

              {/* Heading */}
              <h2 className="text-[30px] sm:text-[36px] font-semibold text-[#1c1f26] mb-6">
                Custom Engineering Solutions
              </h2>

              {/* Description */}
              <p className="text-[15px] text-gray-700 mb-8 leading-relaxed max-w-xl">
                Every project is unique, and we deliver tailored engineering
                solutions that align with your operational requirements while
                maintaining the highest standards of quality, efficiency, and
                compliance.
              </p>

              {/* Features */}
              <div className="space-y-6">
                {/* Item 1 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    01
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Tailored Design
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Custom-built solutions designed to match your exact
                      industrial and operational needs.
                    </p>
                  </div>
                </div>

                {/* Item 2 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    02
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Quality Assurance
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Strict quality checks and adherence to industry standards
                      to ensure long-term reliability.
                    </p>
                  </div>
                </div>

                {/* Item 3 */}
                <div className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm">
                    03
                  </div>
                  <div>
                    <h4 className="font-semibold text-[#1c1f26] mb-1">
                      Timely Delivery
                    </h4>
                    <p className="text-gray-600 text-[14px]">
                      Efficient project execution ensuring delivery within
                      timelines and budget constraints.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT IMAGE */}
            <div>
              <div className="relative overflow-hidden border border-gray-200">
                <img
                  src="/assets/Custom Engineering.jpg"
                  alt="Custom solutions"
                  className="w-full h-[320px] object-cover transition duration-500 hover:scale-105"
                  loading="lazy"
                />

                {/* Bottom Accent */}
                <div className="absolute bottom-0 left-0 w-full h-[4px] bg-[#F4C542]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
  <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">

    {/* Accent Line */}
    <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6"></div>

    {/* Heading */}
    <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
      Ready to Start Your Project?
    </h2>

    {/* Description */}
    <p className="text-[16px] text-gray-300 leading-relaxed mb-10 max-w-2xl mx-auto">
      Partner with A K Engineering to deliver reliable, high-performance
      industrial solutions tailored to your specific operational requirements.
    </p>

    {/* CTA Button */}
    <RequestQuoteCta
      className="inline-block bg-[#F4C542] text-[#1c1f26] px-10 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
      onClick={() =>
        trackEvent("quote_request_started", { context: "projects_page" })
      }
    >
      REQUEST A QUOTE
    </RequestQuoteCta>

  </div>
</section>
    </div>
  );
};

export default Projects;
