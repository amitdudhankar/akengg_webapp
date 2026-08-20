import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { CheckCircle2, Phone } from "lucide-react";
import Seo from "../Components/Seo";
import JsonLd from "../Components/JsonLd";
import Breadcrumbs from "../Components/Breadcrumbs";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import WhatsAppLink from "../Components/WhatsAppLink";
import { getProjects, getIndustries } from "../api/api";
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { trackEvent } from "../utils/analytics";
import { isPlaceholder } from "../content/services/placeholder";

// Shared template for every /content/services/*.js page. One template, one
// `page` config prop -- see src/content/services/index.js (SERVICE_PAGES)
// and src/routes.jsx for how each config is wired to a route.
const ServicePage = ({ page }) => {
  const location = useLocation();
  const { settings } = useSettings();
  const [relatedProjects, setRelatedProjects] = useState([]);
  const [industries, setIndustries] = useState([]);

  const phone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(phone).replace(/\s+/g, "")}`;

  // Industry cross-links. Same silent-failure contract as Related Projects:
  // a build-time snapshot with no API reachable simply renders no section.
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

  useEffect(() => {
    if (page.related?.showProjects === false) return;

    let active = true;
    getProjects()
      .then((data) => {
        if (active && Array.isArray(data) && data.length) {
          setRelatedProjects(data.slice(0, 3));
        }
      })
      .catch(() => {
        // Static snapshot / API unreachable -- the section simply renders
        // nothing rather than a spinner or an error state.
      });
    return () => {
      active = false;
    };
  }, [page.related?.showProjects]);

  // Rows whose value is a placeholder are dropped entirely in production so
  // the literal marker text never ships; kept (and badged) in development so
  // it's obvious what still needs a real number from A K Engineering.
  const specRows = (page.specifications || []).filter(
    (row) => !(isPlaceholder(row.value) && import.meta.env.PROD)
  );

  const serviceSchema = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: page.hero.heading,
    provider: { "@id": `${SITE.url}/#organization` },
    areaServed: "IN",
    description: page.meta.description,
  };

  const faqSchema = page.faqs?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: page.faqs.map((faq) => ({
          "@type": "Question",
          name: faq.question,
          acceptedAnswer: { "@type": "Answer", text: faq.answer },
        })),
      }
    : null;

  const handleCallClick = () => {
    trackEvent("phone_click", { context: "service_page", path: location.pathname });
  };

  return (
    <div>
      <Seo title={page.meta.title} description={page.meta.description} path={`/${page.slug}`} />
      <JsonLd data={serviceSchema} />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: "Home", path: "/" },
              { label: "Services", path: "/services" },
              { label: page.hero.heading },
            ]}
          />
        </div>
      </div>

      {/* Hero Section */}
      <section className="relative h-[260px] md:h-[360px] flex items-center text-white">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url('${page.hero.image}')` }}
        />
        <div className="absolute inset-0 bg-black/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-light">{page.hero.heading}</h1>
          {page.hero.subheading && (
            <p className="mt-4 max-w-2xl text-[15px] sm:text-[17px] text-gray-200 leading-relaxed">
              {page.hero.subheading}
            </p>
          )}
        </div>
      </section>

      {/* What We Provide */}
      {page.whatWeProvide?.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              What We Provide
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {page.whatWeProvide.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-white border border-gray-200 p-4"
                >
                  <div className="w-[6px] h-[6px] bg-[#F4C542] mt-2 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Overview */}
      {page.overview?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Overview
            </h2>
            <div className="space-y-4">
              {page.overview.map((paragraph, idx) => (
                <p key={idx} className="text-[15px] text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Specifications */}
      {specRows.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Specifications
            </h2>
            <dl className="bg-white border border-gray-200 divide-y divide-gray-200">
              {specRows.map((row, idx) => {
                const needsVerification = isPlaceholder(row.value);
                return (
                  <div
                    key={idx}
                    className="grid grid-cols-1 sm:grid-cols-2 gap-1 sm:gap-4 px-5 py-4"
                  >
                    <dt className="text-[14px] font-medium text-[#1c1f26]">{row.label}</dt>
                    <dd className="text-[14px] text-gray-700">
                      {needsVerification ? (
                        <span className="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold px-2.5 py-0.5 uppercase tracking-wide">
                          Needs Verification
                        </span>
                      ) : (
                        row.value
                      )}
                    </dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </section>
      )}

      {/* Applications */}
      {page.applications?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Applications
            </h2>
            <div className="flex flex-wrap gap-3">
              {page.applications.map((item, idx) => (
                <span
                  key={idx}
                  className="bg-[#f5f5f5] border border-gray-200 text-[13px] text-[#1c1f26] px-4 py-2"
                >
                  {item}
                </span>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Industries Served */}
      {page.industries?.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Industries Served
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
              {page.industries.map((industry, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-gray-200 text-center px-4 py-5 text-[13px] font-medium text-[#1c1f26] hover:border-[#F4C542] transition"
                >
                  {industry}
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Benefits */}
      {page.benefits?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Benefits
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {page.benefits.map((benefit, idx) => (
                <div key={idx} className="flex items-start gap-3">
                  <CheckCircle2
                    size={20}
                    className="text-[#F4C542] flex-shrink-0 mt-0.5"
                    aria-hidden="true"
                  />
                  <span className="text-[14px] text-gray-700 leading-relaxed">{benefit}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Engineering / Manufacturing Process */}
      {page.process?.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Engineering & Manufacturing Process
            </h2>
            <div className="space-y-6">
              {page.process.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4">
                  <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm flex-shrink-0">
                    {String(idx + 1).padStart(2, "0")}
                  </div>
                  <div>
                    <h3 className="font-semibold text-[#1c1f26] mb-1">{step.step}</h3>
                    <p className="text-gray-600 text-[14px] leading-relaxed">{step.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Installation & Commissioning */}
      {page.installation?.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Installation & Commissioning
            </h2>
            <div className="space-y-4">
              {page.installation.map((paragraph, idx) => (
                <p key={idx} className="text-[15px] text-gray-700 leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Industries We Serve -- internal links into the industry landing
          pages. Silent no-render when the API is unreachable or empty. */}
      {industries.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-3">
              Industries We Serve
            </h2>
            <p className="text-[15px] text-gray-600 mb-8 max-w-3xl">
              {page.hero?.heading || "Our equipment"} is applied across a range
              of process industries. Explore the requirements specific to yours.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {industries.map((industry) => (
                <Link
                  key={industry.slug}
                  to={`/industries/${industry.slug}`}
                  className="group flex items-center justify-between gap-3 bg-white border border-gray-200 px-4 py-3 text-[13px] font-medium text-[#1c1f26] transition hover:border-[#F4C542] hover:bg-[#F4C542]/10"
                >
                  <span>{industry.name}</span>
                  <span
                    aria-hidden="true"
                    className="text-gray-300 transition group-hover:text-[#F4C542]"
                  >
                    &rarr;
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related Projects -- silent no-render on fetch failure/empty result */}
      {relatedProjects.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Related Projects
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {relatedProjects.map((project, idx) => (
                <Link
                  key={project.id ?? idx}
                  to="/projects"
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
                    {project.industry && (
                      <p className="text-[11px] font-medium text-[#F4C542] uppercase tracking-wide mb-1">
                        {project.industry}
                      </p>
                    )}
                    <h3 className="text-[16px] font-semibold text-[#1c1f26] group-hover:text-[#F4C542] transition">
                      {project.title}
                    </h3>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ -- only when the page has at least one entry */}
      {page.faqs?.length > 0 && (
        <section className="py-16 bg-white">
          {faqSchema && <JsonLd data={faqSchema} />}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {page.faqs.map((faq, idx) => (
                <details
                  key={idx}
                  className="group bg-[#f5f5f5] border border-gray-200 px-5 py-4"
                >
                  <summary className="cursor-pointer list-none flex items-center justify-between gap-4 font-medium text-[#1c1f26]">
                    {faq.question}
                    <span
                      className="text-[#F4C542] text-xl leading-none flex-shrink-0 transition-transform duration-200 group-open:rotate-45"
                      aria-hidden="true"
                    >
                      +
                    </span>
                  </summary>
                  <p className="mt-3 text-[14px] text-gray-700 leading-relaxed">{faq.answer}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Quote CTA */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />
          <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
            Let's Discuss Your {page.hero.heading} Requirement
          </h2>
          <p className="text-gray-300 text-[16px] leading-relaxed mb-10 max-w-2xl mx-auto">
            Share your requirement with A K Engineering and our team will get back to you with a
            tailored quotation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <RequestQuoteCta
              product={page.product}
              className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
              onClick={() =>
                trackEvent("quote_request_started", {
                  context: "service_page",
                  product: page.product,
                })
              }
            >
              REQUEST A QUOTE
            </RequestQuoteCta>

            <WhatsAppLink
              context="service_page"
              text={`Hi, I'd like a quote for ${page.product}`}
              className="inline-flex items-center gap-2 border border-[#F4C542] text-[#F4C542] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#F4C542] hover:text-[#1c1f26] transition"
            />

            <a
              href={telHref}
              onClick={handleCallClick}
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

export default ServicePage;
