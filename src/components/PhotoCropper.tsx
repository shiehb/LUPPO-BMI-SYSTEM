"use client";

import { useRef } from "react";
import Cropper, { type ReactCropperElement } from "react-cropper";
import "cropperjs/dist/cropper.css";
import { Check, RotateCcw, RotateCw, ZoomIn, ZoomOut, X } from "lucide-react";
import { Button } from "@/components/ui/button";

// ── Layout constants (mirrored from BmiMonitoringFormPrint.tsx — DO NOT EDIT) ─
const _PAGE_MARGIN  = 36;
const _USABLE_W     = 841.89 - _PAGE_MARGIN * 2;
const _PHOTO_COL_W  = _USABLE_W * 0.50;
const _PHOTO_CELL_W = Math.floor(_PHOTO_COL_W / 3) - 2;
const _PHOTO_FIT_W  = _PHOTO_CELL_W - 4;          // 122 pt
const _PHOTO_ROW_H  = 243;
const _LABEL_H      = 18;
const _IMG_AREA_H   = _PHOTO_ROW_H - _LABEL_H;    // 225 pt

export const CROP_ASPECT = _PHOTO_FIT_W / _IMG_AREA_H;                         // ≈ 0.5422
export const CROP_OUT_W  = 400;
export const CROP_OUT_H  = Math.round(CROP_OUT_W * _IMG_AREA_H / _PHOTO_FIT_W); // ≈ 738

export interface PhotoCropperProps {
  src:       string;
  title?:    string;
  onConfirm: (file: File, preview: string) => void;
  onCancel:  () => void;
}

export function PhotoCropper({ src, title, onConfirm, onCancel }: PhotoCropperProps) {
  const cropperRef = useRef<ReactCropperElement>(null);

  function handleConfirm() {
    const cropper = cropperRef.current?.cropper;
    if (!cropper) return;
    const canvas  = cropper.getCroppedCanvas({ width: CROP_OUT_W, height: CROP_OUT_H });
    const preview = canvas.toDataURL("image/jpeg", 0.88);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        onConfirm(new File([blob], "photo.jpg", { type: "image/jpeg" }), preview);
      },
      "image/jpeg",
      0.88
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">

      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 shrink-0">
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

      {/* ── Cropper — fills remaining height ── */}
      <div className="flex-1 min-h-0">
        <Cropper
          ref={cropperRef}
          src={src}
          aspectRatio={CROP_ASPECT}
          viewMode={1}
          dragMode="move"
          autoCropArea={0.9}
          responsive
          restore={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {/* ── Bottom toolbar ── */}
      <div className="shrink-0 flex items-center justify-between gap-3 px-4 py-4 bg-black/80">
        {/* Transform tools */}
        <div className="flex gap-2">
          <Button
            type="button" size="icon" variant="secondary"
            title="Rotate left 90°"
            onClick={() => cropperRef.current?.cropper.rotate(-90)}
          >
            <RotateCcw className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Rotate right 90°"
            onClick={() => cropperRef.current?.cropper.rotate(90)}
          >
            <RotateCw className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Zoom in"
            onClick={() => cropperRef.current?.cropper.zoom(0.1)}
          >
            <ZoomIn className="size-4" />
          </Button>
          <Button
            type="button" size="icon" variant="secondary"
            title="Zoom out"
            onClick={() => cropperRef.current?.cropper.zoom(-0.1)}
          >
            <ZoomOut className="size-4" />
          </Button>
        </div>

        {/* Confirm */}
        <Button type="button" onClick={handleConfirm} className="gap-1.5">
          <Check className="size-4" />
          Use Photo
        </Button>
      </div>
    </div>
  );
}
