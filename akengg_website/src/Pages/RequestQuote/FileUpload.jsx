import { useRef, useState } from "react";
import { Upload, Paperclip, X } from "lucide-react";
import { useToast } from "../../Components/Toast/ToastProvider";
import { trackEvent } from "../../utils/analytics";
import { FILE_RULES } from "../../config/quoteFormConfig";

const fileExt = (name = "") => {
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx).toLowerCase() : "";
};

const formatSize = (bytes) => {
  if (!Number.isFinite(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

// Section 4 of the quote form: drag-and-drop + traditional file picker,
// validated client-side against FILE_RULES before anything is added to
// state (validateQuote.js re-checks the same rules defensively at submit
// time, so this is a UX nicety, not the only line of defense).
const FileUpload = ({ files = [], onChange, errors = {} }) => {
  const inputRef = useRef(null);
  const [dragActive, setDragActive] = useState(false);
  const toast = useToast();

  const maxBytes = FILE_RULES.maxSizeMB * 1024 * 1024;

  const addFiles = (incoming) => {
    const incomingArr = Array.from(incoming || []);
    if (!incomingArr.length) return;

    const next = [...files];
    let addedCount = 0;

    incomingArr.forEach((file) => {
      const ext = fileExt(file.name);

      if (!FILE_RULES.accept.includes(ext)) {
        toast.error(`"${file.name}" is not an accepted file type.`);
        return;
      }
      if (file.size > maxBytes) {
        toast.error(`"${file.name}" exceeds the ${FILE_RULES.maxSizeMB}MB per-file limit.`);
        return;
      }

      const isDuplicate = next.some((f) => f.name === file.name && f.size === file.size);
      if (isDuplicate) return; // already attached — skip silently

      if (next.length >= FILE_RULES.maxFiles) {
        toast.error(`You can attach up to ${FILE_RULES.maxFiles} files.`);
        return;
      }

      next.push(file);
      addedCount += 1;
    });

    if (addedCount > 0) {
      onChange(next);
      trackEvent("file_upload", { file_count: next.length });
    }
  };

  const handleInputChange = (e) => {
    addFiles(e.target.files);
    // Reset so selecting the same file again after removing it still fires onChange.
    e.target.value = "";
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);
    addFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (index) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div id="field-files">
      <label className="block text-sm font-medium text-[#1c1f26] mb-1.5">
        Attachments <span className="font-normal text-gray-400">(optional)</span>
      </label>

      <div
        role="button"
        tabIndex={0}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`cursor-pointer border-2 border-dashed px-6 py-8 text-center transition ${
          dragActive ? "border-[#F4C542] bg-[#F4C542]/10" : "border-gray-300 bg-[#f5f5f5]"
        }`}
      >
        <Upload className="mx-auto mb-2 text-gray-400" size={26} aria-hidden="true" />
        <p className="text-sm text-gray-600">
          Drag & drop files here, or{" "}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
            className="font-semibold text-[#1c1f26] underline underline-offset-2"
          >
            Choose Files
          </button>
        </p>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FILE_RULES.accept.join(",")}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>

      <p className="mt-2 text-xs text-gray-500">
        Accepted: {FILE_RULES.accept.join(", ")} • Up to {FILE_RULES.maxSizeMB}MB each • Max{" "}
        {FILE_RULES.maxFiles} files
      </p>

      {errors.files && <p className="mt-1 text-xs text-red-600">{errors.files}</p>}

      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between gap-3 border border-gray-200 bg-white px-3 py-2 text-sm"
            >
              <span className="flex min-w-0 items-center gap-2">
                <Paperclip size={14} className="shrink-0 text-gray-400" aria-hidden="true" />
                <span className="truncate text-[#1c1f26]" title={file.name}>
                  {file.name}
                </span>
                <span className="shrink-0 text-xs text-gray-400">{formatSize(file.size)}</span>
              </span>

              <button
                type="button"
                onClick={() => removeFile(index)}
                aria-label={`Remove ${file.name}`}
                className="shrink-0 text-gray-400 transition hover:text-red-500"
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default FileUpload;
