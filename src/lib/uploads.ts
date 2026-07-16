import { mkdir, unlink, writeFile } from "fs/promises";
import path from "path";

// Runtime uploads must live outside the app directory in production: the
// Next.js production server only serves `public/` files that existed at build
// time, and each deploy replaces the app directory entirely. On the VPS,
// UPLOAD_DIR points at a persistent directory served by Nginx (see
// ARCHITECTURE.md); unset in local dev, it falls back to `public/uploads`,
// which `next dev` serves from disk without a restart.
const UPLOAD_BASE_DIR =
  process.env.UPLOAD_DIR ?? path.join(process.cwd(), "public", "uploads");

/**
 * Persists an uploaded file under `<UPLOAD_BASE_DIR>/<feature>/` and returns
 * the public `/uploads/<feature>/<filename>` path to store in the DB.
 */
export async function saveUpload(file: File, feature: string): Promise<string> {
  const extension = path.extname(file.name) || `.${file.type.split("/")[1]}`;
  const filename = `${crypto.randomUUID()}${extension}`;

  const dir = path.join(UPLOAD_BASE_DIR, feature);
  await mkdir(dir, { recursive: true });
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, filename), buffer);

  return `/uploads/${feature}/${filename}`;
}

/**
 * Resolves URL path segments to a file inside the upload base directory.
 * Returns null if the segments would escape it (e.g. `..` traversal).
 */
export function resolveUploadPath(segments: string[]): string | null {
  const base = path.resolve(UPLOAD_BASE_DIR);
  const resolved = path.resolve(base, ...segments);
  if (resolved === base || !resolved.startsWith(base + path.sep)) {
    return null;
  }
  return resolved;
}

export async function deleteUpload(
  publicPath: string,
  feature: string
): Promise<void> {
  // basename() strips any directory component, so a tampered DB value can't
  // reach outside the upload directory.
  const diskPath = path.join(
    UPLOAD_BASE_DIR,
    feature,
    path.basename(publicPath)
  );
  await unlink(diskPath).catch(() => {
    // Already gone or locked — an orphaned file is not worth failing the request.
  });
}
