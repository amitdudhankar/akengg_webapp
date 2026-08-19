// Single icon action for a table row. Used where RowActions' fixed edit/delete
// pair is not enough — e.g. a document row with download / duplicate / email /
// cancel. Always a real <button> with an accessible name.
const TONES = {
  gray: "text-gray-400 hover:bg-gray-100 hover:text-gray-700",
  indigo: "text-gray-400 hover:bg-indigo-50 hover:text-indigo-600",
  emerald: "text-gray-400 hover:bg-emerald-50 hover:text-emerald-600",
  rose: "text-gray-400 hover:bg-rose-50 hover:text-rose-600",
};

function IconButton({ icon: Icon, label, tone = "gray", disabled = false, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={`rounded-lg p-1.5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent ${
        TONES[tone] || TONES.gray
      }`}
    >
      {Icon ? <Icon className="h-4 w-4" /> : null}
    </button>
  );
}

export default IconButton;
