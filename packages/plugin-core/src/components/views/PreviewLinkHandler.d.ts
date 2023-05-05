import { DNoteAnchorBasic, DVault, NotePropsMeta, NoteViewMessage, ReducedDEngine, URI } from "@dendronhq/common-all";
import { PluginFileUtils } from "../../utils/files";
import { IPreviewLinkHandler, LinkType } from "./IPreviewLinkHandler";
/**
 * Default implementation for handling link clicks in preview
 */
export declare class PreviewLinkHandler implements IPreviewLinkHandler {
    private wsRoot;
    private engine;
    private vaults;
    /**
     * set of tutorial note ids that we will allow tracking of link clicked events.
     * TODO: consolidate tracking of tutorial ids to a central place
     * TODO: this logic is specific to the tutorial workspace
     *       add a way to register callbacks to the link handler in the future
     */
    private _trackAllowedIds;
    constructor(wsRoot: URI, engine: ReducedDEngine, vaults: DVault[]);
    onLinkClicked({ data, }: {
        data: {
            id?: string | undefined;
            href?: string | undefined;
        };
    }): Promise<LinkType>;
    /** Try to find the note to navigate to if the given path references a note.
     *
     * @returns a note if one was found, `undefined` if no notes were found, and
     * `null` if the link was ambiguous and user cancelled the prompt to pick a
     * note.
     */
    getNavigationTargetNoteForWikiLink({ data, engine, }: {
        data: NoteViewMessage["data"];
        engine: ReducedDEngine;
    }): Promise<{
        note: NotePropsMeta | undefined;
        anchor: DNoteAnchorBasic | undefined;
    }>;
    extractNoteIdFromHref(data: {
        id?: string;
        href?: string;
    }): string | undefined;
}
export declare class ShowPreviewAssetOpener {
    static openWithDefaultApp: typeof PluginFileUtils.openWithDefaultApp;
}
