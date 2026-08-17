import { SITE, canonical } from "../config/site";

// Per-page SEO head tags. React 19 natively hoists <title>, <meta> and <link>
// rendered anywhere in the tree up into <head> and de-dupes them — so a page
// just renders <Seo title="..." description="..." path="/services" /> at the
// top of its JSX. No react-helmet needed.
//
// Props:
//   title       page title (suffixed with the site name)
//   description meta description (falls back to the site default)
//   path        route path for the canonical/OG url (default "/")
//   image       absolute social-share image URL (falls back to site default)
//   type        Open Graph type ("website" | "article")
//   noindex     set true to keep a page out of search results
export default function Seo({
  title,
  description,
  path = "/",
  image,
  type = "website",
  noindex = false,
}) {
  const fullTitle = title ? `${title} | ${SITE.name}` : SITE.name;
  const desc = description || SITE.description;
  const url = canonical(path);
  const img = image || SITE.defaultImage;

  return (
    <>
      <title>{fullTitle}</title>
      <meta name="description" content={desc} />
      <link rel="canonical" href={url} />
      {noindex && <meta name="robots" content="noindex, nofollow" />}

      {/* Open Graph */}
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE.name} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={desc} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={img} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={desc} />
      <meta name="twitter:image" content={img} />
    </>
  );
}
