import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { CheckCircle2, Phone } from "lucide-react";
import Seo from "../Components/Seo";
import JsonLd from "../Components/JsonLd";
import Breadcrumbs from "../Components/Breadcrumbs";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import WhatsAppLink from "../Components/WhatsAppLink";
import { getIndustry, getProjects } from "../api/api";
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { SERVICE_PAGES } from "../content/services";
import { trackEvent } from "../utils/analytics";

// A `related_products` entry is a free-text product name typed in the admin
// panel. Where it matches one of the eight service detail pages we link to it;
// anything else renders as plain text rather than a dead link. Matching is
// done on a normalised key so "Non-IBR Steam Boiler", "non ibr steam boiler"
// and the slug itself all resolve to the same page.
const normalise = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

const SERVICE_SLUG_BY_PRODUCT = SERVICE_PAGES.reduce((map, page) => {
  map[normalise(page.product)] = page.slug;
  map[normalise(page.slug)] = page.slug;
  return map;
}, {});

const serviceSlugFor = (productName) => SERVICE_SLUG_BY_PRODUCT[normalise(productName)] || null;

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

// Project rows carry a legacy free-text `industry` label AND, once linked, a
// nested industry object. Read whichever shape actually came back.
const industryLabelOf = (project) =>
  typeof project?.industry === "string" ? project.industry : project?.industry?.name || "";

