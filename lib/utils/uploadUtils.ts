// import { SupabaseClient } from "@supabase/supabase-js";
// import { Side } from "../types";

// const extFrom = (file: File) => {
//   const extFromType = (file.type && file.type.split("/")[1]) || "bin";
//   return extFromType.startsWith("jpeg") ? "jpg" : extFromType;
// };

// // {orgId}/condition-reports/{reportId}/sides/{side}/side-{side}-{size}-{mtime}.{ext}
// export function makeSidePath(
//   orgId: string,
//   reportId: string,
//   side: Side,
//   file: File,
// ) {
//   const ext = extFrom(file);
//   const stableId = `side-${side}-${file.size}-${file.lastModified}`;
//   return `${encodeURIComponent(orgId)}/condition-reports/${encodeURIComponent(
//     reportId,
//   )}/sides/${side}/${stableId}.${ext}`;
// }

// export function makeMarkerPhotoPath(
//   orgId: string,
//   reportId: string,
//   markerId: string,
//   file: File,
// ) {
//   const ext = extFrom(file);
//   const stableId = `marker-${markerId}-${file.size}-${file.lastModified}`;
//   return `${encodeURIComponent(orgId)}/condition-reports/${encodeURIComponent(
//     reportId,
//   )}/markers/${encodeURIComponent(markerId)}/${stableId}.${ext}`;
// }

// export async function uploadToSupabase(
//   supabase: SupabaseClient | null,
//   bucket: string,
//   path: string,
//   file: File,
// ): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
//   if (!supabase) return { ok: false, error: "Supabase not initialised" };
//   if (!file || file.size === 0) return { ok: false, error: "Empty file" };

//   const contentType = file.type || "application/octet-stream";

//   const { data, error } = await supabase.storage
//     .from(bucket)
//     .upload(path, file, {
//       cacheControl: "3600",
//       upsert: true, // safe: filename includes size-mtime
//       contentType,
//     });

//   if (error) {
//     return { ok: false, error: error.message || String(error) };
//   }
//   return { ok: true, path: data.path };
// }

// uploadUtils.ts
import { SupabaseClient } from "@supabase/supabase-js";
import { IMAGE_MAX_BYTES, type Side } from "../types";

// ---------- helpers ----------
function extFromMime(mime?: string) {
  if (!mime) return "bin";
  const m = mime.toLowerCase();
  if (m === "image/jpeg" || m === "image/jpg") return "jpg";
  if (m === "image/png") return "png";
  if (m === "image/webp") return "webp";
  if (m === "image/heic" || m === "image/heif" || m === "image/heic-sequence")
    return "heic";
  return "bin";
}

// Downscale + transcode iPhone photos so they’re well under limits.
// Returns a Blob you should use for both naming AND upload.
export async function normalizeImage(
  file: File,
  opts: {
    maxSide?: number;
    targetMime?: "image/jpeg" | "image/webp";
    quality?: number;
    maxBytes?: number;
  } = {},
): Promise<{ blob: Blob }> {
  const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const targetMime = opts.targetMime ?? "image/jpeg"; // force JPEG
  const maxBytes = opts.maxBytes ?? IMAGE_MAX_BYTES;

  let maxSide = Math.min(opts.maxSide ?? 1600, isiOS ? 1600 : 1600);
  let quality = Math.min(Math.max(opts.quality ?? 0.8, 0.5), 0.95);

  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = imgUrl;
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      let { width, height } = img;
      if (width > height && width > maxSide) {
        height = Math.round((height / width) * maxSide);
        width = maxSide;
      } else if (height >= width && height > maxSide) {
        width = Math.round((width / height) * maxSide);
        height = maxSide;
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, width);
      canvas.height = Math.max(1, height);
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");
      ctx.drawImage(img, 0, 0, width, height);

      const tryBlob = async () =>
        await new Promise<Blob | null>((resolve) =>
          canvas.toBlob((b) => resolve(b), targetMime, quality),
        );

      let out = await tryBlob();

      // Safari fallback: DataURL → Blob if toBlob returned null
      if (!out) {
        const dataUrl = canvas.toDataURL(targetMime, quality);
        const [meta, b64] = dataUrl.split(",");
        const mime = meta.split(":")[1].split(";")[0];
        const bin = atob(b64);
        const ab = new ArrayBuffer(bin.length);
        const ia = new Uint8Array(ab);
        for (let i = 0; i < bin.length; i++) ia[i] = bin.charCodeAt(i);
        out = new Blob([ab], { type: mime });
      }

      if (out.size <= maxBytes) return { blob: out };

      // tighten: quality first, then dimensions
      if (quality > 0.65) quality = Math.max(0.65, quality - 0.15);
      else maxSide = Math.round(maxSide * 0.75);
    }

    // last-ditch small encode
    const tinySide = Math.max(800, Math.round((opts.maxSide ?? 1600) * 0.5));
    return normalizeImage(file, {
      maxSide: tinySide,
      targetMime,
      quality: 0.7,
      maxBytes,
    });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

