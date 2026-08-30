export type CustomerFile = {
  id: string;
  created_at: string;
  customer_id: string;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  size_bytes: number | null;
};

// UI-only shape after attaching a signed URL for display.
export type CustomerFileWithUrl = CustomerFile & { signedUrl: string | null };
