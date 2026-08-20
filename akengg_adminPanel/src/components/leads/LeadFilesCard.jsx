// Files panel for the lead detail page: lists whatever's already attached
// (drawings, BOQs, spec PDFs, site photos, quotations, ...) with a download
// action per row, plus a multi-file uploader underneath.
//
// Downloads go through the shared axios instance (responseType: "blob") so
// the Bearer auth header attaches, then downloadBlob() (src/utils/leadUtils)
// does the object-URL + synthetic-anchor save under the file's original
// name -- the exact sequence Documents/DocumentsList.jsx uses for PDF/DOCX.
// downloadBlob() is only ever reached once the request has actually
// resolved; any error status is caught below without touching it, so a
// failed request can never trigger a download of its own error body.
import { useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Download, FileText, Paperclip, UploadCloud } from "lucide-react";
import { downloadLeadFile, uploadLeadFiles } from "../../api/api";
import { downloadBlob } from "../../utils/leadUtils";
import { formatDateDisplay } from "../../utils/date";
import Button from "../ui/Button";
import IconButton from "../ui/IconButton";
import EmptyState from "../ui/EmptyState";

const ACCEPT = ".pdf,.png,.jpg,.jpeg,.webp,.xlsx,.xls,.docx";

// Human-readable size (e.g. "482 KB", "3.1 MB") -- nothing in this codebase
// already formats bytes, so this is intentionally the smallest useful helper
// rather than a new shared util for a single caller.
const formatFileSize = (bytes) => {
  const value = Number(bytes);
  if (!Number.isFinite(value) || value < 0) return "";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

function LeadFilesCard({ leadId, files, onFilesChanged }) {
  const fileList = Array.isArray(files) ? files : [];

  const fileInputRef = useRef(null);
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const handleDownload = async (file) => {
    setDownloadingId(file.id);
    const toastId = toast.loading(`Downloading ${file.original_name}...`);
    try {
      const res = await downloadLeadFile(leadId, file.id);
      downloadBlob(res, file.original_name);
      toast.success("Download started", { id: toastId });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to download file", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const handleFileInputChange = (e) => {
    setSelectedFiles(Array.from(e.target.files || []));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0 || uploading) return;

    setUploading(true);
    const toastId = toast.loading(
      `Uploading ${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""}...`
    );
    try {
      const formData = new FormData();
      selectedFiles.forEach((file) => formData.append("files", file));
      await uploadLeadFiles(leadId, formData);
      toast.success("File(s) uploaded", { id: toastId });
      setSelectedFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = "";
      onFilesChanged?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to upload file(s)", {
        id: toastId,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      {fileList.length === 0 ? (
        <EmptyState
          icon={Paperclip}
          title="No files yet"
          message="Upload drawings, BOQs, spec sheets, or other documents for this lead."
        />
      ) : (
        <ul className="divide-y divide-gray-100">
          {fileList.map((file) => (
            <li
              key={file.id}
              className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-gray-50 text-gray-400">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p
                    className="truncate text-sm font-medium text-gray-900"
                    title={file.original_name}
                  >
                    {file.original_name}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500">
                    {formatFileSize(file.size_bytes)}
                    {file.size_bytes != null && file.created_at ? " · " : ""}
                    {formatDateDisplay(file.created_at)}
                  </p>
                </div>
              </div>
              <IconButton
                icon={Download}
                label={`Download ${file.original_name}`}
                tone="indigo"
                disabled={downloadingId === file.id}
                onClick={() => handleDownload(file)}
              />
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 border-t border-gray-100 pt-4">
        <label className="mb-1 block text-sm font-medium text-gray-700">Upload files</label>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ACCEPT}
            onChange={handleFileInputChange}
            className="w-full rounded-lg border border-gray-200 p-2 text-sm text-gray-600 shadow-sm file:mr-3 file:rounded-md file:border-0 file:bg-indigo-50 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
          />
          <Button
            type="button"
            icon={UploadCloud}
            loading={uploading}
            disabled={selectedFiles.length === 0 || uploading}
            onClick={handleUpload}
            className="shrink-0"
          >
            Upload
          </Button>
        </div>
        <p className="mt-1.5 text-xs text-gray-500">
          {selectedFiles.length > 0
            ? `${selectedFiles.length} file${selectedFiles.length > 1 ? "s" : ""} selected`
            : "PDF, PNG, JPG, JPEG, WEBP, XLSX, XLS, DOCX."}
        </p>
      </div>
    </div>
  );
}

export default LeadFilesCard;
