import React from "react";

function Pagination({ currentPage, totalPages, onPageChange }) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
      <button
        className="rounded bg-gray-200 px-3 py-2 disabled:opacity-50"
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
      >
        Prev
      </button>

      {Array.from({ length: totalPages }, (_, index) => (
        <button
          key={index + 1}
          onClick={() => onPageChange(index + 1)}
          className={`min-w-10 rounded px-3 py-2 ${
            currentPage === index + 1
              ? "bg-indigo-600 text-white"
              : "bg-gray-200 text-gray-800"
          }`}
        >
          {index + 1}
        </button>
      ))}

      <button
        className="rounded bg-gray-200 px-3 py-2 disabled:opacity-50"
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
      >
        Next
      </button>
    </div>
  );
}

export default Pagination;
