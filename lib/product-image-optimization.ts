const TARGET_IMAGE_SIZE = 425 * 1024;
const MAX_IMAGE_DIMENSION = 1920;

type DecodedImage = {
  height: number;
  source: CanvasImageSource;
  width: number;
  close: () => void;
};

function loadHtmlImage(file: File): Promise<DecodedImage> {
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

async function decodeImage(file: File): Promise<DecodedImage> {
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
