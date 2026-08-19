import { ChevronLeft, ChevronRight } from "lucide-react";

// Page numbers to show around the current one. The old version rendered EVERY
// page as a button, so a list with 40 pages drew 40 buttons across the footer.
const WINDOW = 1;

/** [1, "...", 4, 5, 6, "...", 20] — always keeps the first and last page. */
const pageItems = (currentPage, totalPages) => {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages = new Set([1, totalPages]);
  for (let p = currentPage - WINDOW; p <= currentPage + WINDOW; p += 1) {
    if (p > 1 && p < totalPages) pages.add(p);
  }

  const sorted = [...pages].sort((a, b) => a - b);
  const items = [];
  sorted.forEach((page, index) => {
    if (index > 0 && page - sorted[index - 1] > 1) items.push(`gap-${page}`);
    items.push(page);
  });
  return items;
};

function Pagination({ currentPage, totalPages, onPageChange }) {
  // Nothing to paginate through — don't draw a control that can't do anything.
  if (!totalPages || totalPages <= 1) return null;

  const arrow =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-600 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40";

  return (
    <nav
      aria-label="Pagination"
      className="mt-5 flex flex-wrap items-center justify-center gap-1.5 border-t border-gray-100 pt-4"
    >
      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pageItems(currentPage, totalPages).map((item) =>
        typeof item === "number" ? (
          <button
            key={item}
            type="button"
            onClick={() => onPageChange(item)}
            aria-current={currentPage === item ? "page" : undefined}
            className={`h-9 min-w-9 rounded-lg px-2.5 text-sm font-medium transition ${
              currentPage === item
                ? "bg-indigo-600 text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50"
            }`}
          >
            {item}
          </button>
        ) : (
          <span key={item} className="px-1 text-sm text-gray-400">
            &hellip;
          </span>
        )
      )}

      <button
        type="button"
        className={arrow}
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}

export default Pagination;
