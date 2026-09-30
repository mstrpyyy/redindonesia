"use client";

import { pdfjs } from "react-pdf";
import { FlipbookViewer as PdfFlipbookViewer } from "react-pdf-flipbook-viewer";

// `react-pdf-flipbook-viewer` points its own worker at a CDN
// (`unpkg.com/pdfjs-dist@<version>/...`) the moment it's imported — this
// overrides that back to a self-hosted copy (ADR-105/ADR-111: no
// third-party runtime dependency). `pdfjs-dist`'s worker/main-thread
// versions must match exactly, so the copied file in public/ must come from
// THIS package's own nested `pdfjs-dist` (react-pdf's dependency, currently
// deduped to the top-level `node_modules/pdfjs-dist`) — re-copy it if
// `react-pdf` is ever upgraded to a version pinned to a different one.
pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

// `disableShare` hides the library's own non-shadcn share dropdown — this
// page renders its own shadcn one instead (`FlipbookShareMenu`, see
// ADR-114). `.digital-flipbook-theme` (globals.css) scopes a dark override
// of just the shadcn tokens this component's toolbar/slider read, so they
// read as a black bar with a grey progress slider instead of the site's
// light-theme defaults.
export function FlipbookViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div className="digital-flipbook-theme h-[80svh] w-full max-w-4xl">
      <PdfFlipbookViewer pdfUrl={fileUrl} disableShare className="h-full w-full" />
    </div>
  );
}
