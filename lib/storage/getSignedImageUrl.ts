import { SupabaseClient } from "@supabase/supabase-js";

const DEFAULT_BUCKET = "asset-images";

/** Return a signed (or public) URL for a storage object path. */
export async function getSignedImageUrl(
  supabase: SupabaseClient,
  storagePath: string,
  opts?: { bucket?: string; expiresIn?: number; public?: boolean },
): Promise<string | undefined> {
  if (!storagePath) return undefined;
  const bucket = opts?.bucket ?? DEFAULT_BUCKET;

  if (opts?.public) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(storagePath);
    return data.publicUrl;
  }

  const expiresIn = opts?.expiresIn ?? 3600; // 1h
  const { data, error } = await supabase.storage
    .from(bucket)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    console.error("Error generating signed URL:", error);
    return undefined;
  }
  return data?.signedUrl;
}

export async function getSignedImageUrls(
  supabase: SupabaseClient,
  storagePaths: string[],
  opts?: { bucket?: string; expiresIn?: number; public?: boolean },
): Promise<(string | undefined)[]> {
  return Promise.all(
    storagePaths.map((p) => getSignedImageUrl(supabase, p, opts)),
  );
}
