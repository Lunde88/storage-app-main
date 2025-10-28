"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { FormField } from "@/components/forms/FormField";

import {
  VEHICLE_LEVELS,
  VehicleLevelType,
  VehicleLevels,
  VehicleType,
  ConditionReportDraft,
  SidePhoto,
  UploadFn,
  UploadedImage,
  Side,
  SIDES,
  ReportType,
  IMAGE_MAX_BYTES,
} from "@/lib/types";
import { useClerkSupabaseClient } from "@/lib/supabaseClient";
import {
  makeMarkerPhotoPathFromBlob,
  makeSidePathFromBlob,
  normalizeImage,
  uploadToSupabase,
  uploadViaSignedUrl,
} from "@/lib/utils/uploadUtils";

import { SidePhotosAnnotator } from "@/components/SidePhotosAnnotator";
import {
  discardDraftReport,
  ensureDraftWithScalars,
  getReportImages,
  updateDraftReport,
  upsertSidePhoto,
} from "@/lib/actions/conditionReportActions";
import { getSignedImageUrl } from "@/lib/storage/getSignedImageUrl";
import { formatDistanceToNow } from "date-fns";
import CancelButton from "../base/buttons/CancelButton";
import NextButton from "../base/buttons/NextButton";

function preload(src: string) {
  return new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => resolve();
    img.onerror = () => resolve(); // be lenient; don't block on errors
    img.src = src;
  });
}

function buildSnapshot(opts: {
  odometer: string;
  notes: string;
  vehicleLevels: VehicleLevels;
}) {
  const normalizedLevels: Record<string, number | null> = {};
  const entries = Object.entries(opts.vehicleLevels || {});
  entries.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  for (const [k, v] of entries) {
    normalizedLevels[k] = typeof v === "number" ? v : null;
  }
  return {
    odometer: opts.odometer ? parseInt(opts.odometer, 10) : null,
    notes: opts.notes || null,
    vehicleLevels: normalizedLevels,
  };
}

type Props = {
  condition: ConditionReportDraft | null;
  onChange: (report: ConditionReportDraft) => void;
  onNext: () => void;
  onBack: () => void;
  vehicleType?: VehicleType;
  assetId: string | null;
  reportType: ReportType;
};

