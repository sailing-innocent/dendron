export declare const PLUGIN_CORE: {
    LOOKUP_SINGLE_TEST_PRESET: {
        UPDATE_ITEMS: {
            SCHEMA_SUGGESTION: import("../..").TestPresetEntry<{
                vault: import("../../../../common-all/src").DVault;
            }, any, {
                items: import("../../../../common-all/src").NoteProps;
            }>;
        };
        ACCEPT_ITEMS: {
            EXISTING_ITEM: import("../..").TestPresetEntry<unknown, any, {
                activeFileName: string;
                activeNote: import("../../../../common-all/src").NoteProps;
            }>;
        };
    };
};
