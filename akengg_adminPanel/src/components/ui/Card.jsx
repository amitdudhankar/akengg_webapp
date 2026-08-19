// The panel shell every page sits in. Matches the dashboard's card language
// (rounded-xl + hairline border + soft shadow) rather than the older
// rounded-lg/shadow-md look, so the whole admin reads as one product.
function Card({ className = "", padded = true, children }) {
  return (
    <div
      className={`rounded-xl border border-gray-100 bg-white shadow-sm ${
        padded ? "p-4 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
