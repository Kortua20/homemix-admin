import "server-only";

import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";

const imageExtensions: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

type R2Config = {
  bucket: string;
  client: S3Client;
};

let cachedConfig: R2Config | null = null;

function getR2Config(): R2Config {
  if (cachedConfig) {
    return cachedConfig;
  }

  const accountId = process.env.R2_ACCOUNT_ID?.trim();
  const bucket = process.env.R2_BUCKET_NAME?.trim();
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const endpoint =
    process.env.R2_ENDPOINT?.trim() ||
    (accountId
      ? `https://${accountId}.r2.cloudflarestorage.com`
      : undefined);

  if (!bucket || !accessKeyId || !secretAccessKey || !endpoint) {
    throw new Error("R2_CONFIGURATION_MISSING");
  }

  cachedConfig = {
    bucket,
    client: new S3Client({
      region: "auto",
      endpoint,
      credentials: { accessKeyId, secretAccessKey },
    }),
  };

  return cachedConfig;
}

export async function uploadProductImage(productId: string, file: File) {
  const extension = imageExtensions[file.type];

  if (!extension) {
    throw new Error("UNSUPPORTED_PRODUCT_IMAGE");
  }

  const objectKey = `products/${productId}/${crypto.randomUUID()}.${extension}`;
  const { bucket, client } = getR2Config();

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: objectKey,
      Body: Buffer.from(await file.arrayBuffer()),
      ContentType: file.type,
      CacheControl: "private, max-age=3600",
      Metadata: {
        originalName: encodeURIComponent(file.name).slice(0, 1024),
      },
    }),
  );

  return {
    objectKey,
    originalName: file.name.slice(0, 255),
    contentType: file.type,
    sizeBytes: file.size,
  };
}

export async function deleteR2Objects(objectKeys: string[]) {
  if (objectKeys.length === 0) {
    return;
  }

  const { bucket, client } = getR2Config();

  await Promise.all(
    objectKeys.map((objectKey) =>
      client.send(
        new DeleteObjectCommand({
          Bucket: bucket,
          Key: objectKey,
        }),
      ),
    ),
  );
}

export async function getR2Object(objectKey: string) {
  const { bucket, client } = getR2Config();

  return client.send(
    new GetObjectCommand({
      Bucket: bucket,
      Key: objectKey,
    }),
  );
}
