import { SupabaseClient } from "@supabase/supabase-js";

/**
 * Uploads a file to Supabase Storage and returns the storage path and public URL on success,
 * error message on failure.
 *
 * @param supabase Supabase client instance
 * @param file File object to upload
 * @param opts { bucket, orgId, assetId, prefix? }
 * @returns Promise<{ storagePath?: string, publicUrl?: string, error?: string }>
 */
export async function uploadImageToSupabase(
  supabase: SupabaseClient,
  file: File,
  opts: {
    bucket: string;
    orgId: string;
    assetId: string;
    prefix?: string; // e.g. "checkin" or "damage"
  }
): Promise<{ storagePath?: string; publicUrl?: string; error?: string }> {
  const safeFileName =
    Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9.]/g, "_").toLowerCase();
  const storagePath = `${opts.orgId}/assets/${opts.assetId}/${
    opts.prefix ? opts.prefix + "/" : ""
  }${safeFileName}`;

  const { error } = await supabase.storage
    .from(opts.bucket)
    .upload(storagePath, file, {
      cacheControl: "3600", // cache for 1hr
      upsert: false,
    });

  if (error) {
    return { error: error.message };
  }

  // Get the public URL after upload
  return { storagePath };
}
