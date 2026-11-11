"use client";

import { Expand } from "lucide-react";
import dynamic from "next/dynamic";
import { useMemo, useState } from "react";

import type { ProductImage } from "@/components/products/types";
import { getProductImageUrl } from "@/lib/product-data";

// The viewer is only needed once a photo is opened, so its code is fetched then — and
// warmed on hover / focus of a photo, so the first open does not wait on the network.
const loadLightbox = () => import("@/components/products/product-image-lightbox");
const ProductImageLightbox = dynamic(
  () => loadLightbox().then((module) => module.ProductImageLightbox),
  { ssr: false },
);

// The product detail page's photo grid: the lead photo full-width, the rest in pairs.
// Every photo opens the full-screen viewer at that photo.
export function ProductPhotoGallery({
  images,
  productName,
}: {
  images: ProductImage[];
  productName: string;
}) {
  // The photo the viewer was opened on, or null while it is closed.
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  // Memoised for correctness, not speed: the lightbox treats a new slides array as new
  // content and resets its position, which would interrupt a slide animation whenever
  // this component re-renders.
  const slides = useMemo(
    () =>
      images.map((image, index) => ({
        src: getProductImageUrl(image.id),
        alt: `${productName} — ფოტო ${index + 1}`,
      })),
    [images, productName],
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        {images.map((image, index) => (
          <button
            key={image.id}
            type="button"
            aria-haspopup="dialog"
            aria-label={`ფოტო ${index + 1}-ის გადიდება`}
            onClick={() => setOpenIndex(index)}
            onPointerEnter={() => void loadLightbox()}
            onFocus={() => void loadLightbox()}
            className={`group relative cursor-zoom-in overflow-hidden rounded-2xl bg-image-placeholder focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-walnut ${
              index === 0 ? "col-span-2 aspect-4/3" : "aspect-square"
            }`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getProductImageUrl(image.id)}
              alt={`${productName} — ფოტო ${index + 1}`}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.02] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
            />
            {/* Shown on hover / focus on a pointer device, always on touch screens, where
                there is no zoom cursor to hint that the photo opens. */}
            <span
              aria-hidden="true"
              className="absolute right-3 bottom-3 grid size-9 place-items-center rounded-full bg-white/95 text-ink shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-opacity pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-visible:opacity-100"
            >
              <Expand className="size-4" />
            </span>
          </button>
        ))}
      </div>

      {/* Rendered only while open, which is also what defers loading its code. */}
      {openIndex !== null ? (
        <ProductImageLightbox
          images={slides}
          index={openIndex}
          onClose={() => setOpenIndex(null)}
        />
      ) : null}
    </>
  );
}
