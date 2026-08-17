// src/components/documents/ItemAutocomplete.jsx
// Catalog name field with autocomplete. The user can type free text (lines are
// not required to come from the catalog) — but selecting a catalog match lifts
// the snapshot fields up so the parent line can autofill description, HSN/SAC,
// UQC, default rate, and default GST rate.
//
// API: import { fetchCatalog } from api — added by the main session. Expected
// response shape: res.data.data => array of item_catalog rows.
import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchCatalog } from "../../api/api";

/**
 * @param {Object} props
 * @param {string} props.value                         current free-text name
 * @param {(name:string)=>void} props.onChange         lifts the typed name up
 * @param {(item:object)=>void} props.onSelect         called on catalog pick
 *        with { name, description, hsn_sac, uqc, default_rate, default_gst_rate }
 * @param {boolean} [props.disabled=false]
 * @param {string} [props.placeholder='Item / service name']
 */
export default function ItemAutocomplete({
  value = "",
  onChange,
  onSelect,
  disabled = false,
  placeholder = "Item / service name",
}) {
  const [catalog, setCatalog] = useState([]);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  // Load the catalog once; small dataset → client-side filter (matches the
  // PartyPicker / ServicesList pattern). Failure is non-fatal: free text still
  // works, so we silently keep an empty list.
  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        // Active only + high limit so the picker isn't capped at the backend's
        // default page size of 10 once pagination is honored.
        const res = await fetchCatalog({ is_active: 1, limit: 1000 });
        if (active) setCatalog(res?.data?.data || []);
      } catch {
        if (active) setCatalog([]);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const onDocClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  const matches = useMemo(() => {
    const q = String(value || "").trim().toLowerCase();
    if (!q) return catalog.slice(0, 8);
    return catalog
      .filter((c) =>
        [c.name, c.hsn_sac, c.description]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [catalog, value]);

  const handlePick = (item) => {
    onSelect?.({
      name: item.name || "",
      description: item.description || "",
      hsn_sac: item.hsn_sac || "",
      uqc: item.uqc || "",
      default_rate: item.default_rate ?? 0,
      default_gst_rate: item.default_gst_rate ?? 0,
    });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={value}
        disabled={disabled}
        onChange={(e) => {
          onChange?.(e.target.value);
          if (!open) setOpen(true);
        }}
        onFocus={() => !disabled && setOpen(true)}
        placeholder={placeholder}
        className={`w-full rounded-md border border-gray-300 p-2 text-sm ${
          disabled ? "cursor-not-allowed bg-gray-100" : ""
        }`}
      />

      {open && !disabled && matches.length > 0 ? (
        <ul className="absolute z-30 mt-1 max-h-56 w-full min-w-[16rem] overflow-y-auto rounded-md border border-gray-200 bg-white shadow-lg">
          {matches.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => handlePick(item)}
                className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-indigo-50"
              >
                <span className="text-sm font-medium text-gray-900">
                  {item.name}
                </span>
                <span className="text-xs text-gray-500">
                  {[
                    item.hsn_sac && `HSN/SAC ${item.hsn_sac}`,
                    item.uqc,
                    (item.default_rate ?? null) !== null &&
                      `₹${item.default_rate}`,
                    (item.default_gst_rate ?? null) !== null &&
                      `${item.default_gst_rate}% GST`,
                  ]
                    .filter(Boolean)
                    .join(" · ") || "—"}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
