import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { nanoid } from "nanoid";

/**
 * Storage abstraction. Local driver writes to `public/uploads` so files are
 * served directly by Next.js in dev. Swap to `s3` in production by implementing
 * the same upload() surface and returning a signed URL.
 */

export type StoredFile = {
  key: string;
  url: string;
  mimeType?: string;
  size: number;
};

export async function uploadFile(
  buffer: Buffer,
  opts: { filename: string; mimeType?: string; folder?: string },
): Promise<StoredFile> {
  const driver = process.env.STORAGE_DRIVER || "local";
  if (driver === "local") return uploadLocal(buffer, opts);
  // TODO: S3 implementation
  throw new Error(`Storage driver "${driver}" not implemented.`);
}

async function uploadLocal(
  buffer: Buffer,
  opts: { filename: string; mimeType?: string; folder?: string },
): Promise<StoredFile> {
  const baseDir = process.env.STORAGE_LOCAL_DIR || "./public/uploads";
  const folder = opts.folder ?? "misc";
  const targetDir = path.resolve(process.cwd(), baseDir, folder);
  await fs.mkdir(targetDir, { recursive: true });

  const ext = path.extname(opts.filename) || "";
  const key = `${folder}/${nanoid(12)}${ext}`;
  const filePath = path.resolve(process.cwd(), baseDir, key);
  await fs.writeFile(filePath, buffer);

  // URL path relative to /public
  const publicPath = baseDir.replace(/^\.?\//, "").replace(/^public\//, "/");
  const url = `${publicPath.startsWith("/") ? publicPath : "/" + publicPath}/${key}`;

  return { key, url, mimeType: opts.mimeType, size: buffer.byteLength };
}
