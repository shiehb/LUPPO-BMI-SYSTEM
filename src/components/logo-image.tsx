"use client"

import Image from "next/image"
import { useState } from "react"
import { cn } from "@/lib/utils"

interface LogoImageProps {
  src: string
  alt: string
  className?: string
}

export function LogoImage({ src, alt, className }: LogoImageProps) {
  const [failed, setFailed] = useState(false)

  const sizeClass = className ?? "h-16 w-16"

  if (failed) {
    return (
      <div
        className={cn(sizeClass, "rounded-full bg-slate-200 flex items-center justify-center shrink-0")}
        aria-label={alt}
      >
        <span className="text-[10px] text-slate-500 font-bold text-center leading-tight px-1 uppercase">
          {alt}
        </span>
      </div>
    )
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={64}
      height={64}
      className={cn(sizeClass, "object-contain shrink-0")}
      onError={() => setFailed(true)}
    />
  )
}
