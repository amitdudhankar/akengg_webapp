import React, { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Images, Trash2, Upload } from "lucide-react";
import { uploadProjectImage, deleteProjectImage } from "../../api/api";
import { useAuth } from "../../context/AuthContext";
import Button from "../ui/Button";
import EmptyState from "../ui/EmptyState";
import IconButton from "../ui/IconButton";
import ConfirmDeleteModal from "../ui/ConfirmDeleteModal";

/**
 * Photo strip for a saved case study. Uploads go one at a time (the API takes a
 * single `image` plus an optional `caption`), and every change calls
 * `onChanged` so the parent re-reads the project and stays the single source of
 * truth for the list — this component keeps no copy of it.
 */
function ProjectGallery({ projectId, images = [], onChanged }) {
  const { user } = useAuth();
  const isAdmin = (user?.role || "").toLowerCase() === "admin";

  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);

  const [selected, setSelected] = useState(null);
  const [isChecked, setIsChecked] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleUpload = async () => {
    if (uploading) return;
    if (!file) {
      toast.error("Choose an image to upload.");
      return;
    }

    setUploading(true);
    const loadingToast = toast.loading("Uploading image...");

    const payload = new FormData();
    payload.append("image", file);
    payload.append("caption", caption);

    try {
      await uploadProjectImage(projectId, payload);
      toast.success("Image added to the gallery.", { id: loadingToast });
      setFile(null);
      setCaption("");
      // Clearing the DOM input too, otherwise re-picking the same file fires
      // no change event and the button looks dead.
      if (fileInputRef.current) fileInputRef.current.value = "";
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload image", {
        id: loadingToast,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (image) => {
    setSelected(image);
    setIsChecked(false);
  };

  const handleDeleteConfirmed = async () => {
    if (!isChecked) {
      toast.error("You must confirm the deletion.");
      return;
    }
    if (!selected?.id) return;

    setDeleting(true);
    const loadingToast = toast.loading("Deleting image...");

    try {
      await deleteProjectImage(projectId, selected.id);
      toast.success("Image deleted.", { id: loadingToast });
      setSelected(null);
      onChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete image", {
        id: loadingToast,
      });
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      {images.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50">
          <EmptyState
            icon={Images}
            title="No gallery images yet"
            message="Upload photos below to build the case-study gallery."
          />
        </div>
      ) : (
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image) => (
            <li
              key={image.id}
              className="rounded-xl border border-gray-100 bg-white p-2 shadow-sm"
            >
              <img
                src={image.image_url}
                alt={image.caption || "Project gallery image"}
                className="h-28 w-full rounded-lg border border-gray-200 object-cover"
              />
              <div className="mt-2 flex items-start justify-between gap-1">
                <p className="min-w-0 wrap-break-word text-xs text-gray-600">
                  {image.caption || <span className="text-gray-300">No caption</span>}
                </p>
                {isAdmin && (
                  <IconButton
                    icon={Trash2}
                    label="Delete image"
                    tone="rose"
                    onClick={() => handleDeleteClick(image)}
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-col gap-3 rounded-xl border border-gray-100 bg-gray-50 p-3 sm:flex-row sm:items-start">
        <div className="w-full">
          <label
            htmlFor="gallery-image"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Add an image
          </label>
          <input
            id="gallery-image"
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files[0] || null)}
            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-600 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <p className="mt-1.5 text-xs text-gray-500">
            Compressed and converted to WebP on upload — large originals are fine.
          </p>
        </div>

        <div className="w-full">
          <label
            htmlFor="gallery-caption"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Caption (optional)
          </label>
          <input
            id="gallery-caption"
            type="text"
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            placeholder="Describe what the photo shows"
            className="w-full rounded-lg border border-gray-200 bg-white p-2 text-sm text-gray-800 shadow-sm transition placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
          />
          <p className="mt-1.5 text-xs text-gray-500">Shown under the photo on the website.</p>
        </div>

        <div className="shrink-0 sm:pt-6">
          <Button icon={Upload} loading={uploading} onClick={handleUpload}>
            Upload
          </Button>
        </div>
      </div>

      <ConfirmDeleteModal
        isOpen={Boolean(selected)}
        onClose={() => setSelected(null)}
        onDelete={handleDeleteConfirmed}
        title="Delete Gallery Image"
        itemName={selected?.caption || "this image"}
        isChecked={isChecked}
        setIsChecked={setIsChecked}
        loading={deleting}
      />
    </div>
  );
}

export default ProjectGallery;
