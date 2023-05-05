import { DNoteAnchorBasic, DVault, NotePropsMeta } from "@dendronhq/common-all";
import { Position, TextEditor, ViewColumn } from "vscode";
import { URI } from "vscode-uri";
export declare function openNote({ wsRoot, fname, vault, anchor, column, note, }: {
    wsRoot: URI;
    fname: string;
    vault: DVault;
    note: NotePropsMeta;
    anchor?: DNoteAnchorBasic;
    column?: ViewColumn;
}): Promise<void>;
export declare function trySelectRevealNonNoteAnchor(editor: TextEditor, anchor: DNoteAnchorBasic): Promise<void>;
export declare const findAnchorPos: (opts: {
    anchor: DNoteAnchorBasic;
    note: NotePropsMeta;
}) => Position;
