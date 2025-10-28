"use client";

import { useEffect, useRef } from "react";
import { ImageAnnotator } from "./ImageAnnotator";
import {
  type Observation,
  type Side,
  type SidePhoto,
  type UploadedImage,
  type UploadFn,
} from "@/lib/types";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import { deleteMarker } from "@/lib/actions/conditionReportActions";

type CreateMarkerForSide = (
  side: Side,
  x: number,
  y: number,
  note: string,
) => Promise<{ markerId: string }>;

type UploadMarkerPhoto = (
  markerId: string,
  f: File,
) => Promise<{ storagePath: string }>;

type Props = {
  photos: SidePhoto[];
  onPhotosChange: (photos: SidePhoto[]) => void;
  uploadImage: UploadFn;
  createMarkerForSide?: CreateMarkerForSide;
  uploadMarkerPhoto?: UploadMarkerPhoto;
  onSidePhotoPersisted?: (side: Side, sidePhotoId: string) => void;
  canAnnotateSides?: Record<Side, boolean>;
};

export function SidePhotosAnnotator({
  photos,
  onPhotosChange,
  uploadImage,
  createMarkerForSide,
  uploadMarkerPhoto,
  onSidePhotoPersisted,
  canAnnotateSides,
}: Props) {
  const supabase = useClerkSupabaseClient();

  const photosRef = useRef<SidePhoto[]>(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);

  const SIDE_LABELS: Record<Side, string> = {
    front: "Front",
    nearside: "Nearside",
    back: "Back",
    offside: "Offside",
    interior: "Interior",
  };

  // ---- Upload guards (prevent duplicate uploads for same file/slot) ----
  const inFlightBase = useRef<Set<string>>(new Set());

  const createMarkerForSideRef = useRef<CreateMarkerForSide | null>(null);
  const uploadMarkerPhotoRef = useRef<UploadMarkerPhoto | null>(null);

  useEffect(() => {
    createMarkerForSideRef.current = createMarkerForSide ?? null;
    uploadMarkerPhotoRef.current = uploadMarkerPhoto ?? null;

    return () => {
      createMarkerForSideRef.current = null;
      uploadMarkerPhotoRef.current = null;
    };
  }, [createMarkerForSide, uploadMarkerPhoto]);

  function baseKey(idx: number, file?: File) {
    return file ? `${idx}:${file.size}:${file.lastModified}` : `${idx}:nofile`;
  }

  // Start a base upload once (guarded + optimistic state)
  async function maybeUploadBase(
    idx: number,
    side: Side,
    image: UploadedImage,
  ) {
    if (
      !image.file ||
      image.imageStoragePath ||
      image.uploadStatus === "success"
    )
      return;

    const key = baseKey(idx, image.file);
    if (inFlightBase.current.has(key)) return;
    inFlightBase.current.add(key);

    // optimistic: mark uploading
    {
      const prev = photosRef.current;
      const next = [...prev];
      const curr = next[idx];
      if (!curr) {
        inFlightBase.current.delete(key);
        return;
      }
      next[idx] = {
        ...curr,
        image: curr.image
          ? { ...curr.image, uploadStatus: "uploading" }
          : { previewUrl: image.previewUrl, uploadStatus: "uploading" },
      };
      onPhotosChange(next);
      photosRef.current = next;
    }

    try {
      const res = await uploadImage(image.file, side, "side");

      {
        const prev = photosRef.current;
        const next = [...prev];
        const curr = next[idx];
        if (!curr.image) {
          onPhotosChange(next);
          inFlightBase.current.delete(key);
          return;
        }
        next[idx] =
          res.status === "success"
            ? {
                ...curr,
                image: {
                  previewUrl: curr.image.previewUrl,
                  uploadStatus: "success",
                  imageStoragePath: res.path,
                },
              }
            : {
                ...curr,
                image: {
                  ...curr.image,
                  uploadStatus: "error",
                  errorMessage: res.error,
                },
              };
        onPhotosChange(next);
        photosRef.current = next;
      }

      if (res.status === "success" && res.sidePhotoId) {
        onSidePhotoPersisted?.(side, res.sidePhotoId);
      }
    } catch (e) {
      const prev = photosRef.current;
      const next = [...prev];
      const curr = next[idx];
      if (curr?.image) {
        next[idx] = {
          ...curr,
          image: {
            ...curr.image,
            uploadStatus: "error",
            errorMessage: (e as Error)?.message ?? "Upload failed",
          },
        };
        onPhotosChange(next);
        photosRef.current = next;
      }
    } finally {
      inFlightBase.current.delete(key);
    }
  }

  async function handleCreateMarker(
    side: Side,
    x: number,
    y: number,
    note: string,
    files: File[],
  ) {
    const cms = createMarkerForSideRef.current;
    const ump = uploadMarkerPhotoRef.current;
    if (!cms || !ump) throw new Error("Marker helpers not registered");

    const { markerId } = await cms(side, x, y, note);

    const uploaded: string[] = [];
    for (const f of files) {
      const { storagePath } = await ump(markerId, f);
      uploaded.push(storagePath);
    }
    return { markerId, fileResults: uploaded };
  }

  function onAnnotatorChange(
    idx: number,
    image: UploadedImage | null,
    observations: Observation[],
  ) {
    const row = photos[idx];
    if (!row) return; // stale index due to parent update
    const side = row.side;
    const next = photos.map((p, i) =>
      i === idx ? { ...p, image, observations } : p,
    );

    onPhotosChange(next);
    photosRef.current = next;

    if (
      image?.file &&
      !image.imageStoragePath &&
      image.uploadStatus !== "success"
    ) {
      void maybeUploadBase(idx, side, image);
    }
  }

  // NEW: delete marker row (server) and any stored files
  async function handleDeleteMarkerServer({
    markerId,
    photoPaths,
  }: {
    markerId?: string;
    photoPaths: string[];
  }) {
    // 1) Delete marker record (cascade marker_photo rows in DB)
    try {
      if (markerId) {
        await deleteMarker({ markerId });
      }
    } catch (e) {
      // Decide whether to fail hard or continue to try file deletion
      console.error("[SidePhotosAnnotator] deleteMarker failed", e);
    }

    // 2) Delete files from storage (ignore individual failures)
    try {
      if (photoPaths.length > 0) {
        await Promise.allSettled(
          photoPaths.map((p) =>
            supabase.storage.from("asset-images").remove([p]),
          ),
        );
      }
    } catch (e) {
      console.error("[SidePhotosAnnotator] storage.remove failed", e);
    }
  }

  async function handleRemoveBaseImage(idx: number) {
    const row = photosRef.current[idx];
    if (!row?.image) return;

    const storagePath = row.image.imageStoragePath;
    // 1) Delete DB side photo row (cascades to markers if any)
    try {
      if (storagePath) {
        const { deleteSidePhotoByPath } = await import(
          "@/lib/actions/conditionReportActions"
        );
        await deleteSidePhotoByPath({ storagePath });
      }
    } catch (e) {
      console.error("[SidePhotosAnnotator] deleteSidePhotoByPath failed", e);
      // You can toast here; we still attempt storage delete
    }

    // 2) Delete object from Storage (ignore individual failure)
    try {
      if (storagePath) {
        await supabase.storage.from("asset-images").remove([storagePath]);
      }
    } catch (e) {
      console.error("[SidePhotosAnnotator] storage remove failed", e);
    }

    // 3) Update local UI state
    const prev = photosRef.current;
    const next = prev.map((p, i) =>
      i === idx ? { ...p, image: null, observations: [] } : p,
    );
    onPhotosChange(next);
    photosRef.current = next;
  }

  return (
    <div>
      {photos.map((sidePhoto, idx) => (
        <div key={sidePhoto.side} className="mb-10">
          <ImageAnnotator
            image={sidePhoto.image}
            observations={sidePhoto.observations}
            onChange={(image, observations) =>
              onAnnotatorChange(idx, image, observations)
            }
            label={SIDE_LABELS[sidePhoto.side]}
            required={sidePhoto.side === "front"}
            // new:
            disabled={!canAnnotateSides?.[sidePhoto.side]}
            onCreateMarker={async (x, y, note, files) =>
              handleCreateMarker(sidePhoto.side, x, y, note, files)
            }
            onDeleteMarker={handleDeleteMarkerServer}
            onRemoveBaseImage={() => handleRemoveBaseImage(idx)}
          />
        </div>
      ))}
    </div>
  );
}
