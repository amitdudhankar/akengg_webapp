import { Link } from "react-router-dom";
import JsonLd from "./JsonLd";
import { canonical } from "../config/site";

// Shared breadcrumb trail: emits the BreadcrumbList structured-data block
// search engines expect, plus a small visible trail underneath. `items` is
// ordered root-first; the last entry is treated as the current page (usually
// path-less) and rendered as plain emphasized text instead of a link.
//
// items: [{ label: string, path?: string }, ...]
const Breadcrumbs = ({ items = [] }) => {
  if (!items.length) return null;

  const breadcrumbList = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.label,
      ...(item.path ? { item: canonical(item.path) } : {}),
    })),
  };

  const lastIndex = items.length - 1;

  return (
    <>
      <JsonLd data={breadcrumbList} />

      <nav aria-label="Breadcrumb" className="text-sm">
        <ol className="flex flex-wrap items-center gap-2 text-gray-500">
          {items.map((item, index) => {
            const isLast = index === lastIndex;

            return (
              <li key={`${item.label}-${index}`} className="flex items-center gap-2">
                {index > 0 && <span aria-hidden="true">/</span>}

                {isLast || !item.path ? (
                  <span
                    className={isLast ? "font-medium text-[#1c1f26]" : undefined}
                    aria-current={isLast ? "page" : undefined}
                  >
                    {item.label}
                  </span>
                ) : (
                  <Link to={item.path} className="hover:text-[#234B97] transition">
                    {item.label}
                  </Link>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
};

export default Breadcrumbs;
