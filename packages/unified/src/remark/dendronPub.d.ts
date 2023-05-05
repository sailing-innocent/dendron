import Unified, { Transformer } from "unified";
import { NoteRefsOptsV2 } from "./noteRefsV2";
type PluginOpts = NoteRefsOptsV2 & {
    assetsPrefix?: string;
    insertTitle?: boolean;
    /**
     * Don't publish pages that are dis-allowd by dendron.yml
     */
    transformNoPublish?: boolean;
    /** Don't display randomly generated colors for tags, only display color if it's explicitly set by the user. */
    noRandomlyColoredTags?: boolean;
};
declare function plugin(this: Unified.Processor, opts?: PluginOpts): Transformer;
export { plugin as dendronPub };
export { PluginOpts as DendronPubOpts };
