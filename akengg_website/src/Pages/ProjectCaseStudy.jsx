import { useEffect, useState } from "react";
import { Link, useParams, useLocation } from "react-router-dom";
import { ArrowUpRight, Phone } from "lucide-react";
import Seo from "../Components/Seo";
import Breadcrumbs from "../Components/Breadcrumbs";
import RequestQuoteCta from "../Components/RequestQuoteCta";
import WhatsAppLink from "../Components/WhatsAppLink";
import { getProject } from "../api/api";
import { useSettings } from "../context/SettingsContext";
import SITE from "../config/site";
import { SERVICE_PAGES } from "../content/services";
import { trackEvent } from "../utils/analytics";

const SERVICE_SLUGS = new Set(SERVICE_PAGES.map((page) => page.slug));

const asList = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const asText = (value) => (typeof value === "string" ? value.trim() : "");
// capacity may arrive as a number ("2" TPH) rather than a string.
const asDisplay = (value) => (typeof value === "number" ? String(value) : asText(value));

// `industry` is a legacy free-text label on older rows and a nested object once
// the project is linked to an industry record -- read whichever came back.
const industryOf = (project) => {
  if (typeof project?.industry === "string") {
    return { name: project.industry, slug: null };
  }
  if (project?.industry && typeof project.industry === "object") {
    return { name: project.industry.name || "", slug: project.industry.slug || null };
  }
  return { name: "", slug: null };
};

const formatCompleted = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
};

// One narrative block (Customer Requirement / Problem / Solution / Result).
// Blank fields never reach this -- the caller checks first -- so an unfilled
// field simply leaves no heading behind.
const NarrativeSection = ({ title, body, background = "bg-white" }) => (
  // max-w-7xl matches every other section on the page so the gold accent bar
  // and heading line up down the left edge; the prose itself is then capped at
  // a comfortable reading measure inside that full-width container.
  <section className={`py-16 ${background}`}>
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
      <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">{title}</h2>
      <div className="space-y-4 max-w-4xl">
        {body
          .split(/\n{2,}/)
          .map((paragraph) => paragraph.trim())
          .filter(Boolean)
          .map((paragraph, idx) => (
            <p key={idx} className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line">
              {paragraph}
            </p>
          ))}
      </div>
    </div>
  </section>
);

