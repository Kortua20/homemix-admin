"use client";

import Lightbox from "yet-another-react-lightbox";
import Counter from "yet-another-react-lightbox/plugins/counter";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

// The full-screen photo viewer for the product detail page. Loaded with next/dynamic, so
// the library stays out of the page's bundle until a photo is opened.
//
// Mirrors the storefront's viewer (components/image-lightbox.tsx there) — same library,
// same settings — so staff see a photo exactly as a customer can inspect it. Kept as a
// copy rather than shared: the two repos share a database, not code.
//
// A library rather than a hand-rolled overlay: pinch-zoom, panning within bounds,
// double-tap, wheel zoom, swipe and pull-down-to-close are fiddly to get right and cannot
// be verified in jsdom. It also brings the dialog semantics this repo otherwise gets from
// Radix: focus trap, Escape, focus restored to the trigger, scroll lock.
//
// The backdrop is the library's neutral black on purpose: a tinted one shifts how the
// upholstery and wood colours read.

export type LightboxImage = {
  src: string;
  alt: string;
};

const labels = {
  Lightbox: "ფოტოს დათვალიერება",
  "Photo gallery": "ფოტოგალერეა",
  Carousel: "ფოტოები",
  Slide: "ფოტო",
  "{index} of {total}": "ფოტო {index} / {total}",
  Previous: "წინა ფოტო",
  Next: "შემდეგი ფოტო",
  Close: "დახურვა",
  "Zoom in": "გადიდება",
  "Zoom out": "დაპატარავება",
  Thumbnails: "მინიატურები",
};

// With a single photo there is nothing to navigate to, so the arrows are not rendered at
// all rather than shown disabled.
const singleImageRender = {
  buttonPrev: () => null,
  buttonNext: () => null,
};

// Render it only while the viewer should be shown: it opens on mount, plays its own
// fade-out on close and only then calls onClose, at which point the caller unmounts it.
export function ProductImageLightbox({
  images,
  index,
  onClose,
}: {
  images: LightboxImage[];
  index: number;
  onClose: () => void;
}) {
  const hasMany = images.length > 1;

  return (
    <Lightbox
      open
      close={onClose}
      index={index}
      slides={images}
      plugins={hasMany ? [Zoom, Thumbnails, Counter] : [Zoom]}
      labels={labels}
      render={hasMany ? undefined : singleImageRender}
      // Finite: in wrap-around mode the thumbnail strip repeats photos at its ends
      // (4 · 1 · 2 · 3 · 4), which reads as a duplicate, while a finite one shows the real
      // order and a disabled arrow says "last photo".
      //
      // `preload` is the photo count because it also sizes the thumbnail strip (current
      // ± preload): any less and the strip silently leaves photos out. It means every
      // full-size photo is fetched on open — the grid behind it has already loaded the
      // same URLs, so they come from the browser cache.
      carousel={{ finite: true, preload: images.length }}
      controller={{ closeOnPullDown: true, closeOnBackdropClick: true }}
      zoom={{
        // Up to 2 image pixels per screen pixel: enough to inspect a scratch or a seam,
        // without zooming so far past the source that it turns to mush.
        maxZoomPixelRatio: 2,
        // A plain wheel / trackpad scroll zooms, as in other photo viewers. Navigation is
        // still on the arrows, the keyboard and horizontal swipes.
        scrollToZoom: true,
      }}
      thumbnails={{
        width: 80,
        height: 60,
        border: 2,
        // Only the active thumbnail gets a (white) border; the library's default outlines
        // every thumbnail alike, which leaves the current photo ambiguous.
        borderColor: "transparent",
        borderRadius: 6,
        padding: 0,
        gap: 8,
        imageFit: "cover",
        vignette: false,
      }}
      styles={{ thumbnailsContainer: { padding: 12 } }}
    />
  );
}
