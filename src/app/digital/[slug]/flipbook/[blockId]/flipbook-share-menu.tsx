"use client";

import { useEffect, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

// Replaces react-pdf-flipbook-viewer's own built-in share button (a
// non-shadcn custom dropdown, disabled via `disableShare` on the viewer —
// see ADR-114) with this project's actual shadcn `DropdownMenu`. Reads the
// current page's own URL client-side, same as the library's own share
// component did, rather than needing the URL passed down from the server
// page.
export function FlipbookShareMenu() {
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setUrl(window.location.href);
  }, []);

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. an insecure context) — nothing to
      // fall back to here.
    }
  };

  const encodedUrl = encodeURIComponent(url);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/70 hover:bg-white/10 hover:text-white"
          aria-label="Share this flipbook"
        >
          <Share2 className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem
          onSelect={(event) => {
            event.preventDefault();
            handleCopyLink();
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied!" : "Copy link"}
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://wa.me/?text=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            WhatsApp
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            Facebook
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://twitter.com/intent/tweet?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            X (Twitter)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
