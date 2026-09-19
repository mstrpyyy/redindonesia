"use client";

import { useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import type { AnyExtension } from "@tiptap/core";
import Document from "@tiptap/extension-document";
import Heading from "@tiptap/extension-heading";
import Paragraph from "@tiptap/extension-paragraph";
import Text from "@tiptap/extension-text";
import HardBreak from "@tiptap/extension-hard-break";
import Bold from "@tiptap/extension-bold";
import Italic from "@tiptap/extension-italic";
import History from "@tiptap/extension-history";
import Underline from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
import TextStyle from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import {
  Bold as BoldIcon,
  Highlighter,
  Italic as ItalicIcon,
  PaintBucket,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ColorPickerButton } from "@/components/color-picker-button";
import { FontSize } from "@/components/tiptap-font-size";
import { Accent } from "@/components/tiptap-accent";
import { TEXT_COLORS } from "@/components/rich-text-constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// A deliberately small rich text field with three modes:
//
// - "heading": one `<h2>` node — no paragraphs, no second block — value is
//   always exactly `<h2>…</h2>`. Enter inserts a `<br>` within it. Toolbar:
//   italic, underline, text colour, font size (Normal / Large). Styled
//   `.h2-format`.
//
// - "section-title": same single-`<h2>` shape, but the only control is an
//   "Accent" toggle that marks a run as `<span class="heading-accent">`
//   (brand-red via CSS, ADR-100). No free colour, no size — for titles whose
//   only styling is "some words are the brand accent colour".
//
// - "body": normal paragraphs (Enter starts a new one), no headings. Toolbar:
//   bold, italic, underline, text colour — no font size, so the copy stays at
//   the `.p-format` scale.
//
// Everything the full `RichTextEditor` offers beyond that (headings toggle,
// lists, links, images, tables, alignment, highlight) is left out on purpose.

// Only two steps on the heading — its default `.h2-format` size, and one
// bump up. "default" maps to `unsetFontSize()`.
const HEADING_FONT_SIZES = [
  { label: "Normal", value: "default" },
  { label: "Large", value: "1.5em" },
];

// One heading node, nothing else — `content: "heading"` on the doc.
const SingleHeadingDocument = Document.extend({ content: "heading" });

// Single-heading modes: plain Enter can't split the doc, so map it to a line
// break (Shift-Enter / Mod-Enter still work, via the parent shortcuts).
const LineBreakOnEnter = HardBreak.extend({
  addKeyboardShortcuts() {
    return {
      ...this.parent?.(),
      Enter: () => this.editor.commands.setHardBreak(),
    };
  },
});

type MiniRichTextMode = "heading" | "section-title" | "body";

interface IMiniRichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  mode?: MiniRichTextMode;
}

