import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

// ProseMirror gap: if the document ends in a node the cursor can't be
// placed inside/after via click or Enter (a table, an image), there's no
// paragraph below it to click into — most visibly, a table on the last
// line traps the cursor with nowhere to go. This appends an empty
// paragraph whenever the doc's last node isn't already one, so there's
// always a line to click below the last block.
export const TrailingNode = Extension.create({
  name: "trailingNode",

  addProseMirrorPlugins() {
    const pluginKey = new PluginKey(this.name);
    const notAfter = ["paragraph"];

    return [
      new Plugin({
        key: pluginKey,
        appendTransaction: (_transactions, _oldState, state) => {
          const needsTrailingParagraph = pluginKey.getState(state) as boolean;
          if (!needsTrailingParagraph) return null;

          const paragraph = state.schema.nodes.paragraph;
          return state.tr.insert(state.doc.content.size, paragraph.create());
        },
        state: {
          init: (_, state) => !notAfter.includes(state.doc.lastChild?.type.name ?? ""),
          apply: (tr, value) =>
            tr.docChanged ? !notAfter.includes(tr.doc.lastChild?.type.name ?? "") : value,
        },
      }),
    ];
  },
});
