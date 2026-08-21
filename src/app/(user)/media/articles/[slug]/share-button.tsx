"use client";

import { useEffect, useState } from "react";
import { Check, Link2 } from "lucide-react";
import { FaFacebook, FaLinkedin, FaTelegram, FaWhatsapp, FaXTwitter } from "react-icons/fa6";
import { Button } from "@/components/ui/button";

interface IShareButtonProps {
  title: string;
  // Canonical pathname for this article (e.g. `/media/articles/my-slug`),
  // supplied by the server component that already knows the slug. Never
  // derive this from `window.location.pathname` — this page sits behind
  // client-side (soft) navigation (the "Back to articles" link, browser
  // back/forward), so the live pathname can flip to the listing page
  // slightly out of step with this component's render, letting a share
  // click capture the wrong URL. A server-supplied path can't go stale.
  path: string;
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

export function ShareButton({ title, path }: IShareButtonProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!copied) return;
    const timeout = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timeout);
  }, [copied]);

  // `window.location.origin` (protocol + host) is read fresh at click time
  // rather than stored — it's stable across in-app navigation, unlike the
  // pathname, so there's no staleness risk in reading it live.
  const getArticleUrl = () => `${window.location.origin}${path}`;

  const handleShareClick = (href: string) => {
    window.open(href, "_blank", "noopener,noreferrer");
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(getArticleUrl());
    setCopied(true);
  };

  const links = buildShareLinks(getArticleUrl(), title);

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
