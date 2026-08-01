import Image from "@tiptap/extension-image";

// Adds a floatable/centerable `align` attribute to the base Image node,
// persisted as `data-align` on the rendered <img> — a plain attribute, so
// `editor.chain().updateAttributes("image", { align })` (a core Tiptap
// command available to every node) is enough to change it, no custom
// command needed. TextAlign's own mechanism doesn't apply here: it's scoped
// to "heading"/"paragraph" and sets `text-align`, which has no effect on a
// block-level <img>'s own position — see the matching
// `.tiptap-content img[data-align=...]` rules in globals.css.
export const AlignableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      align: {
        default: null,
        parseHTML: (element: HTMLElement) => element.getAttribute("data-align"),
        renderHTML: (attributes: { align?: string | null }) => {
          if (!attributes.align) return {};
          return { "data-align": attributes.align };
        },
      },
    };
  },
});