const ProjectCaseStudy = () => {
  const { slug } = useParams();
  const location = useLocation();
  const { settings } = useSettings();

  const [status, setStatus] = useState("loading");
  const [project, setProject] = useState(null);

  const phone = settings?.company_phone || SITE.phone;
  const telHref = `tel:${String(phone).replace(/\s+/g, "")}`;

  useEffect(() => {
    let active = true;

    setStatus("loading");
    setProject(null);

    getProject(slug)
      .then((data) => {
        if (!active) return;
        if (data) {
          setProject(data);
          setStatus("ready");
        } else {
          setStatus("missing");
        }
      })
      .catch(() => {
        if (active) setStatus("missing");
      });

    return () => {
      active = false;
    };
  }, [slug]);

  if (status === "loading") {
    return (
      <div className="bg-[#f5f5f5]">
        <div className="h-[260px] md:h-[360px] bg-[#e9e9e9] animate-pulse" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16 space-y-4">
          <div className="w-12 h-[3px] bg-[#F4C542]" />
          <div className="h-8 w-2/3 bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-full bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-11/12 bg-[#e9e9e9] animate-pulse" />
          <div className="h-4 w-9/12 bg-[#e9e9e9] animate-pulse" />
        </div>
      </div>
    );
  }

  if (status === "missing" || !project) {
    return (
      <section className="min-h-[80vh] flex items-center justify-center bg-[#1c1f26] text-white px-4">
        <Seo
          title="Project Not Found"
          description="The case study you are looking for is unavailable."
          path={`/projects/${slug}`}
          noindex
        />
        <div className="text-center max-w-xl">
          <img
            src="/assets/404.jpg"
            alt="Project Not Found"
            className="w-64 sm:w-80 mx-auto mb-8 opacity-90"
          />

          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />

          <h1 className="text-[28px] sm:text-[36px] font-semibold mb-4">Project Not Found</h1>

          <p className="text-gray-400 text-sm sm:text-base mb-8 leading-relaxed">
            The case study you are looking for might have been removed, renamed,
            or is temporarily unavailable.
          </p>

          <Link
            to="/projects"
            className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-3 text-sm font-semibold hover:bg-[#e0b837] transition"
          >
            BACK TO PROJECTS
          </Link>
        </div>
      </section>
    );
  }

  const industry = industryOf(project);
  const completed = formatCompleted(project.completed_on);
  const description = asText(project.description);

  const requirement = asText(project.customer_requirement);
  const problem = asText(project.problem);
  const solution = asText(project.solution);
  const result = asText(project.result);

  const features = asList(project.features);
  const equipment = asList(project.equipment);
  const gallery = asList(project.images).filter((item) => item && item.image_url);

  // Only the client's own consent flag exposes the name.
  const showClient = Boolean(project.show_client_name) && Boolean(asText(project.client_name));

  const facts = [
    industry.name
      ? {
          label: "Industry",
          value: industry.name,
          // Only linkable once the project is tied to an industry record.
          path: industry.slug ? `/industries/${industry.slug}` : null,
        }
      : null,
    showClient ? { label: "Client", value: project.client_name } : null,
    asText(project.location) ? { label: "Location", value: project.location } : null,
    asDisplay(project.capacity)
      ? { label: "Capacity", value: asDisplay(project.capacity) }
      : null,
    completed ? { label: "Completed", value: completed } : null,
  ].filter(Boolean);

  const scope = [
    { label: "Engineering", value: asText(project.scope_engineering) },
    { label: "Fabrication", value: asText(project.scope_fabrication) },
    { label: "Installation", value: asText(project.scope_installation) },
    { label: "Commissioning", value: asText(project.scope_commissioning) },
  ].filter((item) => item.value);

  // Only link a related service we actually have a page for -- an unknown slug
  // from the admin panel would otherwise become a dead link into the 404.
  const relatedServiceSlug = SERVICE_SLUGS.has(project.related_service_slug)
    ? project.related_service_slug
    : null;
  const relatedService = relatedServiceSlug
    ? SERVICE_PAGES.find((page) => page.slug === relatedServiceSlug)
    : null;

  const metaDescription =
    asText(project.meta_description) ||
    description ||
    `Case study: ${project.title} by A K Engineering.`;

  return (
    <div>
      <Seo
        title={asText(project.meta_title) || project.title}
        description={metaDescription}
        path={`/projects/${project.slug || slug}`}
        image={project.image}
        type="article"
      />

      {/* Breadcrumbs -- also emits the BreadcrumbList structured data */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Breadcrumbs
            items={[
              { label: "Home", path: "/" },
              { label: "Projects", path: "/projects" },
              { label: project.title },
            ]}
          />
        </div>
      </div>

      {/* Hero */}
      <section className="relative min-h-[260px] md:min-h-[360px] flex items-center text-white py-12">
        <div
          className="absolute inset-0 bg-cover bg-center bg-[#1c1f26]"
          style={project.image ? { backgroundImage: `url('${project.image}')` } : undefined}
        />
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
          <p className="text-[12px] font-semibold tracking-[0.2em] text-[#F4C542] uppercase mb-3">
            Case Study
          </p>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-light max-w-4xl">
            {project.title}
          </h1>

          {(industry.name || asText(project.location) || completed) && (
            <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 text-[13px] text-gray-200">
              {industry.name && <span>{industry.name}</span>}
              {industry.name && asText(project.location) && (
                <span aria-hidden="true" className="text-gray-400">
                  |
                </span>
              )}
              {asText(project.location) && <span>{project.location}</span>}
              {(industry.name || asText(project.location)) && completed && (
                <span aria-hidden="true" className="text-gray-400">
                  |
                </span>
              )}
              {completed && <span>Completed {completed}</span>}
            </div>
          )}
        </div>
      </section>

      {/* At a glance */}
      {facts.length > 0 && (
        <section className="py-12 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Individually bordered cards rather than the `gap-px` +
                container-background separator trick: with 3 or 5 facts that
                trick leaves the unfilled grid cells showing as empty grey
                boxes. */}
            <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {facts.map((fact) => (
                <div
                  key={fact.label}
                  className="bg-white border border-gray-200 px-5 py-5"
                >
                  <dt className="text-[11px] font-semibold tracking-wide text-gray-500 uppercase mb-2">
                    {fact.label}
                  </dt>
                  <dd className="text-[15px] font-medium text-[#1c1f26]">
                    {fact.path ? (
                      <Link to={fact.path} className="hover:text-[#234B97] transition">
                        {fact.value}
                      </Link>
                    ) : (
                      fact.value
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </section>
      )}

      {/* Summary + highlights */}
      {(description || features.length > 0) && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-3 gap-10">
            {description && (
              <div className="lg:col-span-2">
                <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
                <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
                  Project Summary
                </h2>
                <p className="text-[15px] text-gray-700 leading-relaxed whitespace-pre-line">
                  {description}
                </p>
              </div>
            )}

            {features.length > 0 && (
              <div className={description ? "" : "lg:col-span-3"}>
                <h3 className="text-[16px] font-semibold text-[#1c1f26] mb-4">Highlights</h3>
                <div className="space-y-3">
                  {features.map((feature, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <div className="w-[6px] h-[6px] bg-[#F4C542] mt-2 flex-shrink-0" />
                      <span className="text-[14px] text-gray-700 leading-relaxed">{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {requirement && (
        <NarrativeSection
          title="Customer Requirement"
          body={requirement}
          background="bg-[#f5f5f5]"
        />
      )}

      {problem && <NarrativeSection title="The Challenge" body={problem} />}

      {solution && (
        <NarrativeSection title="Our Solution" body={solution} background="bg-[#f5f5f5]" />
      )}

      {/* Equipment supplied */}
      {equipment.length > 0 && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Equipment Supplied
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {equipment.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-start gap-3 bg-[#f5f5f5] border border-gray-200 p-4"
                >
                  <div className="w-[6px] h-[6px] bg-[#F4C542] mt-2 flex-shrink-0" />
                  <span className="text-[14px] text-gray-700 leading-relaxed">{item}</span>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Scope of work */}
      {scope.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Scope of Work
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {scope.map((item, idx) => (
                <div key={item.label} className="bg-white border border-gray-200 p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-8 h-8 flex items-center justify-center bg-[#F4C542] text-[#1c1f26] font-bold text-sm flex-shrink-0">
                      {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3 className="text-[16px] font-semibold text-[#1c1f26]">{item.label}</h3>
                  </div>
                  <p className="text-[14px] text-gray-700 leading-relaxed whitespace-pre-line">
                    {item.value}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {result && <NarrativeSection title="Result" body={result} />}

      {/* Gallery */}
      {gallery.length > 0 && (
        <section className="py-16 bg-[#f5f5f5]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-8">
              Project Gallery
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {gallery.map((item, idx) => (
                <figure key={item.id ?? idx} className="bg-white border border-gray-200">
                  <img
                    src={item.image_url}
                    alt={item.caption || `${project.title} photo ${idx + 1}`}
                    className="w-full h-56 object-cover"
                    loading="lazy"
                  />
                  {item.caption && (
                    <figcaption className="px-4 py-3 text-[13px] text-gray-600">
                      {item.caption}
                    </figcaption>
                  )}
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Related service */}
      {relatedService && (
        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="w-12 h-[3px] bg-[#F4C542] mb-4" />
            <h2 className="text-[28px] sm:text-[34px] font-semibold text-[#1c1f26] mb-6">
              Related Service
            </h2>
            <Link
              to={`/${relatedService.slug}`}
              className="group inline-flex items-center justify-between gap-6 bg-[#f5f5f5] border border-gray-200 px-6 py-5 hover:border-[#F4C542] transition"
            >
              <span className="text-[16px] font-semibold text-[#1c1f26] group-hover:text-[#F4C542] transition">
                {relatedService.product}
              </span>
              <ArrowUpRight size={18} className="text-[#234B97]" aria-hidden="true" />
            </Link>
          </div>
        </section>
      )}

      {/* Back to listing */}
      <section className="py-10 bg-[#f5f5f5] border-t border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            to="/projects"
            className="text-[14px] font-medium text-[#234B97] hover:text-[#F4C542] transition"
          >
            &larr; Back to all projects
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-[#1c1f26] text-center text-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="w-16 h-[3px] bg-[#F4C542] mx-auto mb-6" />
          <h2 className="text-[32px] sm:text-[40px] font-semibold mb-6">
            Planning Something Similar?
          </h2>
          <p className="text-gray-300 text-[16px] leading-relaxed mb-10 max-w-2xl mx-auto">
            Share your requirement with A K Engineering and our team will get
            back to you with a tailored quotation.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <RequestQuoteCta
              product={relatedService?.product}
              className="inline-block bg-[#F4C542] text-[#1c1f26] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#e0b837] transition"
              onClick={() =>
                trackEvent("quote_request_started", {
                  context: "project_case_study",
                  project: project.slug || slug,
                })
              }
            >
              REQUEST A QUOTE
            </RequestQuoteCta>

            <WhatsAppLink
              context="project_case_study"
              text={`Hi, I'd like to discuss a project similar to "${project.title}"`}
              className="inline-flex items-center gap-2 border border-[#F4C542] text-[#F4C542] px-8 py-4 text-sm font-semibold tracking-wide hover:bg-[#F4C542] hover:text-[#1c1f26] transition"
            />

            <a
              href={telHref}
              onClick={() =>
                trackEvent("phone_click", {
                  context: "project_case_study",
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

export default ProjectCaseStudy;
