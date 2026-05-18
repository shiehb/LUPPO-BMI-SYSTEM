"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut } from "lucide-react";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export interface PhotoViewerProps {
  src: string;
  alt: string;
  onClose: () => void;
}

export function PhotoViewer({ src, alt, onClose }: PhotoViewerProps) {
  const [zoom, setZoom] = useState(1);
  const [mounted, setMounted] = useState(false);

  // SSR guard — document.body is not available during server rendering
  useEffect(() => { setMounted(true); }, []);

  // Lock body scroll while viewer is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // Close on Escape key
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  // Reset zoom whenever the image changes
  useEffect(() => { setZoom(1); }, [src]);

  if (!mounted) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      className="fixed inset-0 z-50 flex flex-col bg-black"
    >
      {/* ── Top bar ── */}
      <div className="shrink-0 flex items-center justify-between px-4 py-3 bg-black/80 backdrop-blur-sm">
        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(MIN_ZOOM, +(z - ZOOM_STEP).toFixed(1)))}
            disabled={zoom <= MIN_ZOOM}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Zoom out"
          >
            <ZoomOut className="size-5" />
          </button>
          <span className="text-xs text-white/60 tabular-nums w-8 text-center">
            {zoom}×
          </span>
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(MAX_ZOOM, +(z + ZOOM_STEP).toFixed(1)))}
            disabled={zoom >= MAX_ZOOM}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Zoom in"
          >
            <ZoomIn className="size-5" />
          </button>
        </div>

        {/* Label + close */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-white/50 truncate max-w-[160px]">{alt}</span>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
            aria-label="Close photo viewer"
          >
            <X className="size-5" />
          </button>
        </div>
      </div>

      {/* ── Scroll area ── */}
      <div
        className={cn(
          "flex-1 min-h-0 overflow-auto flex",
          zoom > 1 ? "items-start justify-start p-4" : "items-center justify-center"
        )}
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          onClick={(e) => e.stopPropagation()}
          style={{
            height: `${zoom * 90}vh`,
            width: "auto",
            maxWidth: zoom === 1 ? "90vw" : "none",
            display: "block",
          }}
        />
      </div>
    </div>,
    document.body
  );
}