// Build paths from the **actual blob** you’re uploading
export function makeSidePathFromBlob(
  orgId: string,
  reportId: string,
  side: Side,
  blob: Blob,
  originalLastModified?: number,
) {
  const ext = extFromMime(blob.type);
  const stableId = `side-${side}-${blob.size}-${originalLastModified ?? Date.now()}`;

  return `${orgId}/condition-reports/${reportId}/sides/${side}/${stableId}.${ext}`;
}

export function makeMarkerPhotoPathFromBlob(
  orgId: string,
  reportId: string,
  markerId: string,
  blob: Blob,
  originalLastModified?: number,
) {
  const ext = extFromMime(blob.type);
  const stableId = `marker-${markerId}-${blob.size}-${originalLastModified ?? Date.now()}`;
  // return `${encodeURIComponent(orgId)}/condition-reports/${encodeURIComponent(
  //   reportId,
  // )}/markers/${encodeURIComponent(markerId)}/${stableId}.${ext}`;
  return `${orgId}/condition-reports/${reportId}/markers/${markerId}/${stableId}.${ext}`;
}

// ---------- direct upload ----------
export async function uploadToSupabase(
  supabase: SupabaseClient | null,
  bucket: string,
  path: string,
  blob: Blob,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase not initialised" };
  if (!blob || blob.size === 0) return { ok: false, error: "Empty file" };

  // Keep a comfortable margin below 50 MB. Tune as you like.

  if (blob.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Image too large after processing (${(blob.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  const contentType = blob.type || "application/octet-stream";

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, blob, {
      cacheControl: "31536000",
      upsert: true,
      contentType,
    });

  if (error) return { ok: false, error: error.message || String(error) };
  return { ok: true, path: data.path };
}

// ---------- optional: signed-url upload (works great on iOS/Safari) ----------
export async function uploadViaSignedUrl(
  supabase: SupabaseClient | null,
  bucket: string,
  path: string,
  blob: Blob,
): Promise<{ ok: true; path: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: "Supabase not initialised" };

  if (!blob || blob.size === 0) return { ok: false, error: "Empty file" };
  if (blob.size > IMAGE_MAX_BYTES) {
    return {
      ok: false,
      error: `Image too large after processing (${(blob.size / 1024 / 1024).toFixed(1)}MB)`,
    };
  }

  const { data: signed, error: createErr } = await supabase.storage
    .from(bucket)
    .createSignedUploadUrl(path);
  if (createErr) return { ok: false, error: createErr.message };

  const { error: putErr } = await supabase.storage
    .from(bucket)
    .uploadToSignedUrl(path, signed.token, blob, {
      contentType: blob.type || "image/jpeg",
      upsert: true,
    });

  if (putErr) return { ok: false, error: putErr.message };
  return { ok: true, path };
}
