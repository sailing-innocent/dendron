import { DVault } from "../types/DVault";
/**
 * NOTE: Temporarily duplicated from common-server/filesv2.ts to get Dendron Web
 * Extension working
 * @param calculateHash - when set, add `contentHash` property to the note
 *  Default: false
 * @returns
 */
export declare function string2Note({ content, fname, vault, calculateHash, }: {
    content: string;
    fname: string;
    vault: DVault;
    calculateHash?: boolean;
}): Pick<import("../types").DNodeProps, "tags" | "schema" | "color" | "image" | "fname" | "parent" | "children" | "body" | "data" | "schemaStub" | "type" | "custom" | "links" | keyof import("../types").DNodeExplicitProps | "anchors" | "vault" | "contentHash" | "traits">;
