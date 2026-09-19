import { Mark, mergeAttributes } from "@tiptap/core";

// A semantic "brand accent" mark for section titles — the run renders as
// `<span class="heading-accent">`, coloured by CSS (`var(--color-brand-red)`
// in globals.css), never an inline hex. Keeps every accent word on-brand and
// lets a rebrand change one token instead of re-editing content (ADR-100).
//
// Toggled via the built-in `toggleMark("accent")` command — no custom command
// needed.
export const Accent = Mark.create({
  name: "accent",

  parseHTML() {
    return [{ tag: "span.heading-accent" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "heading-accent" }), 0];
  },

  addKeyboardShortcuts() {
    return {
      "Mod-Shift-a": () => this.editor.commands.toggleMark(this.name),
    };
  },
});