const IndustryPage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { settings } = useSettings();

  // "loading" until the first response settles, then "ready" or "missing" --
  // keeps the skeleton and the not-found state from fighting over one flag.
  const [status, setStatus] = useState("loading");
  const [industry, setIndustry] = useState(null);
  const [projects, setProjects] = useState([]);

  const phone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(phone).replace(/\s+/g, "")}`;

  useEffect(() => {
    let active = true;

    setStatus("loading");
    setIndustry(null);
    setProjects([]);

    getIndustry(slug)
      .then((data) => {
        if (!active) return;
        if (data) {
          setIndustry(data);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (active) setStatus("missing");
      });

    // Related case studies are strictly additive -- a failure here leaves the
    // section unrendered rather than blocking the page.
    getProjects({ industry: slug })
      .then((data) => {
        if (active && Array.isArray(data)) setProjects(data.slice(0, 3));
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="bg-[#f5f5f5]">
        <div className="h-[200px] md:h-[300px] bg-[#e9e9e9] animate-pulse" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
          <div className="w-12 h-[3px] bg-[#F4C542]" />
          <div className="h-8 w-2/3 bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-full bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-11/12 bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-9/12 bg-[#e9e9e9] animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "missing" || !industry) {
    return (
      <section className="min-h-[80vh] flex items-center justify-center bg-[#1c1f26] text-white px-4">
        <Seo
          title="Industry Not Found"
          description="The industry page you are looking for is unavailable."
          path={`/industries/${slug}`}
          noindex
        />
        <div className="text-center max-w-xl">
          <img
            src="/assets/404.jpg"
            alt="Industry Not Found"
            className="w-64 sm:w-80 mx-auto mb-8 opacity-90"
          />

          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />

          <h1 className="text-[28px] sm:text-[36px] font-semibold mb-4">
            Industry Not Found
          </h1>

          <p className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed">
            The industry page you are looking for might have been removed,
            renamed, or is temporarily unavailable.
          </p>

          <Link
            to="/industries"
            className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-3 text-sm font-semibold hover:bg-[#e0b837] transition"
          >
            BACK TO INDUSTRIES
          </Link>
        </div>
      </section>
    );
  }

  const heading = industry.hero_heading || industry.name;
  const overview = asList(industry.overview);
  const challenges = asList(industry.challenges);
  const solutions = asList(industry.solutions);
  const applications = asList(industry.applications);
  const relatedProducts = asList(industry.related_products);

  const description =
    industry.meta_description || industry.hero_subheading || overview[0] || SITE.description;

  // Breadcrumbs emits its own BreadcrumbList block, so this only adds the
  // page-level node. Nothing here is claimed beyond what the admin entered.
  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: heading,
    serviceType: industry.name,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: "IN",
    description,
    ...(industry.image ? { image: industry.image } : {}),
  };

  return (
    <div>
      <Seo
        title={industry.meta_title || `${industry.name} Industry Solutions`}
        description={description}
        path={`/industries/${industry.slug || slug}`}
        image={industry.image}
      />
      <JsonLd data={serviceSchema} />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: "Home", path: "/" },
              { label: "Industries", path: "/industries" },
              { label: industry.name },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="relative h-[260px] md:h-[360px] flex items-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center bg-[#1c1f26]"
          style={industry.image ? { backgroundImage: `url('${industry.image}')` } : undefined}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">{heading}</h1>
          {industry.hero_subheading && (
            <p className="mt-4 max-w-2xl text-[15px] sm:text-[17px] text-gray-200 leading-relaxed">
              {industry.hero_subheading}
            </p>
          )}
        </div>
      </section>

      {/* Overview */}
      {overview.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Overview
            </h2>
            <div className="space-y-4">
              {overview.map((paragraph, idx) => (
                <p key={idx} className="text-[15px] text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Challenges */}
      {challenges.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Challenges in {industry.name}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {challenges.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-white border border-gray-200 p-4"
                >
                  <div className="w-[6px] h-[6px] bg-[#F4C542] mt-2 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* How We Help */}
      {solutions.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              How We Help
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {solutions.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-[#F4C542] flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-[14px] text-gray-700 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Applications */}
      {applications.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Applications
            </h2>
            <div className="flex flex-wrap gap-3">
              {applications.map((item, idx) => (
                <span
                  key={idx}
                  className="bg-white border border-gray-200 text-[13px] text-[#1c1f26] px-4 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Products -- linked to the matching service page where one exists */}
      {relatedProducts.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Related Products
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {relatedProducts.map((product, idx) => {
                const serviceSlug = serviceSlugFor(product);
                const base =
                  "block border border-gray-200 px-5 py-4 text-[14px] font-medium text-[#1c1f26]";

                return serviceSlug ? (
                  <Link
                    key={idx}
                    to={`/${serviceSlug}`}
                    className={`${base} bg-[#f5f5f5] hover:border-[#F4C542] hover:text-[#234B97] transition`}
                  >
                    {product}
                  </Link>
                ) : (
                  <span key={idx} className={`${base} bg-[#f5f5f5]`}>
                    {product}
                  </span>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Related Projects -- silent no-render when the industry has none yet */}
      {projects.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Related Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {projects.map((project, idx) => {
                const label = industryLabelOf(project);

                return (
                  <Link
                    key={project.id ?? idx}
                    to={`/projects/${project.slug || project.id}`}
                    className="group block bg-white border border-gray-200 overflow-hidden hover:border-[#F4C542] transition duration-300"
                  >
                    {project.image && (
                      <img
                        src={project.image}
                        alt={project.title || "Project"}
                        className="w-full h-44 object-cover transition duration-500 group-hover:scale-105"
                        loading="lazy"
                      />
                    )}
                    <div className="p-5">
                      {label && (
                        <p className="text-[11px] font-medium text-[#F4C542] uppercase tracking-wide mb-1">
                          {label}
                        </p>
                      )}
                      <h3 className="text-[16px] font-semibold text-[#1c1f26] group-hover:text-[#F4C542] transition">
                        {project.title}
                      </h3>
                      {project.location && (
                        <p className="mt-2 text-[13px] text-gray-500">{project.location}</p>
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />
          <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
            Discuss Your {industry.name} Requirement
          </h2>
          <p className="text-gray-300 text-[16px] leading-relaxed mb-10 max-w-2xl mx-auto">
            Share your plant details with A K Engineering and our team will come
            back with a tailored proposal.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <RequestQuoteCta
              className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
              onClick={() =>
                trackEvent("quote_request_started", {
                  context: "industry_page",
                  industry: industry.slug || slug,
                })
              }
            >
              REQUEST A QUOTE
            </RequestQuoteCta>

            <WhatsAppLink
              context="industry_page"
              text={`Hi, I'd like to discuss a requirement for the ${industry.name} industry`}
              className="inline-flex items-center gap-2 border border-[#F4C542] text-[#F4C542] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#F4C542] hover:text-[#1c1f26] transition"
            />

            <a
              href={telHref}
              onClick={() =>
                trackEvent("phone_click", {
                  context: "industry_page",
                  path: location.pathname,
                })
              }
              className="inline-flex items-center gap-2 text-white text-sm font-medium underline underline-offset-4 hover:text-[#F4C542] transition"
            >
              <Phone size={16} aria-hidden="true" />
              {phone}
            </a>
          </div>
        </div>
      </section>
    </div>
  );
};

export default IndustryPage;
