import Table, { TableView } from "@tiptap/extension-table";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";

// The Table extension renders its *editing* view through a custom NodeView
// (TableView, needed for the resizable-column drag handles) that builds its
// own <table> element directly and never looks at node.attrs beyond column
// widths. That means a plain `renderHTML`-based attribute reaches the
// *serialized* HTML (article/product pages, `editor.getHTML()`) but never
// shows up on the table you're actually looking at in the editor — the
// alignment "works" everywhere except while editing. Subclassing TableView
// to sync `data-align` onto its `table` element on create/update is the
// only way to make the two match.
class AlignableTableView extends TableView {
  constructor(node: ProseMirrorNode, cellMinWidth: number) {
    super(node, cellMinWidth);
    this.syncAlign(node);
  }

  private syncAlign(node: ProseMirrorNode) {
    const align = node.attrs.align as string | null;
    if (align) {
      this.table.setAttribute("data-align", align);
    } else {
      this.table.removeAttribute("data-align");
    }
  }

  update(node: ProseMirrorNode) {
    const updated = super.update(node);
    if (updated) this.syncAlign(node);
    return updated;
  }
}

// Same pattern as `AlignableImage` (tiptap-image-align.ts): a plain
// attribute, so `editor.chain().updateAttributes("table", { align })` is
// enough to change it, no custom command needed. The table's own width
// already comes from its columns (`table-layout: fixed`, globals.css), so
// aligning it is a matter of positioning that fixed-width box within the
// wrapper via margin — see the matching `.tiptap-content table[data-align=
// ...]` rules.
export const AlignableTable = Table.extend({
  addOptions() {
    return {
      ...this.parent?.(),
      View: AlignableTableView,
    };
  },

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