export function MiniRichTextEditor({
  value,
  onChange,
  placeholder,
  mode = "heading",
}: IMiniRichTextEditorProps) {
  const isBody = mode === "body";
  const isSectionTitle = mode === "section-title";
  // "section-title" renders an <h3> at `.h3-format`; "heading" an <h2> at
  // `.h2-format`.
  const headingLevel: 2 | 3 = isSectionTitle ? 3 : 2;
  const formatClass = isBody ? "p-format" : isSectionTitle ? "h3-format" : "h2-format";
  const emptyDoc = isBody ? "<p></p>" : `<h${headingLevel}></h${headingLevel}>`;

  const extensions: AnyExtension[] = isBody
    ? [
        Document,
        Paragraph,
        Text,
        HardBreak,
        Bold,
        Italic,
        Underline,
        History,
        Placeholder.configure({ placeholder: placeholder ?? "Write a paragraph..." }),
        // Plain TextStyle (not FontSize) — body copy carries a colour mark
        // but has no size control, so it stays at the `.p-format` scale.
        TextStyle,
        Color,
      ]
    : [
        SingleHeadingDocument,
        Heading.configure({ levels: [headingLevel] }),
        Text,
        LineBreakOnEnter,
        History,
        Placeholder.configure({ placeholder: placeholder ?? "Write a heading..." }),
        ...(isSectionTitle
          ? [Accent]
          : [
              Italic,
              Underline,
              // FontSize extends the same `textStyle` mark Color extends, so a
              // run can carry both a colour and a size without a second mark.
              FontSize,
              Color,
            ]),
      ];

  const editor = useEditor({
    extensions,
    content: value || emptyDoc,
    immediatelyRender: false,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        // The format class + the matching reset in globals.css
        // (`.mini-rich-text-editor h2, h3` / `.mini-rich-text-body p`) make the
        // inner nodes preview at the public site's own type scale instead of
        // the UA default.
        class: cn(
          "max-w-none focus:outline-none px-3 py-2",
          isBody ? "mini-rich-text-body p-format" : `mini-rich-text-editor ${formatClass}`
        ),
      },
    },
  });

  // Same rationale as RichTextEditor's resync — the DB-provided value only
  // changes when different content is loaded into an already-mounted editor,
  // not on every keystroke (onChange doesn't feed back into this prop).
  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() === value) return;
    editor.commands.setContent(value || emptyDoc, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editor]);

  if (!editor) return null;

  const showBold = isBody;
  const showInlineMarks = mode === "heading" || isBody; // italic + underline
  const showColor = mode === "heading" || isBody;
  const showFontSize = mode === "heading";
  const showAccent = mode === "section-title";

  return (
    <div className="rounded-md border">
      <div className="flex flex-wrap items-center gap-1 border-b p-1.5">
        {showAccent && (
          <Button
            type="button"
            variant="secondary"
            size="sm"
            // Toggling a mark with no selection only arms it for the next
            // keystroke — confusing here, so require an actual selection.
            disabled={editor.state.selection.empty}
            title={editor.state.selection.empty ? "Select some words first" : undefined}
            aria-label="Toggle brand accent on the selected text"
            aria-pressed={editor.isActive("accent")}
            onClick={() => editor.chain().focus().toggleMark("accent").run()}
            className={cn(
              "gap-1.5",
              editor.isActive("accent") && "bg-brand-red/15 text-brand-red hover:bg-brand-red/20"
            )}
          >
            <Highlighter className="size-4 text-brand-red" />
            {editor.isActive("accent") ? "Remove Accent" : "Add Accent"}
          </Button>
        )}

        {showBold && (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Bold"
            aria-pressed={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={cn(editor.isActive("bold") && "bg-accent text-accent-foreground")}
          >
            <BoldIcon className="size-4" />
          </Button>
        )}

        {showInlineMarks && (
          <>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Italic"
              aria-pressed={editor.isActive("italic")}
              onClick={() => editor.chain().focus().toggleItalic().run()}
              className={cn(editor.isActive("italic") && "bg-accent text-accent-foreground")}
            >
              <ItalicIcon className="size-4" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Underline"
              aria-pressed={editor.isActive("underline")}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              className={cn(editor.isActive("underline") && "bg-accent text-accent-foreground")}
            >
              <UnderlineIcon className="size-4" />
            </Button>
          </>
        )}

        {showColor && (
          <>
            <span className="bg-border mx-1 h-5 w-px" />
            <ColorPickerButton
              label="Text color"
              icon={<PaintBucket className="size-4" />}
              colors={TEXT_COLORS}
              activeColor={editor.getAttributes("textStyle").color}
              indicatorColor={editor.getAttributes("textStyle").color}
              onSelect={(color) => editor.chain().focus().setColor(color).run()}
              onClear={() => editor.chain().focus().unsetColor().run()}
            />
          </>
        )}

        {showFontSize && (
          <>
            <span className="bg-border mx-1 h-5 w-px" />
            <Select
              value={editor.getAttributes("textStyle").fontSize ?? "default"}
              onValueChange={(next) => {
                if (next === "default") {
                  editor.chain().focus().unsetFontSize().run();
                  return;
                }
                editor.chain().focus().setFontSize(next).run();
              }}
            >
              <SelectTrigger size="sm" aria-label="Font size" className="w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HEADING_FONT_SIZES.map((size) => (
                  <SelectItem key={size.value} value={size.value}>
                    {size.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        )}
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
