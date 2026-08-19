import { ImageUp } from "lucide-react";

/**
 * File picker + live preview, shared by the blog/service/project/team forms.
 * The note about compression is worth showing: the API re-encodes every upload
 * to WebP, so a large original is fine to pick.
 */
function ImageField({ label = "Image", preview, onChange, hint, isEdit = false }) {
  return (
    <div className="md:col-span-2">
      <label className="mb-1 block text-sm font-medium text-gray-700">
        {label}
        {isEdit && (
          <span className="ml-1 font-normal text-gray-400">
            (leave empty to keep the current one)
          </span>
        )}
      </label>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        {preview ? (
          <img
            src={preview}
            alt="Preview"
            className="h-32 w-44 shrink-0 rounded-lg border border-gray-200 object-cover"
          />
        ) : (
          <div className="grid h-32 w-44 shrink-0 place-items-center rounded-lg border border-dashed border-gray-200 bg-gray-50 text-gray-300">
            <ImageUp className="h-6 w-6" />
          </div>
        )}

        <div className="w-full">
          <input
            type="file"
            accept="image/*"
            onChange={onChange}
            className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-600 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            {hint || "Compressed and converted to WebP on upload — large originals are fine."}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ImageField;
