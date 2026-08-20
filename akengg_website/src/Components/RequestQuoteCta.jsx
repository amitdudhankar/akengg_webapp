import { Link } from "react-router-dom";

// Reusable primary CTA that sends visitors to the technical quote form,
// optionally pre-seeding the product select via ?product=. RequestQuote.jsx
// already reads that query param (see searchParams.get("product")), so any
// call site can deep-link straight into the right product without the quote
// page needing to know where the click came from.
const RequestQuoteCta = ({ product, children, className = "", onClick }) => {
  const to = product
    ? `/request-quote?product=${encodeURIComponent(product)}`
    : "/request-quote";

  const handleClick = (event) => {
    onClick?.(event);
  };

  return (
    <Link
      to={to}
      onClick={handleClick}
      className={
        className ||
        "inline-block bg-[#F4C542] text-black px-8 py-3 font-medium text-sm shadow-md hover:opacity-90 transition"
      }
    >
      {children || "Request a Technical Quote"}
    </Link>
  );
};

export default RequestQuoteCta;
