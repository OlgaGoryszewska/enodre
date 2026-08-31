"use client";

import { useRef, useState } from "react";
import { FileText, Loader2, Paperclip, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { addCustomerFileRecord, deleteCustomerFile, updateCustomerFileNote } from "@/app/admin/people/actions";
import type { CustomerFileWithUrl } from "@/lib/customer-file";

const BUCKET = "customer-files";
const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
const SIGNED_URL_TTL_SECONDS = 60 * 60; // just for the optimistic preview

interface CustomerFilesSectionProps {
  customerId: string;
  initialFiles: CustomerFileWithUrl[];
}

function formatSize(bytes: number | null) {
  if (bytes == null) return "";
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-");
}

// Self-contained — saves straight to the server action on blur, no need to
// lift state up since nothing else on the page depends on a file's note.
function FileNoteInput({
  customerId,
  fileId,
  initialNote,
}: {
  customerId: string;
  fileId: string;
  initialNote: string | null;
}) {
  const [value, setValue] = useState(initialNote ?? "");
  const [saving, setSaving] = useState(false);

  async function handleBlur() {
    if (value === (initialNote ?? "")) return;
    setSaving(true);
    try {
      await updateCustomerFileNote(customerId, fileId, value);
    } catch (error) {
      console.error("Failed to save file note:", error);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="relative">
      <input
        type="text"
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onBlur={handleBlur}
        disabled={saving}
        placeholder="What is this file?"
        className="w-full rounded-lg border border-transparent bg-transparent px-1.5 py-1 text-xs text-ink-muted transition placeholder:text-ink-muted/60 hover:border-black/10 focus:border-black/15 focus:bg-background focus:outline-none disabled:opacity-60"
      />
      {saving && (
        <Loader2
          className="absolute right-1.5 top-1/2 h-3 w-3 -translate-y-1/2 animate-spin text-ink-muted"
          aria-hidden="true"
        />
      )}
    </div>
  );
}

export function CustomerFilesSection({ customerId, initialFiles }: CustomerFilesSectionProps) {
  const [files, setFiles] = useState(initialFiles);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    setError(null);

    const oversized = [...fileList].find((file) => file.size > MAX_FILE_SIZE_BYTES);
    if (oversized) {
      setError(`${oversized.name} is over 25MB.`);
      return;
    }

    setUploading(true);
    const supabase = createClient();

    try {
      for (const file of fileList) {
        const storagePath = `${customerId}/${crypto.randomUUID()}-${sanitizeFilename(file.name)}`;

        const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, file);
        if (uploadError) throw uploadError;

        const record = await addCustomerFileRecord(customerId, {
          storagePath,
          originalFilename: file.name,
          mimeType: file.type || null,
          sizeBytes: file.size,
        });

        const { data: signed } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS);

        setFiles((current) => [{ ...record, signedUrl: signed?.signedUrl ?? null }, ...current]);
      }
    } catch (uploadErr) {
      console.error("Failed to upload file:", uploadErr);
      setError("Something went wrong uploading that file.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function handleDelete(fileId: string) {
    const previous = files;
    setDeletingId(fileId);
    setFiles((current) => current.filter((file) => file.id !== fileId));
    try {
      await deleteCustomerFile(customerId, fileId);
    } catch (deleteErr) {
      console.error("Failed to delete file:", deleteErr);
      setFiles(previous);
    } finally {
      setDeletingId(null);
    }
  }

  const imageFiles = files.filter((file) => file.mime_type?.startsWith("image/"));
  const otherFiles = files.filter((file) => !file.mime_type?.startsWith("image/"));

  return (
    <div className="mt-10 rounded-2xl border border-black/10 bg-card p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold tracking-tight">Files</h2>
          <p className="mt-1 text-sm text-ink-muted">Attach images or documents for this person</p>
        </div>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          aria-label="Upload files"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-black/20 text-foreground transition hover:bg-foreground/5 disabled:opacity-50"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
          ) : (
            <Upload className="h-4 w-4" aria-hidden="true" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(event) => handleFilesSelected(event.target.files)}
        />
      </div>

      {error && <p className="mt-3 text-sm text-danger">{error}</p>}

      {files.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">No files yet.</p>
      ) : (
        <>
          {imageFiles.length > 0 && (
            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {imageFiles.map((file) => (
                <div
                  key={file.id}
                  className="group relative overflow-hidden rounded-xl border border-black/10 bg-background"
                >
                  {file.signedUrl ? (
                    <a href={file.signedUrl} target="_blank" rel="noopener noreferrer" title="Open image">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={file.signedUrl} alt={file.original_filename} className="h-28 w-full object-cover" />
                    </a>
                  ) : (
                    <div className="flex h-28 flex-col items-center justify-center gap-2 px-2 text-center">
                      <Paperclip className="h-5 w-5 text-ink-muted" aria-hidden="true" />
                      <span className="line-clamp-2 text-xs text-ink-muted">{file.original_filename}</span>
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 border-t border-black/10 px-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate text-xs text-ink-muted" title={file.original_filename}>
                      {file.original_filename}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      aria-label={`Remove ${file.original_filename}`}
                      className="shrink-0 text-ink-muted transition hover:text-danger disabled:opacity-60"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <div className="border-t border-black/10 px-1">
                    <FileNoteInput customerId={customerId} fileId={file.id} initialNote={file.note} />
                  </div>
                  {file.size_bytes != null && (
                    <span className="pointer-events-none absolute left-1.5 top-1.5 rounded-full bg-foreground/60 px-1.5 py-0.5 text-[10px] font-medium text-background opacity-0 transition group-hover:opacity-100">
                      {formatSize(file.size_bytes)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {otherFiles.length > 0 && (
            <div className="mt-6 divide-y divide-black/10 overflow-hidden rounded-xl border border-black/10">
              {otherFiles.map((file) => (
                <div key={file.id} className="px-3 py-2">
                  <div className="flex items-center gap-3">
                    {file.signedUrl ? (
                      <a
                        href={file.signedUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open file"
                        className="flex min-w-0 flex-1 items-center gap-3 hover:underline"
                      >
                        <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm">{file.original_filename}</span>
                      </a>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <FileText className="h-4 w-4 shrink-0 text-ink-muted" aria-hidden="true" />
                        <span className="min-w-0 flex-1 truncate text-sm">{file.original_filename}</span>
                      </div>
                    )}
                    {file.size_bytes != null && (
                      <span className="shrink-0 text-xs text-ink-muted">{formatSize(file.size_bytes)}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDelete(file.id)}
                      disabled={deletingId === file.id}
                      aria-label={`Remove ${file.original_filename}`}
                      className="shrink-0 text-ink-muted transition hover:text-danger disabled:opacity-60"
                    >
                      {deletingId === file.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                  <div className="pl-7">
                    <FileNoteInput customerId={customerId} fileId={file.id} initialNote={file.note} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
