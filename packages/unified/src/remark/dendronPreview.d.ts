import { Image } from "mdast";
import Unified, { Transformer } from "unified";
type PluginOpts = {};
/** Makes the `.url` of the given image note a full path. */
export declare function makeImageUrlFullPath({ proc, node, }: {
    proc: Unified.Processor;
    node: Image;
}): void;
export declare function dendronHoverPreview(this: Unified.Processor, _opts?: PluginOpts): Transformer;
export { PluginOpts as DendronPreviewOpts };