export default function ConditionStep({
  condition,
  onChange,
  onNext,
  onBack,
  vehicleType,
  assetId,
  reportType,
}: Props) {
  const { orgId, isLoaded, isSignedIn } = useAuth();
  const supabase = useClerkSupabaseClient();

  const lastSavedRef = useRef<string>("");
  const hydratedScalarsRef = useRef(false);
  const justDiscardedRef = useRef(false);
  const [suppressInitialBanner, setSuppressInitialBanner] = useState(true);

  const localUploadCount = useRef(0);
  const [hadPreExistingImages, setHadPreExistingImages] = useState(false);

  const [uploadsReady, setUploadsReady] = useState(false);
  const uploadsEnabled = isLoaded && isSignedIn && !!orgId;
  const inputsDisabled = !uploadsEnabled || !uploadsReady;

  // Local form state
  const [odometer, setOdometer] = useState(
    condition?.odometer ? String(condition.odometer) : "",
  );
  const [notes, setNotes] = useState(condition?.notes || "");

  // Photos are driven from parent state (with a safe default)
  const photos = useMemo<SidePhoto[]>(
    () =>
      condition?.sidesUi ??
      SIDES.map((side) => ({ side, image: null, observations: [] })),
    [condition?.sidesUi],
  );

  // bump to rehydrate images without depending on `photos`
  const [imageRefreshTick, setImageRefreshTick] = useState(0);
  const bumpImages = () => setImageRefreshTick((n) => n + 1);

  const [formErrors, setFormErrors] = useState<Record<string, string | null>>(
    {},
  );

  const [submitting, setSubmitting] = useState(false);

  const [reportId, setReportId] = useState<string | null>(
    condition?.id ?? null,
  );

  // Field refs for error focus
  const odometerRef = useRef<HTMLInputElement>(null);

  // Vehicle levels
  const activeLevels = useMemo(() => {
    if (!vehicleType) return VEHICLE_LEVELS;
    return VEHICLE_LEVELS.filter((l) => l.for.includes(vehicleType));
  }, [vehicleType]);

  const hasLocal = (s: Side) => photos.some((p) => p.side === s && !!p.image); // any image present

  const showDraftBanner =
    !suppressInitialBanner &&
    !!condition?.id &&
    (!!condition?.updatedAt || hadPreExistingImages);

  const lastSaved = condition?.updatedAt
    ? formatDistanceToNow(new Date(condition.updatedAt), { addSuffix: true })
    : null;

  const [levelIncluded, setLevelIncluded] = useState<
    Record<VehicleLevelType, boolean>
  >({});
  const [levelValues, setLevelValues] = useState<VehicleLevels>({});

  // Helper to set photos in parent
  const setPhotos = (
    next: SidePhoto[] | ((prev: SidePhoto[]) => SidePhoto[]),
  ) => {
    if (!condition) return;
    const resolved =
      typeof next === "function"
        ? (next as (p: SidePhoto[]) => SidePhoto[])(photos)
        : next;
    if (resolved !== photos) {
      onChange({ ...condition, sidesUi: resolved });
    }
  };

  useEffect(() => {
    hydratedScalarsRef.current = false;
    setSuppressInitialBanner(true);
    setHadPreExistingImages(false);
    localUploadCount.current = 0;
  }, [assetId, condition?.assetId, reportType]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const effectiveAssetId = assetId ?? condition?.assetId ?? null;
      if (!effectiveAssetId) return;

      // already hydrated? make sure inputs are enabled and bail
      if (hydratedScalarsRef.current) {
        if (!uploadsReady) setUploadsReady(true);
        return;
      }

      // guard BEFORE await (prevents duplicate in-flight calls in Strict Mode)
      hydratedScalarsRef.current = true;

      try {
        const shouldCreateBlank = justDiscardedRef.current;
        justDiscardedRef.current = false;

        const res = await ensureDraftWithScalars({
          assetId: effectiveAssetId,
          reportType,
          createBlank: shouldCreateBlank,
        });
        if (cancelled) return;

        if (!reportId || reportId !== res.id) setReportId(res.id);

        if (!shouldCreateBlank) {
          // hydrate local form
          setOdometer(
            typeof res.odometer === "number" && !Number.isNaN(res.odometer)
              ? String(res.odometer)
              : "",
          );
          setNotes(res.notes ?? "");

          // levels
          const included = activeLevels.reduce(
            (acc, l) => {
              const key = l.key as VehicleLevelType;
              acc[key] = typeof (res.vehicleLevels ?? {})[key] === "number";
              return acc;
            },
            {} as Record<VehicleLevelType, boolean>,
          );

          const values: VehicleLevels = {};
          activeLevels.forEach((l) => {
            const key = l.key as VehicleLevelType;
            const v = (res.vehicleLevels ?? {})[key];
            if (typeof v === "number") values[key] = v;
          });

          setLevelIncluded(included);
          setLevelValues(values);
        }

        // sync parent
        const isEmptyScalars = (r: {
          odometer: number | null;
          notes: string | null;
          vehicleLevels: VehicleLevels | null;
        }) => {
          return (
            r.odometer == null &&
            (!r.notes || r.notes.length === 0) &&
            (!r.vehicleLevels || Object.keys(r.vehicleLevels).length === 0)
          );
        };

        const emptyNow =
          shouldCreateBlank ||
          isEmptyScalars({
            odometer: res.odometer ?? null,
            notes: res.notes ?? null,
            vehicleLevels: (res.vehicleLevels ?? null) as VehicleLevels | null,
          });

        const justCreated =
          res.wasCreatedNow ||
          !res.updatedAt ||
          res.updatedAt === res.createdAt;

        const seeded = !!res.seededFromReportId;

        const resumeNonEmpty =
          !justDiscardedRef.current &&
          !justCreated &&
          !seeded &&
          !!res.updatedAt &&
          !emptyNow;

        if (resumeNonEmpty) {
          setSuppressInitialBanner(false);
        }

        onChange({
          ...(condition ?? ({} as ConditionReportDraft)),
          id: res.id,
          assetId: effectiveAssetId,
          reportType: condition?.reportType ?? reportType,
          inspectorId: condition?.inspectorId ?? "temp-user",
          odometer: emptyNow ? undefined : (res.odometer ?? undefined),
          notes: emptyNow ? "" : (res.notes ?? undefined),
          vehicleLevels: emptyNow ? {} : (res.vehicleLevels ?? undefined),
          updatedAt: res.updatedAt ?? undefined,
          sidesUi: condition?.sidesUi ?? photos,
          context: {
            ...(condition?.context ?? {}),
            latestSubmittedReportId: res.seededFromReportId ?? null,
          },
        });

        // seed snapshot
        lastSavedRef.current = JSON.stringify(
          buildSnapshot({
            odometer: shouldCreateBlank
              ? ""
              : typeof res.odometer === "number"
                ? String(res.odometer)
                : "",
            notes: shouldCreateBlank ? "" : (res.notes ?? ""),
            vehicleLevels: shouldCreateBlank ? {} : (res.vehicleLevels ?? {}),
          }),
        );

        setUploadsReady(true);
      } catch (e) {
        console.error("[ConditionStep] ensureDraftWithScalars failed", e);
        // allow retry
        hydratedScalarsRef.current = false;
        setUploadsReady(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // ⬇️ IMPORTANT: no reportId here
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetId, condition?.assetId, reportType, onChange, activeLevels]);

  // Rehydrate images when asked (tick) or when reportId/supabase changes
  useEffect(() => {
    let cancelled = false;

    (async () => {
      if (!reportId || !supabase) return;

      // Snapshot UI at fetch start (used for merge & equality checks)
      const uiBefore = photos;

      const { sides, observationsBySidePhotoId } =
        await getReportImages(reportId);
      if (cancelled) return;

      // --- build sideIds up-front (used in the final state push)
      const sideIds: Partial<Record<Side, string>> = {};
      SIDES.forEach((side) => {
        const rec = sides[side];
        if (rec?.sidePhotoId) sideIds[side] = rec.sidePhotoId;
      });

      const hasPersistedSidePhotos = Object.keys(sideIds).length > 0;
      const safeToUnsuppressImages =
        localUploadCount.current === 0 &&
        hasPersistedSidePhotos &&
        !justDiscardedRef.current;

      if (safeToUnsuppressImages) {
        setHadPreExistingImages(true);
        setSuppressInitialBanner(false);
      }

      // --- build server view
      const serverSides: SidePhoto[] = await Promise.all(
        SIDES.map(async (side) => {
          const rec = sides[side];
          if (!rec) return { side, image: null, observations: [] };

          const basePreview = await getSignedImageUrl(
            supabase,
            rec.storagePath,
            { expiresIn: 86400 },
          );

          const rawObs = observationsBySidePhotoId[rec.sidePhotoId] ?? [];
          const observations = await Promise.all(
            rawObs.map(async (o, idx) => ({
              id: `${rec.sidePhotoId}-${o.markerId}-${idx}`,
              markerId: o.markerId,
              x: o.x,
              y: o.y,
              note: o.note ?? "",
              photos: await Promise.all(
                (o.photoPaths ?? []).map(async (p) => ({
                  previewUrl: await getSignedImageUrl(supabase, p, {
                    expiresIn: 86400,
                  }),
                  markerPhotoStoragePath: p,
                  uploadStatus: "success" as const,
                })),
              ),
            })),
          );

          return {
            side,
            image: basePreview
              ? {
                  previewUrl: basePreview,
                  imageStoragePath: rec.storagePath,
                  uploadStatus: "success" as const,
                }
              : null,
            observations,
          };
        }),
      );

      // --- merge: keep local preview (no imageStoragePath), else use server;
      // preserve references when unchanged. Preload new signed URLs before swapping.
      const existingBySide = new Map<Side, SidePhoto>(
        uiBefore.map((p) => [p.side, p]),
      );

      // Preload any signed URLs that will replace an object URL for the same file
      await Promise.all(
        SIDES.map(async (side) => {
          const existing = existingBySide.get(side);
          const incoming = serverSides.find((p) => p.side === side);

          const existingImg = existing?.image;
          const incomingImg = incoming?.image;

          // We only care about the case: we already have a persisted image for this side,
          // and the server returns a signed preview for the *same storage path*,
          // but with a *different* previewUrl (object URL -> signed URL).
          const willSwapToSigned =
            !!existingImg &&
            !!incomingImg &&
            !!existingImg.imageStoragePath &&
            !!incomingImg.imageStoragePath &&
            existingImg.imageStoragePath === incomingImg.imageStoragePath &&
            !!incomingImg.previewUrl &&
            existingImg.previewUrl !== incomingImg.previewUrl;

          if (willSwapToSigned) {
            await preload(incomingImg.previewUrl!);
          }
        }),
      );

      // helpers for structural sharing
      const sameImage = (
        a?: UploadedImage | null,
        b?: UploadedImage | null,
      ) => {
        if (a === b) return true;
        if (!a || !b) return false;
        return (
          a.previewUrl === b.previewUrl &&
          a.imageStoragePath === b.imageStoragePath &&
          a.uploadStatus === b.uploadStatus
        );
      };

      const sameObservations = (
        a: SidePhoto["observations"],
        b: SidePhoto["observations"],
      ) => {
        if (a === b) return true;
        if (a.length !== b.length) return false;
        for (let i = 0; i < a.length; i++) {
          if (a[i] !== b[i]) return false;
        }
        return true;
      };

      const merged: SidePhoto[] = SIDES.map((side) => {
        const existing = existingBySide.get(side) ?? {
          side,
          image: null,
          observations: [],
        };
        const incoming = serverSides.find((p) => p.side === side);

        // Prefer local object URL if it exists (no storage path yet); else prefer server
        const preferredImage =
          existing.image && !existing.image.imageStoragePath
            ? existing.image
            : (incoming?.image ?? existing.image);

        // Preserve reference if nothing materially changed
        const image = sameImage(existing.image, preferredImage)
          ? existing.image
          : preferredImage;

        const preferredObservations =
          (incoming?.observations?.length ?? 0) > 0
            ? incoming!.observations
            : existing.observations;

        const observations = sameObservations(
          existing.observations,
          preferredObservations,
        )
          ? existing.observations
          : preferredObservations;

        if (
          image === existing.image &&
          observations === existing.observations
        ) {
          return existing;
        }
        return { side, image, observations };
      });

      // If nothing at all changed, skip state update (also compare side ids below)
      const nothingChanged =
        merged.length === uiBefore.length &&
        merged.every((m, i) => m === uiBefore[i]) &&
        Object.entries(sideIds).every(
          ([k, v]) => (condition?.sidePhotoIdBySide ?? {})[k as Side] === v,
        );

      if (!cancelled && !nothingChanged && condition) {
        onChange({
          ...condition,
          sidesUi: merged,
          sidePhotoIdBySide: {
            ...(condition.sidePhotoIdBySide ?? {}),
            ...sideIds,
          },
        });
      }

      setUploadsReady(true);
    })();

    return () => {
      cancelled = true;
    };
    // Deliberately NOT depending on `photos`; we rehydrate via imageRefreshTick.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId, supabase, imageRefreshTick]);

  useEffect(() => {
    const allowed = new Set(activeLevels.map((l) => l.key as VehicleLevelType));

    setLevelIncluded((prev) => {
      const next = {} as Record<VehicleLevelType, boolean>;
      for (const k in prev) {
        if (allowed.has(k as VehicleLevelType))
          next[k as VehicleLevelType] = prev[k as VehicleLevelType];
      }
      return next;
    });

    setLevelValues((prev) => {
      const next: VehicleLevels = {};
      for (const [k, v] of Object.entries(prev)) {
        if (allowed.has(k as VehicleLevelType)) next[k as VehicleLevelType] = v;
      }
      return next;
    });

    // also prune the parent condition’s vehicleLevels so Confirm shows the same
    if (condition) {
      const filtered = Object.fromEntries(
        Object.entries(condition.vehicleLevels ?? {}).filter(([k]) =>
          allowed.has(k as VehicleLevelType),
        ),
      ) as VehicleLevels;
      if (
        JSON.stringify(filtered) !==
        JSON.stringify(condition.vehicleLevels ?? {})
      ) {
        onChange({ ...condition, vehicleLevels: filtered });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vehicleType]);

  // Helpers
  const isReady = (img?: UploadedImage | null) =>
    !!img && (img.uploadStatus === undefined || img.uploadStatus === "success");

  const hasFrontPhoto = useMemo(
    () => photos.some((p) => p.side === "front" && isReady(p.image)),
    [photos],
  );

  const anyUploading =
    photos.some((p) => p.image?.uploadStatus === "uploading") ||
    photos.some((p) =>
      p.observations.some((o) =>
        o.photos.some((ph) => ph.uploadStatus === "uploading"),
      ),
    );

  const anyErrored =
    photos.some((p) => p.image?.uploadStatus === "error") ||
    photos.some((p) =>
      p.observations.some((o) =>
        o.photos.some((ph) => ph.uploadStatus === "error"),
      ),
    );

  const canProceed =
    !!odometer && hasFrontPhoto && !anyUploading && !anyErrored;

  // Levels handlers
  const round05 = (v: number) => Math.round(v * 20) / 20;

  const handleLevelCheckboxChange = (
    level: VehicleLevelType,
    checked: boolean,
  ) => {
    setLevelIncluded((prev) => ({ ...prev, [level]: checked }));
    setLevelValues((prev) =>
      checked
        ? { ...prev, [level]: prev[level] ?? 0.5 }
        : { ...prev, [level]: null },
    );
  };

  const handleLevelSliderChange = (level: VehicleLevelType, value: number) => {
    setLevelValues((prev) => ({ ...prev, [level]: round05(value) }));
  };

  const sidePhotoIdBySideObj = condition?.sidePhotoIdBySide ?? {};

  function handleSidePhotoPersisted(side: Side, id: string) {
    if (!condition) return;
    onChange({
      ...condition,
      sidePhotoIdBySide: { ...sidePhotoIdBySideObj, [side]: id },
    });
  }

  // Markers
  async function createMarkerForSide(
    side: Side,
    x: number,
    y: number,
    note: string,
  ) {
    const sidePhotoId = sidePhotoIdBySideObj[side];
    if (!sidePhotoId) throw new Error("Side photo not persisted yet");

    const { createMarker } = await import(
      "@/lib/actions/conditionReportActions"
    );
    const { markerId } = await createMarker({ sidePhotoId, x, y, note });
    return { markerId };
  }

  async function uploadMarkerPhoto(markerId: string, file: File) {
    if (!supabase) throw new Error("Not initialised");
    if (!reportId || !orgId) throw new Error("Report not ready");

    try {
      const { blob } = await normalizeImage(file, {
        maxSide: 3000,
        targetMime: "image/jpeg",
        quality: 0.85,
        maxBytes: IMAGE_MAX_BYTES,
      });

      const path = makeMarkerPhotoPathFromBlob(
        orgId,
        reportId,
        markerId,
        blob,
        file.lastModified,
      );

      let up = await uploadToSupabase(supabase, "asset-images", path, blob);
      if (!up.ok) {
        const signed = await uploadViaSignedUrl(
          supabase,
          "asset-images",
          path,
          blob,
        );
        if (!signed.ok) throw new Error(signed.error);
        up = signed;
      }

      const { addMarkerPhoto } = await import(
        "@/lib/actions/conditionReportActions"
      );
      await addMarkerPhoto({ markerId, storagePath: up.path });

      // Optimistically set UI state to success for the freshly uploaded marker photo
      setPhotos((prev) =>
        prev.map((sidePhoto) => ({
          ...sidePhoto,
          observations: sidePhoto.observations.map((o) =>
            o.markerId !== markerId
              ? o
              : {
                  ...o,
                  photos: o.photos.map((ph) =>
                    // flip the first matching "uploading" placeholder without a storage path
                    ph.uploadStatus === "uploading" &&
                    !ph.markerPhotoStoragePath
                      ? {
                          ...ph,
                          uploadStatus: "success" as const,
                          markerPhotoStoragePath: up.path,
                        }
                      : ph,
                  ),
                },
          ),
        })),
      );

      // Rehydrate so signed URLs replace the blur
      bumpImages();

      return { storagePath: up.path };
    } catch (e) {
      //  Mark the marker photo as error so the gate can surface a retry
      setPhotos((prev) =>
        prev.map((sidePhoto) => ({
          ...sidePhoto,
          observations: sidePhoto.observations.map((o) =>
            o.markerId !== markerId
              ? o
              : {
                  ...o,
                  photos: o.photos.map((ph) =>
                    ph.uploadStatus === "uploading" &&
                    !ph.markerPhotoStoragePath
                      ? { ...ph, uploadStatus: "error" as const }
                      : ph,
                  ),
                },
          ),
        })),
      );
      throw e;
    }
  }

  // Upload handler — keep local preview, only add persistence info; then rehydrate.
  const uploadImage: UploadFn = async (file, side, scope) => {
    if (scope !== "side") {
      return { status: "success", path: "" }; // skip detail uploads for now
    }

    if (!supabase) return { status: "error", error: "Not initialised" };
    if (!uploadsEnabled) return { status: "error", error: "Not signed in" };
    if (!reportId || !orgId)
      return { status: "error", error: "Report not ready" };

    try {
      const { blob } = await normalizeImage(file, {
        maxSide: 3000,
        targetMime: "image/jpeg",
        quality: 0.85,
        maxBytes: IMAGE_MAX_BYTES,
      });
      // name it with the *actual* blob:
      const path = makeSidePathFromBlob(
        orgId,
        reportId,
        side,
        blob,
        file.lastModified,
      );

      let res = await uploadToSupabase(supabase, "asset-images", path, blob);

      if (!res.ok) {
        const signed = await uploadViaSignedUrl(
          supabase,
          "asset-images",
          path,
          blob,
        );
        if (!signed.ok) {
          console.error("[uploadImage] Supabase upload failed:", signed.error);
          setPhotos((prev) =>
            prev.map((p) =>
              p.side === side
                ? {
                    ...p,
                    image: p.image
                      ? { ...p.image, uploadStatus: "error" as const }
                      : null,
                  }
                : p,
            ),
          );
          return { status: "error", error: signed.error };
        }
        res = signed;
      }

      const { sidePhotoId } = await upsertSidePhoto({
        reportId,
        side,
        storagePath: res.path,
      });

      localUploadCount.current += 1;

      // Only add persistence info; keep the current previewUrl (object URL) if present
      setPhotos((prev) =>
        prev.map((p) =>
          p.side === side
            ? {
                ...p,
                image: p.image
                  ? {
                      ...p.image,
                      imageStoragePath: res.path,
                      uploadStatus: "success" as const,
                    }
                  : ({
                      // if somehow there wasn't an image (shouldn't happen), add a minimal record
                      imageStoragePath: res.path,
                      uploadStatus: "success" as const,
                    } as UploadedImage),
              }
            : p,
        ),
      );

      // enable markers immediately
      handleSidePhotoPersisted(side, sidePhotoId);

      // fetch signed URL(s) in background
      bumpImages();

      return { status: "success", path: res.path, sidePhotoId };
    } catch (e) {
      console.error("[uploadImage] Exception:", e);
      const msg = e instanceof Error ? e.message : "Upload failed";
      // ⬇️ flip the UI to error so anyUploading becomes false after user removes/retries
      setPhotos((prev) =>
        prev.map((p) =>
          p.side === side
            ? {
                ...p,
                image: p.image
                  ? { ...p.image, uploadStatus: "error" as const }
                  : null,
              }
            : p,
        ),
      );
      return { status: "error", error: msg };
    }
  };

  async function handleDiscardDraft() {
    if (!reportId) return;
    try {
      const oldId = reportId;

      // 1) Soft-delete the current draft
      const res = await discardDraftReport(reportId);
      console.info("[discard] summary:", res);

      // 2) Prevent any effect from using the old id
      setReportId(null);

      // 3) Tell the hydrate effect not to re-seed scalars once
      justDiscardedRef.current = true;

      // 4) Clear local form state
      setOdometer("");
      setNotes("");
      setLevelIncluded({});
      setLevelValues({});
      lastSavedRef.current = "";

      setSuppressInitialBanner(true);
      setHadPreExistingImages(false);
      localUploadCount.current = 0;

      // 5) Push a cleared draft to parent immediately
      onChange({
        inspectorId: condition?.inspectorId ?? "temp-user",
        id: undefined,
        assetId: assetId ?? null,
        reportType: condition?.reportType ?? reportType,
        odometer: undefined,
        notes: "",
        vehicleLevels: {},
        updatedAt: undefined,
        sidesUi: SIDES.map((side) => ({ side, image: null, observations: [] })),
        sidePhotoIdBySide: {},
      });

      // 6) Pause inputs until we have the new draft id
      hydratedScalarsRef.current = false;
      setUploadsReady(false);

      // 7) Immediately create a new draft (skip waiting for effects)
      if (assetId) {
        const fresh = await ensureDraftWithScalars({
          assetId,
          reportType,
          createBlank: true,
        });
        setReportId(fresh.id);
        onChange({
          inspectorId: condition?.inspectorId ?? "temp-user",
          id: fresh.id,
          assetId,
          reportType,
          odometer: undefined,
          notes: "",
          vehicleLevels: {},
          updatedAt: undefined,
          sidesUi: SIDES.map((side) => ({
            side,
            image: null,
            observations: [],
          })),
          sidePhotoIdBySide: {},
        });
        lastSavedRef.current = JSON.stringify(
          buildSnapshot({ odometer: "", notes: "", vehicleLevels: {} }),
        );
        setUploadsReady(true);
      }

      console.info("[discard] removed draft", oldId, "→ created a fresh one");
    } catch (e) {
      console.error(e);
      // TODO: toast
    }
  }

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const errors: Record<string, string> = {};
    if (!odometer) errors.odometer = "Please enter the vehicle mileage.";
    if (!hasFrontPhoto)
      errors.photos = "Please add a front photo before you continue.";
    if (anyUploading)
      errors.images = "Please wait for all images to finish uploading.";
    if (anyErrored)
      errors.images = "Please remove or retry images that failed to upload.";

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      if (errors.odometer) {
        odometerRef.current?.focus();
        odometerRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }
      return;
    }

    const vehicleLevelsForSubmit: Record<string, number | null> =
      activeLevels.reduce(
        (acc, l) => {
          const key = l.key as VehicleLevelType;
          acc[key] = levelIncluded[key] ? (levelValues[key] ?? null) : null;
          return acc;
        },
        {} as Record<string, number | null>,
      );

    const nextReport: ConditionReportDraft = {
      id: reportId ?? condition?.id ?? "temp-condition",
      assetId: condition?.assetId ?? assetId ?? "temp-asset",
      reportType: condition?.reportType ?? reportType,
      odometer: odometer ? parseInt(odometer, 10) : undefined,
      vehicleLevels: vehicleLevelsForSubmit,
      notes,
      inspectorId: condition?.inspectorId ?? "temp-user",
    };

    const merged: ConditionReportDraft = condition
      ? { ...condition, ...nextReport }
      : nextReport;

    onChange(merged);

    const currentSnap = buildSnapshot({
      odometer,
      notes,
      vehicleLevels: vehicleLevelsForSubmit,
    });
    const currentStr = JSON.stringify(currentSnap);
    const mustSave = !!reportId && currentStr !== lastSavedRef.current;

    if (!reportId) {
      console.warn("[ConditionStep] Draft not ready; skipping DB update");
      onNext(); // proceed anyway
      return;
    }

    if (mustSave) {
      try {
        setSubmitting(true);
        await updateDraftReport(reportId, {
          odometer: currentSnap.odometer,
          notes: currentSnap.notes,
          vehicleLevels: currentSnap.vehicleLevels,
        });

        // optimistic banner refresh
        onChange({ ...merged, updatedAt: new Date().toISOString() });
        lastSavedRef.current = currentStr;

        setSuppressInitialBanner(false);
        onNext(); // ✅ only after a successful save
      } catch (e) {
        console.error("[ConditionStep] Failed to update draft report", e);
        // Optional: surface a toast and STOP here so user can retry
        return;
      } finally {
        setSubmitting(false);
      }
    } else {
      // nothing changed; just proceed
      onNext();
    }
  };

  return (
    <form onSubmit={handleSubmit} aria-busy={submitting} className="space-y-8">
      {showDraftBanner && (
        <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          <span>
            Draft loaded — last saved <strong>{lastSaved}</strong>.
          </span>
          <button
            type="button"
            onClick={handleDiscardDraft}
            className="text-blue-700 underline hover:text-blue-900"
          >
            Discard and start new
          </button>
        </div>
      )}
      <section className="space-y-2">
        <h3 className="mb-2 font-semibold">Photos</h3>
        {/* {!hasFrontPhoto ? (
          <p className="text-xs text-[#B23A48]">
            Front photo required to continue.
          </p>
        ) : (
          <p className="text-xs text-[#2D3ECD]">Front photo added ✓</p>
        )} */}

        <fieldset disabled={inputsDisabled} aria-disabled={inputsDisabled}>
          <SidePhotosAnnotator
            photos={photos}
            onPhotosChange={setPhotos}
            uploadImage={uploadImage}
            createMarkerForSide={createMarkerForSide}
            uploadMarkerPhoto={uploadMarkerPhoto}
            onSidePhotoPersisted={handleSidePhotoPersisted}
            canAnnotateSides={{
              front: !!condition?.sidePhotoIdBySide?.front || hasLocal("front"),
              nearside:
                !!condition?.sidePhotoIdBySide?.nearside ||
                hasLocal("nearside"),
              back: !!condition?.sidePhotoIdBySide?.back || hasLocal("back"),
              offside:
                !!condition?.sidePhotoIdBySide?.offside || hasLocal("offside"),
              interior:
                !!condition?.sidePhotoIdBySide?.interior ||
                hasLocal("interior"),
            }}
          />
        </fieldset>
        {inputsDisabled && (
          <div className="pointer-events-auto absolute inset-0 z-50 grid place-items-center bg-white/70 backdrop-blur-sm transition-opacity">
            <p className="text-xs text-gray-600">Preparing your report…</p>
          </div>
        )}
      </section>
      <section className="space-y-4">
        <div className="grid gap-6">
          <FormField
            label="Odometer"
            htmlFor="odometer"
            required
            helperText="Enter mileage in miles"
            error={formErrors.odometer}
          >
            <Input
              id="odometer"
              placeholder="e.g. 23,000"
              type="number"
              min={0}
              value={odometer}
              onChange={(e) => setOdometer(e.target.value)}
              autoComplete="off"
              ref={odometerRef}
            />
          </FormField>
        </div>
      </section>
      <div className="bg-muted/40 space-y-3 rounded-md border p-4">
        <Label className="mb-1 text-base font-semibold">Vehicle levels</Label>
        <span className="text-muted-foreground mb-3 block text-xs">
          Switch on and set the slider if measured during{" "}
          {reportType.replace("-", " ")}.
        </span>
        {activeLevels.map((level) => (
          <div key={level.key} className="flex flex-col gap-2">
            <Label
              htmlFor={`level-include-${level.key}`}
              className="font-medium"
            >
              {level.label}
            </Label>
            <div className="flex w-full items-center gap-3">
              <Switch
                id={`level-include-${level.key}`}
                checked={!!levelIncluded[level.key]}
                onCheckedChange={(checked) =>
                  handleLevelCheckboxChange(level.key, checked)
                }
              />
              {levelIncluded[level.key] ? (
                <div className="flex flex-1 items-center gap-2">
                  <Slider
                    id={level.key}
                    min={0}
                    max={1}
                    step={0.05}
                    value={[levelValues[level.key] ?? 0.5]}
                    onValueChange={([v]) =>
                      handleLevelSliderChange(level.key, v)
                    }
                    className="w-full"
                    aria-label={`${level.label} slider`}
                    disabled={!levelIncluded[level.key]}
                  />
                  <span className="min-w-10 text-right text-sm">
                    {`${Math.round((levelValues[level.key] ?? 0.5) * 100)}%`}
                  </span>
                </div>
              ) : (
                <span className="text-muted-foreground ml-4 text-sm italic">
                  Not recorded
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-4 flex gap-2">
        <CancelButton
          onClick={onBack}
          text="Back"
          className="flex-1"
          disabled={submitting}
        />
        <NextButton
          isLoading={submitting}
          disabled={!canProceed || submitting}
          text={submitting ? "Saving…" : "Next"}
          className="flex-1"
          type="submit"
        />
      </div>
    </form>
  );
}
