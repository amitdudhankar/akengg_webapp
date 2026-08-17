// src/components/documents/PartyPicker.jsx
// Searchable single-select of parties (clients/vendors) filtered by role.
// On select it lifts the FULL party object upward (incl. billing_state_code,
// which the GST engine needs to derive place of supply) via onChange.
//
// API: import { fetchParties } from api — added by the main session. Expected
// response shape: res.data.data => array of party rows (parties table).
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Search, X, Plus, ChevronDown } from "lucide-react";
import { fetchParties } from "../../api/api";

/**
 * @param {Object} props
 * @param {('client'|'vendor')} props.role        which parties to list
 * @param {string} [props.label='Party']          field label
 * @param {object|null} [props.value]             currently selected party object
 * @param {(party:object|null)=>void} props.onChange  lifts selected party up
 * @param {boolean} [props.disabled=false]        read-only (finalized doc)
 * @param {string} [props.addHref='/parties/add'] "Add new" link target
 */
export default function PartyPicker({
  role = "client",
  label = "Party",
  value = null,
  onChange,
  disabled = false,
  addHref = "/parties/add",
}) {
  const [parties, setParties] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef(null);

  // Load parties once; the dataset is small so client-side filtering is fine
  // and matches the ServicesList pattern.
  useEffect(() => {
    let active = true;
    const load = async () => {
      setLoading(true);
      try {
        // Active only + high limit: the backend defaults to 10 per page, so a
        // bare fetch would silently cap the picker once pagination is honored.
        const res = await fetchParties({ role, is_active: 1, limit: 1000 });
        if (active) setParties(res?.data?.data || []);
      } catch (error) {
        if (active)
          toast.error(
            error?.response?.data?.message || "Failed to load parties"
          );
      } finally {
        if (active) setLoading(false);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [role]);

  // Close the dropdown when clicking outside.
  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return parties;
    return parties.filter((p) =>
      [p.name, p.gstin, p.billing_city, p.email, p.phone]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [parties, search]);

  const handleSelect = (party) => {
    onChange?.(party);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e) => {
    e.stopPropagation();
    onChange?.(null);
  };

  return (
    <div ref={containerRef} className="relative">
      <label className="mb-1 block text-base font-medium text-gray-700">
        {label}
      </label>

      {/* Selected display / trigger */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={`flex w-full items-center justify-between rounded-md border border-gray-300 p-2 text-left ${
          disabled ? "cursor-not-allowed bg-gray-100" : "bg-white"
        }`}
      >
        {value ? (
          <span className="min-w-0 truncate">
            <span className="font-medium text-gray-900">{value.name}</span>
            {value.billing_state ? (
              <span className="text-gray-500">
                {" "}
                · {value.billing_state}
                {value.billing_state_code
                  ? ` (${value.billing_state_code})`
                  : ""}
              </span>
            ) : null}
            {value.gstin ? (
              <span className="text-gray-400"> · {value.gstin}</span>
            ) : null}
          </span>
        ) : (
          <span className="text-gray-400">
            {loading ? "Loading parties..." : `Select ${label.toLowerCase()}...`}
          </span>
        )}

        <span className="ml-2 flex items-center gap-1">
          {value && !disabled ? (
            <X
              className="h-4 w-4 text-gray-400 hover:text-gray-700"
              onClick={handleClear}
            />
          ) : null}
          <ChevronDown className="h-4 w-4 text-gray-400" />
        </span>
      </button>

      {/* Dropdown */}
      {open && !disabled ? (
        <div className="absolute z-30 mt-1 w-full rounded-md border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center gap-2 border-b border-gray-100 p-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              autoFocus
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, GSTIN, city..."
              className="w-full text-sm outline-none"
            />
          </div>

          <ul className="max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-center text-sm text-gray-500">
                No parties found.
              </li>
            ) : (
              filtered.map((party) => (
                <li key={party.id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(party)}
                    className={`flex w-full flex-col items-start px-3 py-2 text-left hover:bg-indigo-50 ${
                      value?.id === party.id ? "bg-indigo-50" : ""
                    }`}
                  >
                    <span className="font-medium text-gray-900">
                      {party.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {[
                        party.billing_city,
                        party.billing_state &&
                          `${party.billing_state}${
                            party.billing_state_code
                              ? ` (${party.billing_state_code})`
                              : ""
                          }`,
                        party.gstin,
                      ]
                        .filter(Boolean)
                        .join(" · ") || "—"}
                    </span>
                  </button>
                </li>
              ))
            )}
          </ul>

          <Link
            to={addHref}
            className="flex items-center gap-2 border-t border-gray-100 px-3 py-2 text-sm font-medium text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" />
            Add new {role}
          </Link>
        </div>
      ) : null}
    </div>
  );
}
