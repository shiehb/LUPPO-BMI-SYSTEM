"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Check, Loader2, RotateCcw, RotateCw, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Layout constants (mirrored from BmiMonitoringFormPrint.tsx — DO NOT EDIT) ─
const _PAGE_MARGIN  = 36;
const _USABLE_W     = 841.89 - _PAGE_MARGIN * 2;
const _PHOTO_COL_W  = _USABLE_W * 0.50;
const _PHOTO_CELL_W = Math.floor(_PHOTO_COL_W / 3) - 2;  // 126 pt
const _PHOTO_ROW_H  = 243;
const _LABEL_H      = 18;
const _IMG_AREA_H   = _PHOTO_ROW_H - _LABEL_H;           // 225 pt

export const CROP_W      = _PHOTO_CELL_W;          // 126
export const CROP_H      = _IMG_AREA_H;             // 225
export const CROP_ASPECT = CROP_W / CROP_H;         // ≈ 0.56

export interface PhotoCropperProps {
  /** Data URL produced by FileReader — never a blob/object URL. */
  src:       string;
  title?:    string;
  onConfirm: (file: File, preview: string) => void;
  onCancel:  () => void;
}

export function PhotoCropper({ src, title, onConfirm, onCancel }: PhotoCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  // `ready` becomes true when Cropper.js fires onInitialized.
  // Buttons are disabled until then so no instance methods are called prematurely.
  const [ready, setReady] = useState(false);

  // `mounted` gates the createPortal call.
  // useEffect only runs client-side, so document.body is always available by
  // the time we try to portal into it.
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);

  // Reset ready state whenever the source image changes
  // (key={src} on <Cropper> handles re-mount, but we also reset the flag).
  useEffect(() => { setReady(false); }, [src]);

  function handleConfirm() {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;

    // Output at 4× the print dimensions (504×900 px) for acceptable screen quality.
    // CROP_W/CROP_H define the aspect ratio for the print form — not the storage resolution.
    const canvas = cropper.getCroppedCanvas({ width: CROP_W * 4, height: CROP_H * 4 });
    if (!canvas) return;

    const preview = canvas.toDataURL("image/jpeg", 0.92);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], "photo.jpg", { type: "image/jpeg" }), preview);
      },
      "image/jpeg",
      0.92
    );
  }

  // Guard every instance method — cropper may still be null if called too early.
  function rotate(deg: number) {
    cropperRef.current?.cropper?.rotate(deg);
  }
  function zoom(ratio: number) {
    cropperRef.current?.cropper?.zoom(ratio);
  }

  if (!mounted) return null;

  // createPortal renders the overlay as a direct child of document.body,
  // keeping it out of the form's DOM subtree and avoiding stacking-context /
  // removeChild hydration issues entirely.
  return createPortal(
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0 bg-black/80">
        <span className="text-sm font-medium text-white">
          {title ?? "Crop Photo"}
        </span>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
          aria-label="Cancel"
        >
          <X className="size-5" />
        </button>
      </div>

      {/* ── Cropper fills remaining height ── */}
      <div className="relative flex-1 min-h-0">
        {!ready && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black">
            <Loader2 className="size-6 animate-spin text-white/50" />
          </div>
        )}
        {/*
          key={src} forces a full Cropper remount whenever the source changes,
          so the instance is never reused against a stale image element.
        */}
        <Cropper
          key={src}
          ref={cropperRef}
          src={src}
          aspectRatio={CROP_ASPECT}
          viewMode={1}
          dragMode="move"
          autoCropArea={0.9}
          responsive
          restore={false}
          // Touch / mobile-friendly options
          zoomable={true}
          zoomOnTouch={true}
          zoomOnWheel={true}
          movable={true}
          cropBoxMovable={true}
          cropBoxResizable={true}
          onInitialized={() => setReady(true)}
          style={{ width: "100%", height: "100%", touchAction: "none" }}
        />
      </div>

      {/* ── Bottom toolbar ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 bg-black/80">
        <div className="flex gap-2">
          <Button
            type="button" size="icon" variant="secondary"
            title="Rotate left 90°" disabled={!ready}
            onClick={() => rotate(-90)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Rotate right 90°" disabled={!ready}
            onClick={() => rotate(90)}
          >
            <RotateCw className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Zoom in" disabled={!ready}
            onClick={() => zoom(0.1)}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Zoom out" disabled={!ready}
            onClick={() => zoom(-0.1)}
          >
            <ZoomOut className="size-4" />
          </Button>
        </div>

        <Button
          type="button"
          disabled={!ready}
          onClick={handleConfirm}
          className="gap-1.5"
        >
          <Check className="size-4" />
          Use Photo
        </Button>
      </div>
    </div>,
    document.body
  );
}
