import { AI_ANALYSIS_IMAGE_DIMENSION } from "@/lib/product-image-constraints";

const TARGET_IMAGE_SIZE = 425 * 1024;
const MAX_IMAGE_DIMENSION = 1920;
const ANALYSIS_IMAGE_QUALITY = 0.8;

type DecodedImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  close: () => void;
};

function loadHtmlImage(file: Blob): Promise<DecodedImage> {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      resolve({
        height: image.naturalHeight,
        source: image,
        width: image.naturalWidth,
        close: () => URL.revokeObjectURL(objectUrl),
      });
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("IMAGE_DECODE_FAILED"));
    };
    image.src = objectUrl;
  });
}

async function decodeImage(file: Blob): Promise<DecodedImage> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file, {
        imageOrientation: "from-image",
      });

      return {
        height: bitmap.height,
        source: bitmap,
        width: bitmap.width,
        close: () => bitmap.close(),
      };
    } catch {
      // Safari can decode some camera formats through an HTML image even when
      // createImageBitmap does not support them.
    }
  }

  return loadHtmlImage(file);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: "image/webp" | "image/jpeg",
  quality: number,
) {
  return new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, type, quality);
  });
}

function optimizedFileName(originalName: string, extension: string) {
  const baseName = originalName.replace(/\.[^.]+$/, "").slice(0, 220);
  return `${baseName || "product-photo"}.${extension}`;
}

export async function optimizeProductImage(file: File): Promise<File> {
  if (
    file.size <= TARGET_IMAGE_SIZE &&
    file.type !== "image/heic" &&
    file.type !== "image/heif"
  ) {
    return file;
  }

  const image = await decodeImage(file);

  try {
    const initialScale = Math.min(
      1,
      MAX_IMAGE_DIMENSION / Math.max(image.width, image.height),
    );
    const attempts = [
      { scale: 1, quality: 0.84 },
      { scale: 1, quality: 0.74 },
      { scale: 0.86, quality: 0.76 },
      { scale: 0.86, quality: 0.66 },
      { scale: 0.72, quality: 0.7 },
      { scale: 0.6, quality: 0.64 },
      { scale: 0.5, quality: 0.58 },
    ];
    let smallestBlob: Blob | null = null;

    for (const attempt of attempts) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(
        1,
        Math.round(image.width * initialScale * attempt.scale),
      );
      canvas.height = Math.max(
        1,
        Math.round(image.height * initialScale * attempt.scale),
      );
      const context = canvas.getContext("2d", { alpha: true });

      if (!context) {
        throw new Error("IMAGE_CANVAS_UNAVAILABLE");
      }

      context.drawImage(image.source, 0, 0, canvas.width, canvas.height);

      let blob = await canvasToBlob(canvas, "image/webp", attempt.quality);

      if (!blob || blob.type !== "image/webp") {
        blob = await canvasToBlob(canvas, "image/jpeg", attempt.quality);
      }

      canvas.width = 1;
      canvas.height = 1;

      if (!blob) {
        continue;
      }

      if (!smallestBlob || blob.size < smallestBlob.size) {
        smallestBlob = blob;
      }

      if (blob.size <= TARGET_IMAGE_SIZE) {
        break;
      }
    }

    if (!smallestBlob) {
      throw new Error("IMAGE_ENCODE_FAILED");
    }

    const isWebp = smallestBlob.type === "image/webp";

    return new File(
      [smallestBlob],
      optimizedFileName(file.name, isWebp ? "webp" : "jpg"),
      {
        type: isWebp ? "image/webp" : "image/jpeg",
        lastModified: file.lastModified,
      },
    );
  } finally {
    image.close();
  }
}

// The copy sent to the AI, not the one stored. Always re-encoded, never passed through like
// small files are above: drawing to a canvas is what strips EXIF — including a phone's GPS
// position — before the photo leaves for a third party.
//
// JPEG rather than WebP because it is the format every vision model accepts without
// question, and a single fixed attempt because the size target here is loose (1MB cap for a
// ~150KB image); the retry ladder above exists for a much tighter storage budget.
export async function prepareImageForAnalysis(source: Blob): Promise<Blob> {
  const image = await decodeImage(source);

  try {
    const scale = Math.min(
      1,
      AI_ANALYSIS_IMAGE_DIMENSION / Math.max(image.width, image.height),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("IMAGE_CANVAS_UNAVAILABLE");
    }

    // JPEG has no alpha channel, so a transparent PNG would otherwise come out black — and
    // the model would then report a black product.
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image.source, 0, 0, canvas.width, canvas.height);

    const blob = await canvasToBlob(canvas, "image/jpeg", ANALYSIS_IMAGE_QUALITY);
    canvas.width = 1;
    canvas.height = 1;

    if (!blob) {
      throw new Error("IMAGE_ENCODE_FAILED");
    }

    return blob;
  } finally {
    image.close();
  }
}
