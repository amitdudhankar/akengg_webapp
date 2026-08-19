import { Search } from "lucide-react";

function SearchInput({ value, onChange, placeholder = "Search...", className = "" }) {
  return (
    <div className={`relative w-full sm:w-auto ${className}`}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <input
        type="search"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm text-gray-700 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100 sm:min-w-[240px]"
      />
    </div>
  );
}

export default SearchInput;
