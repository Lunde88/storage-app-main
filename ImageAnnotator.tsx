"use client";

import { Camera, Info, Loader2 } from "lucide-react";
import React, { useEffect, useRef, useState, useId, useCallback } from "react";
import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { Observation, UploadedImage } from "@/lib/types";

type ImageAnnotatorProps = {
  image: UploadedImage | null;
  observations: Observation[];
  onChange: (image: UploadedImage | null, observations: Observation[]) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  onCreateMarker?: (
    x: number,
    y: number,
    note: string,
    files: File[],
  ) => Promise<{ markerId: string; fileResults: string[] }>;
  onDeleteMarker?: (args: {
    markerId?: string;
    photoPaths: string[]; // storage paths to delete (if any)
  }) => Promise<void>;
  onRemoveBaseImage?: () => Promise<void>;
};

export function ImageAnnotator({
  image,
  observations,
  onChange,
  label,
  required,
  disabled,
  onCreateMarker,
  onDeleteMarker,
  onRemoveBaseImage,
}: ImageAnnotatorProps) {
  const [localImage, setLocalImage] = useState<UploadedImage | null>(image);
  const [localObservations, setLocalObservations] =
    useState<Observation[]>(observations);

  const [pendingMarker, setPendingMarker] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [markerNote, setMarkerNote] = useState("");
  const [markerPhotos, setMarkerPhotos] = useState<UploadedImage[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const markerPhotoInputRef = useRef<HTMLInputElement | null>(null);
  const noteInputRef = useRef<HTMLTextAreaElement | null>(null);

  const [imgBox, setImgBox] = useState({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [imgReady, setImgReady] = useState(false);

  const measure = useCallback(() => {
    if (!imgRef.current || !containerRef.current) return;
    const img = imgRef.current;
    const rect = containerRef.current.getBoundingClientRect();
    const nw = img.naturalWidth;
    const nh = img.naturalHeight;
    if (!nw || !nh) return; // don't measure until intrinsic size is known

    const naturalRatio = nw / nh;
    const containerRatio = rect.width / rect.height;

    let displayWidth: number, displayHeight: number;
    if (naturalRatio > containerRatio) {
      displayWidth = rect.width;
      displayHeight = rect.width / naturalRatio;
    } else {
      displayHeight = rect.height;
      displayWidth = rect.height * naturalRatio;
    }
    const offsetX = (rect.width - displayWidth) / 2;
    const offsetY = (rect.height - displayHeight) / 2;
    setImgBox({
      left: offsetX,
      top: offsetY,
      width: displayWidth,
      height: displayHeight,
    });
  }, []);

  const isUploading = localImage?.uploadStatus === "uploading";
  const isError = localImage?.uploadStatus === "error";
  const progress =
    typeof localImage?.progress === "number" ? localImage.progress : undefined;

  function revokeIfBlob(url?: string) {
    if (url && url.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(url);
      } catch {}
    }
  }

  const uid = useId(); // unique suffix for input id

  useEffect(() => {
    // handle cached images that are already complete
    if (imgRef.current?.complete && imgRef.current.naturalWidth) {
      setImgReady(true);
      measure();
    }

    const ro = new ResizeObserver(() => measure());
    if (containerRef.current) ro.observe(containerRef.current);

    const onWinResize = () => measure();
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
    };
  }, [measure]);

  useEffect(() => {
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (containerRef.current) ro.observe(containerRef.current);

    const onWinResize = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    };
    window.addEventListener("resize", onWinResize);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onWinResize);
      cancelAnimationFrame(raf);
    };
  }, [measure]);

  useEffect(() => {
    // whenever the src changes, wait for onLoad to set ready + measure
    setImgReady(false);
    // optional: clear box to hide markers briefly
    setImgBox({ left: 0, top: 0, width: 0, height: 0 });
  }, [localImage?.previewUrl]);

  // keep localImage in sync with parent
  useEffect(() => {
    setLocalImage(image ?? null);
  }, [image]);

  // keep localObservations in sync with parent
  useEffect(() => {
    setLocalObservations(observations ?? []);
  }, [observations]);

  useEffect(() => {
    if (pendingMarker && noteInputRef.current) {
      noteInputRef.current.focus();
    }
  }, [pendingMarker]);

  // revoke object URLs on cleanup or when image changes
  useEffect(() => {
    return () => {
      if (localImage?.previewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(localImage.previewUrl);
      }
      markerPhotos.forEach((ph) => {
        if (ph.previewUrl?.startsWith("blob:"))
          URL.revokeObjectURL(ph.previewUrl);
      });
    };
    // only run on unmount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (localImage?.previewUrl?.startsWith("blob:")) {
      URL.revokeObjectURL(localImage.previewUrl);
    }
    const previewUrl = URL.createObjectURL(file);
    const nextImage = { file, previewUrl } as UploadedImage;
    setLocalImage(nextImage);
    setLocalObservations([]);
    onChange(nextImage, []);
  }

  // function getImageOffsetAndSize() {
  //   if (!imgRef.current || !containerRef.current)
  //     return { left: 0, top: 0, width: 1, height: 1 };
  //   const img = imgRef.current;
  //   const container = containerRef.current;
  //   const rect = container.getBoundingClientRect();
  //   const naturalRatio = img.naturalWidth / img.naturalHeight;
  //   const containerRatio = rect.width / rect.height;
  //   let displayWidth = rect.width,
  //     displayHeight = rect.height;
  //   if (naturalRatio > containerRatio) {
  //     displayWidth = rect.width;
  //     displayHeight = rect.width / naturalRatio;
  //   } else {
  //     displayHeight = rect.height;
  //     displayWidth = rect.height * naturalRatio;
  //   }
  //   const offsetX = (rect.width - displayWidth) / 2;
  //   const offsetY = (rect.height - displayHeight) / 2;
  //   return {
  //     left: offsetX,
  //     top: offsetY,
  //     width: displayWidth,
  //     height: displayHeight,
  //   };
  // }

  function handleImageClick(e: React.MouseEvent<HTMLImageElement>) {
    if (!localImage || pendingMarker || disabled || isUploading) return;
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const { left, top, width, height } = imgBox;
    if (width <= 0 || height <= 0) return; // not measured yet

    const x = Math.max(0, Math.min(1, (clickX - left) / width));
    const y = Math.max(0, Math.min(1, (clickY - top) / height));
    setPendingMarker({ x, y });
    setMarkerNote("");
    setMarkerPhotos([]);
  }

  function getMarkerStyle(m: {
    x: number | null;
    y: number | null;
  }): React.CSSProperties {
    const { left, top, width, height } = imgBox;
    const x = m.x ?? 0;
    const y = m.y ?? 0;
    return {
      position: "absolute",
      left: `${left + x * width}px`,
      top: `${top + y * height}px`,
      transform: "translate(-50%, -50%)",
      zIndex: 2,
      pointerEvents: "none",
      visibility: imgReady && width > 0 && height > 0 ? "visible" : "hidden",
    };
  }

  async function handleSaveMarker() {
    if (!pendingMarker || !markerNote || disabled) return;

    // Extract raw files from your markerPhotos state
    const rawFiles: File[] = markerPhotos
      .map((p) => p.file)
      .filter((f): f is File => !!f);

    let markerId: string | undefined;
    let storedPaths: string[] = [];

    if (onCreateMarker) {
      const res = await onCreateMarker(
        pendingMarker.x,
        pendingMarker.y,
        markerNote,
        rawFiles,
      );
      markerId = res.markerId;
      storedPaths = res.fileResults;
    }

    const next = [
      ...localObservations,
      {
        id: `${Date.now()}`,
        markerId,
        x: pendingMarker.x,
        y: pendingMarker.y,
        note: markerNote,
        photos: markerPhotos.map((p, i) => {
          const sp = storedPaths[i]; // may be undefined if fewer uploads returned
          return {
            ...p, // KEEP previewUrl, file, etc.
            markerPhotoStoragePath: sp ?? p.markerPhotoStoragePath,
            uploadStatus: sp ? "success" : p.uploadStatus, // optional
          };
        }),
      },
    ];

    setLocalObservations(next);
    onChange(localImage, next);
    setPendingMarker(null);
    setMarkerNote("");
    setMarkerPhotos([]);
  }

  function handleCancelMarker() {
    setPendingMarker(null);
    setMarkerNote("");
    setMarkerPhotos([]);
  }

  //  delete observation and its images both locally and on server
  async function handleDeleteObservation(idx: number) {
    if (disabled) return;

    const obs = localObservations[idx];
    if (!obs) return;

    // Gather any persisted storage paths we should delete on the server
    const photoPaths = (obs.photos ?? [])
      .map((p) => p.markerPhotoStoragePath)
      .filter((p): p is string => !!p);

    // Ask host app to delete marker + files (no-op if not provided)
    try {
      if (onDeleteMarker) {
        await onDeleteMarker({ markerId: obs.markerId, photoPaths });
      }
    } catch (e) {
      // If server deletion fails, you might choose to bail out.
      // For now we still proceed locally; adjust to your preference.
      console.error("[ImageAnnotator] onDeleteMarker failed", e);
    }

    // Revoke any local blob previews for this observation’s photos
    (obs.photos ?? []).forEach((p) => revokeIfBlob(p.previewUrl));

    // Finally remove from local state and notify parent
    const next = localObservations.filter((_, i) => i !== idx);
    setLocalObservations(next);
    onChange(localImage, next);
  }

  // CHANGED: remove image in DB + storage via parent, then clear UI
  async function handleRemoveImage() {
    if (!localImage) return;

    try {
      if (onRemoveBaseImage) {
        await onRemoveBaseImage();
      }
    } catch (e) {
      console.error("[ImageAnnotator] onRemoveBaseImage failed", e);
      // decide if you want to bail out; we continue to clear UI
    }

    // revoke old preview URL if it was created here
    if (localImage?.previewUrl?.startsWith("blob:")) {
      try {
        URL.revokeObjectURL(localImage.previewUrl);
      } catch {}
    }
    setLocalImage(null);
    setLocalObservations([]);
    onChange(null, []); // notify parent that image was removed
  }

  return (
    <div>
      {label && (
        <label className="mb-1 block text-xs">
          {label}
          {required && <span className="text-destructive"> *</span>}
        </label>
      )}

      {!localImage ? (
        <label
          htmlFor={`annotator-image-upload-${uid}`}
          className="mx-auto flex aspect-3/2 min-h-[160px] w-full max-w-md cursor-pointer flex-col items-center justify-center rounded-[4px] border border-[#E4E4E4] bg-white transition"
          tabIndex={0}
        >
          <span className="mb-1.5 rounded-[8px] border border-[#E4E4E4] bg-[#FAFAFA] p-3">
            <Camera size={24} />
          </span>
          <span className="text-xs">
            {label ? `Add ${label} Photo` : "Add vehicle photo:"}
          </span>
          <input
            id={`annotator-image-upload-${uid}`}
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="hidden"
          />
        </label>
      ) : (
        <div
          className="relative mb-2 aspect-3/2 w-full max-w-md overflow-hidden rounded-[4px] border border-[#E4E4E4] bg-white"
          ref={containerRef}
        >
          <img
            key={localImage?.previewUrl || "empty"}
            ref={imgRef}
            src={localImage.previewUrl ?? ""}
            alt="To annotate"
            className={`h-full w-full object-contain transition ${isUploading ? "opacity-70 blur-sm" : ""}`}
            style={{ cursor: pendingMarker ? "default" : "crosshair" }}
            onClick={handleImageClick}
            draggable={false}
            onLoad={() => {
              setImgReady(true);
              measure();
            }}
            loading="eager"
          />
          {localObservations.map((m, idx) => (
            <span
              key={m.id}
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[#86101E] bg-[#FFE4E7] text-xs text-[#86101E] shadow"
              style={getMarkerStyle(m)}
              title={m.note}
            >
              {idx + 1}
            </span>
          ))}
          {pendingMarker && (
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-red-500 text-white"
              style={getMarkerStyle(pendingMarker)}
            >
              ?
            </span>
          )}

          {/* UPLOADING OVERLAY */}
          {isUploading && (
            <div
              className="absolute inset-0 grid place-items-center bg-black/30"
              role="status"
              aria-live="polite"
            >
              <div className="rounded-md bg-black/70 px-4 py-3 text-white shadow">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  <span className="text-sm">
                    {typeof progress === "number"
                      ? `Uploading… ${progress}%`
                      : "Uploading…"}
                  </span>
                </div>
                {typeof progress === "number" && (
                  <div className="mt-2 h-1 w-48 overflow-hidden rounded bg-white/20">
                    <div
                      className="h-full bg-white"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ERROR OVERLAY */}
          {isError && (
            <div className="absolute inset-0 grid place-items-center bg-black/40">
              <div className="rounded-md bg-black/75 px-4 py-3 text-white shadow">
                <p className="text-sm font-semibold">Upload failed</p>
                {localImage?.errorMessage && (
                  <p className="mt-1 text-xs opacity-80">
                    {localImage.errorMessage}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {localImage && localObservations.length === 0 && (
        <div className="mb-3 flex items-center rounded-lg border border-[#2D7DCD] bg-[#F0FCFF] px-3 py-2 text-xs font-semibold text-[#2D7DCD]">
          <Info size={20} className="mr-2 inline" />
          <p>Tap the image to add observations</p>
        </div>
      )}

      {localObservations.length > 0 && (
        <ul className="mb-3">
          {localObservations.map((obs, idx) => (
            <li key={obs.id} className="mb-5 flex items-start gap-2 text-sm">
              <div className="mt-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full border border-[#86101E] bg-[#FFE4E7] text-[#86101E]">
                  {idx + 1}
                </span>
              </div>
              <div className="flex-1">
                <div className="bg-[#FAFAFA] px-2 py-2">{obs.note}</div>
                {obs.photos.length > 0 && (
                  <div className="mt-1 flex gap-2">
                    {obs.photos.map((photo, pidx) => (
                      <img
                        key={pidx}
                        src={photo.previewUrl}
                        alt={`Obs photo ${pidx + 1}`}
                        className="h-10 w-10 rounded object-cover"
                      />
                    ))}
                  </div>
                )}
              </div>
              <button
                className="mt-2 text-xs text-red-600 hover:underline"
                onClick={() => handleDeleteObservation(idx)}
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}

      {pendingMarker && (
        <div className="mb-4 max-w-md rounded-lg border bg-white p-4 shadow">
          <h4 className="mb-2 font-semibold">Add note for observation</h4>
          <Textarea
            ref={noteInputRef}
            placeholder="Describe the issue…"
            value={markerNote}
            onChange={(e) => setMarkerNote(e.target.value)}
            rows={2}
            className="mb-2 w-full rounded border p-2"
          />
          <div className="mb-4 flex items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-1 rounded bg-gray-200 px-2 py-1 text-sm text-gray-800 hover:bg-gray-300"
              onClick={() => markerPhotoInputRef.current?.click()}
            >
              <span className="text-base">+</span> Add detail photo
            </button>
            <input
              ref={markerPhotoInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => {
                const files = Array.from(e.target.files || []);
                setMarkerPhotos((prev) => [
                  ...prev,
                  ...files.map((file) => ({
                    file,
                    previewUrl: URL.createObjectURL(file),
                    // uploadStatus: "success" as const,
                  })),
                ]);
                if (markerPhotoInputRef.current)
                  markerPhotoInputRef.current.value = "";
              }}
            />
          </div>
          {markerPhotos.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {markerPhotos.map((photo, idx) => (
                <div key={idx} className="relative">
                  <img
                    src={photo.previewUrl}
                    alt={`Obs photo ${idx + 1}`}
                    className="h-12 w-12 rounded border object-cover"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setMarkerPhotos((prev) =>
                        prev.filter((_, i) => i !== idx),
                      )
                    }
                    className="absolute -top-2 -right-2 rounded bg-white px-1 text-xs text-red-600"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <button
              type="button"
              className="rounded bg-red-100 px-3 py-1 text-red-700"
              onClick={handleCancelMarker}
            >
              Cancel
            </button>
            <button
              type="button"
              className="rounded bg-blue-600 px-3 py-1 text-white"
              disabled={!markerNote}
              onClick={handleSaveMarker}
            >
              Save
            </button>
          </div>
        </div>
      )}

      {localImage && (
        <div className="mb-2 flex justify-end gap-2">
          {localObservations.length === 0 && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemoveImage}
            >
              Remove Image
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
