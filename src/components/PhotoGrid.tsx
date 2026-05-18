"use client";

import { useState } from "react";
import { ZoomIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { PhotoViewer } from "@/components/PhotoViewer";

export interface PhotoEntry {
  label: string;
  url: string | null;
}

export interface PhotoGridProps {
  photos: PhotoEntry[];
  /** Tailwind classes for the grid container. Default: "grid gap-4 sm:grid-cols-3" */
  gridClassName?: string;
  /** If provided, appended to the label in the UI and alt text (e.g. "View" → "Right View") */
  labelSuffix?: string;
}

export function PhotoGrid({ photos, gridClassName, labelSuffix }: PhotoGridProps) {
  const [selectedPhoto, setSelectedPhoto] = useState<{ src: string; alt: string } | null>(null);

  return (
    <>
      <div className={cn("grid gap-4 sm:grid-cols-3", gridClassName)}>
        {photos.map(({ label, url }) => {
          const displayLabel = labelSuffix ? `${label} ${labelSuffix}` : label;
          return (
            <div key={label} className="flex flex-col gap-1.5">
              <p className="text-center text-xs font-medium text-muted-foreground">
                {displayLabel}
              </p>
              {url ? (
                <button
                  type="button"
                  className="group relative overflow-hidden rounded-lg border bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  onClick={() => setSelectedPhoto({ src: url, alt: displayLabel })}
                  aria-label={`View ${displayLabel} full screen`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={url}
                    alt={displayLabel}
                    className="w-full h-auto block"
                  />
                  {/* Hover hint overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors duration-150">
                    <ZoomIn className="size-7 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-150 drop-shadow-md" />
                  </div>
                </button>
              ) : (
                <div className="flex aspect-[3/4] items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
                  Not uploaded
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedPhoto && (
        <PhotoViewer
          src={selectedPhoto.src}
          alt={selectedPhoto.alt}
          onClose={() => setSelectedPhoto(null)}
        />
      )}
    </>
  );
}
