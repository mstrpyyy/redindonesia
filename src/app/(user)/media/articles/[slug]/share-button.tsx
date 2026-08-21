"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { FaFacebook, FaLinkedin, FaTelegram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

interface IShareButtonProps {
  title: string;
}

function buildShareLinks(url: string, title: string) {
  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return [
    {
      label: "Share on Facebook",
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: FaFacebook,
    },
    {
      label: "Share on WhatsApp",
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: FaWhatsapp,
    },
    {
      label: "Share on X",
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: FaXTwitter,
    },
    {
      label: "Share on Telegram",
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: FaTelegram,
    },
    {
      label: "Share on LinkedIn",
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`,
      icon: FaLinkedin,
    },
  ];
}

// No canonical production domain is configured anywhere in the app yet (see
// DECISIONS.md — `metadataBase` is a known gap), so share URLs are read from
// `window.location.href` at click time rather than a server-side constant.
// Nothing here is rendered into the DOM (these are onClick handlers, not
// anchor hrefs), so there's no state/effect needed just to hold it, and no
// server/client hydration mismatch to worry about.
export function ShareButton({ title }: IShareButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  const handleShareClick = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
  };

  const links = buildShareLinks(
    typeof window !== "undefined" ? window.location.href : "",
    title
  );

  return (
    <div className="flex w-auto flex-row gap-1">
      {links.map(({ label, href, icon: Icon }) => (
        <Button
          key={label}
          type="button"
          variant="ghost"
          size="icon-sm"
          aria-label={label}
          onClick={() => handleShareClick(href)}
        >
          <Icon className="size-4" />
        </Button>
      ))}
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label="Copy link"
        onClick={handleCopyLink}
      >
        {copied ? <Check className="size-4" /> : <Link2 className="size-4" />}
      </Button>
    </div>
  );
}
