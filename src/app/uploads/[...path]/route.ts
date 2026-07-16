import { readFile } from "fs/promises";
import path from "path";

import { resolveUploadPath } from "@/lib/uploads";

// In production, direct browser requests for /uploads/* are answered by Nginx
// before they reach this app. This handler exists for the next/image
// optimizer, which resolves relative `url=` sources through the Next.js
// server's own router — never through Nginx — so /uploads/* must also be
// servable from inside the app.
const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
): Promise<Response> {
  const { path: segments } = await params;

  const diskPath = resolveUploadPath(segments);
  if (!diskPath) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(diskPath).toLowerCase()];
  if (!contentType) {
    return new Response("Not found", { status: 404 });
  }

  let file: Buffer;
  try {
    file = await readFile(diskPath);
  } catch {
    return new Response("Not found", { status: 404 });
  }

  return new Response(new Uint8Array(file), {
    headers: {
      "Content-Type": contentType,
      // Filenames are UUIDs — a given URL's content never changes.
      "Cache-Control": "public, max-age=2592000, immutable",
    },
  });
}
