import { TestPresetEntryV4 } from "@dendronhq/common-test-utils";
declare const JSON_TEST_PRESET: {
    EXPORT: {
        BASIC: TestPresetEntryV4;
    };
    IMPORT: {
        BASIC: TestPresetEntryV4;
        BASIC_W_STUBS: TestPresetEntryV4;
        BASIC_W_REL_PATH: TestPresetEntryV4;
        CONCATENATE: TestPresetEntryV4;
        CONCATENATE_W_NO_DEST: TestPresetEntryV4;
    };
};
export default JSON_TEST_PRESET;
