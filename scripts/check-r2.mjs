import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { randomUUID } from "node:crypto";
import nextEnv from "@next/env";

const { loadEnvConfig } = nextEnv;
loadEnvConfig(process.cwd());

const requiredVariables = [
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_ENDPOINT",
];
const missingVariables = requiredVariables.filter(
  (name) => !process.env[name]?.trim(),
);

if (missingVariables.length > 0) {
  console.error(`Missing variables: ${missingVariables.join(", ")}`);
  process.exit(1);
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  },
});

try {
  await client.send(
    new HeadBucketCommand({ Bucket: process.env.R2_BUCKET_NAME }),
  );
  console.log("R2 bucket credentials verified.");

  if (process.argv.includes("--roundtrip")) {
    const objectKey =
      `products/00000000-0000-4000-8000-000000000000/${randomUUID()}.png`;
    const imageBytes = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    );

    try {
      await client.send(
        new PutObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
          Body: imageBytes,
          ContentType: "image/png",
        }),
      );
      const storedObject = await client.send(
        new GetObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
        }),
      );
      const storedBytes = await storedObject.Body?.transformToByteArray();

      if (!storedBytes || storedBytes.byteLength !== imageBytes.byteLength) {
        throw new Error("R2_ROUNDTRIP_MISMATCH");
      }

      console.log("R2 upload/download roundtrip verified.");
    } finally {
      await client.send(
        new DeleteObjectCommand({
          Bucket: process.env.R2_BUCKET_NAME,
          Key: objectKey,
        }),
      );
      console.log("R2 diagnostic object removed.");
    }
  }
} catch (error) {
  console.error(
    `R2 check failed: ${error instanceof Error ? error.name : "UnknownError"}`,
  );
  process.exit(1);
}
