"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ISearchSuggestions } from "@/interfaces/general";
import { getSearchSuggestions } from "./search-actions";

const EMPTY_SUGGESTIONS: ISearchSuggestions = { products: [], pages: [] };
const SEARCH_DEBOUNCE_MS = 300;
// Below this, neither group has anything to show yet (see
// MIN_PRODUCT_SEARCH_QUERY_LENGTH in src/lib/search.ts, the shorter of the
// two per-group minimums) — skip the request entirely below it.
const MIN_QUERY_LENGTH = 3;

const DEFAULT_ICON_CLASSNAME = "pointer-events-none absolute right-3 top-1/2 -translate-y-1/2";
const DEFAULT_DROPDOWN_CLASSNAME = "left-0 w-80 max-w-[calc(100vw-2rem)]";

// Search-as-you-type dropdown over the public catalogue and every other
// public page (categories, articles, support/contact, media index — see
// src/lib/search.ts). Used by both the navbar (compact pill) and the
// homepage hero (full-width bar) — each caller supplies its own visual
// classes rather than this component branching on which one it is.
//
// A plain in-tree panel rather than a Radix Popover, same reasoning as the
// homepage carousel's ProductPickerField: both callers render this inside a
// stacking context (fixed header / hero banner) that a Portal would escape.
export function SearchBar({
  inputClassName,
  iconClassName = DEFAULT_ICON_CLASSNAME,
  dropdownClassName = DEFAULT_DROPDOWN_CLASSNAME,
  placeholder = "Search devices, products, pages...",
  onNavigate,
}: {
  inputClassName: string;
  iconClassName?: string;
  dropdownClassName?: string;
  placeholder?: string;
  // Called (in addition to closing this component's own dropdown) when a
  // suggestion is clicked — lets a caller embedding this inside its own
  // dismissible panel (e.g. the mobile hamburger menu) close that panel too.
  onNavigate?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<ISearchSuggestions>(EMPTY_SUGGESTIONS);
  const [open, setOpen] = useState(false);
  // Once true, the panel stays open and keeps showing the last settled
  // result while a new keystroke's debounce is pending — only replaced in
  // place once the next result actually settles, instead of hiding/reopening
  // on every keystroke.
  const [hasSettledResult, setHasSettledResult] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const trimmedQuery = query.trim();
  const hasResults = suggestions.products.length > 0 || suggestions.pages.length > 0;
  const showDropdown = open && trimmedQuery.length >= MIN_QUERY_LENGTH && hasSettledResult;

  useEffect(() => {
    if (!showDropdown) return;

    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [showDropdown]);

  useEffect(() => {
    const requestId = ++requestIdRef.current;

    if (trimmedQuery.length < MIN_QUERY_LENGTH) {
      setSuggestions(EMPTY_SUGGESTIONS);
      setHasSettledResult(false);
      return;
    }

    const timeout = setTimeout(() => {
      getSearchSuggestions(trimmedQuery)
        .then((result) => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(result);
          setHasSettledResult(true);
        })
        .catch(() => {
          if (requestIdRef.current !== requestId) return;
          setSuggestions(EMPTY_SUGGESTIONS);
          setHasSettledResult(true);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => clearTimeout(timeout);
  }, [trimmedQuery]);

  return (
    <div ref={containerRef} className="relative">
      <Input
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Escape") setOpen(false);
        }}
        placeholder={placeholder}
        className={inputClassName}
      />
      <Search className={iconClassName} size={20} />

      {showDropdown && (
        <div
          className={`bg-popover text-popover-foreground absolute top-full z-50 mt-2 rounded-md border p-1 text-left shadow-md ${dropdownClassName}`}
        >
          <div className="max-h-96 overflow-y-auto">
            {!hasResults && (
              <p className="text-muted-foreground px-2 py-3 text-center text-xs">No matches found.</p>
            )}

            {suggestions.products.length > 0 && (
              <div className="mb-1">
                <p className="text-muted-foreground px-2 py-1 text-xxs font-semibold tracking-wide uppercase">
                  Products & Devices
                </p>
                {suggestions.products.map((product) => (
                  <Link
                    key={product.id}
                    href={product.url}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <div className="bg-muted relative size-8 shrink-0 overflow-hidden rounded-sm">
                      {product.thumbnail && (
                        <Image src={product.thumbnail} alt="" fill sizes="32px" className="object-contain" />
                      )}
                    </div>
                    <span className="flex-1 truncate">{product.name}</span>
                    <Badge variant="outline" className="shrink-0 text-xxs capitalize">
                      {product.type}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}

            {suggestions.pages.length > 0 && (
              <div>
                <p className="text-muted-foreground px-2 py-1 text-xxs font-semibold tracking-wide uppercase">
                  Pages
                </p>
                {suggestions.pages.map((page) => (
                  <Link
                    key={page.id}
                    href={page.url}
                    onClick={() => {
                      setOpen(false);
                      onNavigate?.();
                    }}
                    className="hover:bg-accent flex items-center gap-2 rounded-sm px-2 py-1.5 text-sm"
                  >
                    <span className="flex-1 truncate">{page.label}</span>
                    <Badge variant="outline" className="shrink-0 text-xxs capitalize">
                      {page.kind}
                    </Badge>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
