"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LookupV3QuickPickView = void 0;
const common_all_1 = require("@dendronhq/common-all");
const lodash_1 = __importDefault(require("lodash"));
const analytics_1 = require("../../utils/analytics");
const types_1 = require("../lookup/types");
/**
 * A 'view' that represents the UI state of the Lookup Quick Pick. This
 * essentially controls the button state of the quick pick and reacts upon user
 * mouse clicks to the buttons.
 */
class LookupV3QuickPickView {
    constructor(quickPick, viewModel, providerId // For telemetry purposes only
    ) {
        this.onTriggerButton = (btn) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
            const btnType = btn.type;
            switch (btnType) {
                case common_all_1.LookupSelectionTypeEnum.selection2Items:
                    if ((_a = this.getButton(common_all_1.LookupSelectionTypeEnum.selection2Items)) === null || _a === void 0 ? void 0 : _a.canToggle) {
                        this._viewState.selectionState.value =
                            this._viewState.selectionState.value ===
                                common_all_1.LookupSelectionTypeEnum.selection2Items
                                ? common_all_1.LookupSelectionTypeEnum.none
                                : common_all_1.LookupSelectionTypeEnum.selection2Items;
                    }
                    break;
                case common_all_1.LookupSelectionTypeEnum.selection2link:
                    if ((_b = this.getButton(common_all_1.LookupSelectionTypeEnum.selection2link)) === null || _b === void 0 ? void 0 : _b.canToggle) {
                        this._viewState.selectionState.value =
                            this._viewState.selectionState.value ===
                                common_all_1.LookupSelectionTypeEnum.selection2link
                                ? common_all_1.LookupSelectionTypeEnum.none
                                : common_all_1.LookupSelectionTypeEnum.selection2link;
                    }
                    break;
                case common_all_1.LookupSelectionTypeEnum.selectionExtract:
                    if ((_c = this.getButton(common_all_1.LookupSelectionTypeEnum.selectionExtract)) === null || _c === void 0 ? void 0 : _c.canToggle) {
                        this._viewState.selectionState.value =
                            this._viewState.selectionState.value ===
                                common_all_1.LookupSelectionTypeEnum.selectionExtract
                                ? common_all_1.LookupSelectionTypeEnum.none
                                : common_all_1.LookupSelectionTypeEnum.selectionExtract;
                    }
                    break;
                case "selectVault": {
                    if ((_d = this.getButton("selectVault")) === null || _d === void 0 ? void 0 : _d.canToggle) {
                        this._viewState.vaultSelectionMode.value =
                            this._viewState.vaultSelectionMode.value ===
                                types_1.VaultSelectionMode.alwaysPrompt
                                ? types_1.VaultSelectionMode.smart
                                : types_1.VaultSelectionMode.alwaysPrompt;
                    }
                    break;
                }
                case "multiSelect": {
                    if ((_e = this.getButton("multiSelect")) === null || _e === void 0 ? void 0 : _e.canToggle) {
                        this._viewState.isMultiSelectEnabled.value =
                            !this._viewState.isMultiSelectEnabled.value;
                    }
                    break;
                }
                case "copyNoteLink": {
                    if ((_f = this.getButton("copyNoteLink")) === null || _f === void 0 ? void 0 : _f.canToggle) {
                        this._viewState.isCopyNoteLinkEnabled.value =
                            !this._viewState.isCopyNoteLinkEnabled.value;
                    }
                    break;
                }
                case "directChildOnly": {
                    if ((_g = this.getButton("directChildOnly")) === null || _g === void 0 ? void 0 : _g.canToggle) {
                        this._viewState.isApplyDirectChildFilter.value =
                            !this._viewState.isApplyDirectChildFilter.value;
                    }
                    break;
                }
                case common_all_1.LookupNoteTypeEnum.journal: {
                    if ((_h = this.getButton(common_all_1.LookupNoteTypeEnum.journal)) === null || _h === void 0 ? void 0 : _h.canToggle) {
                        this._viewState.nameModifierMode.value =
                            this._viewState.nameModifierMode.value ===
                                common_all_1.LookupNoteTypeEnum.journal
                                ? common_all_1.LookupNoteTypeEnum.none
                                : common_all_1.LookupNoteTypeEnum.journal;
                    }
                    break;
                }
                case common_all_1.LookupNoteTypeEnum.scratch: {
                    if ((_j = this.getButton(common_all_1.LookupNoteTypeEnum.scratch)) === null || _j === void 0 ? void 0 : _j.canToggle) {
                        this._viewState.nameModifierMode.value =
                            this._viewState.nameModifierMode.value ===
                                common_all_1.LookupNoteTypeEnum.scratch
                                ? common_all_1.LookupNoteTypeEnum.none
                                : common_all_1.LookupNoteTypeEnum.scratch;
                    }
                    break;
                }
                case common_all_1.LookupNoteTypeEnum.task: {
                    if ((_k = this.getButton(common_all_1.LookupNoteTypeEnum.task)) === null || _k === void 0 ? void 0 : _k.canToggle) {
                        this._viewState.nameModifierMode.value =
                            this._viewState.nameModifierMode.value === common_all_1.LookupNoteTypeEnum.task
                                ? common_all_1.LookupNoteTypeEnum.none
                                : common_all_1.LookupNoteTypeEnum.task;
                    }
                    break;
                }
                case "horizontal": {
                    if ((_l = this.getButton("horizontal")) === null || _l === void 0 ? void 0 : _l.canToggle) {
                        this._viewState.isSplitHorizontally.value =
                            !this._viewState.isSplitHorizontally.value;
                    }
                    break;
                }
                default:
                    break;
            }
            analytics_1.AnalyticsUtils.track(common_all_1.LookupEvents.LookupModifierToggledByUser, {
                command: this._providerId,
                type: btn.type,
                pressed: btn.pressed,
            });
        };
        this._quickPick = quickPick;
        this._viewState = viewModel;
        this._providerId = providerId;
        this._disposables = [];
        this.setupViewModel();
        this._disposables.push(this._quickPick.onDidTriggerButton(this.onTriggerButton));
    }
    dispose() {
        this._disposables.forEach((callback) => callback.dispose());
    }
    setupViewModel() {
        const ToLinkBtn = this.getButton("selection2link");
        const ExtractBtn = this.getButton("selectionExtract");
        const ToItemsBtn = this.getButton("selection2Items");
        this._disposables.push(this._viewState.selectionState.bind(async (newValue) => {
            switch (newValue) {
                case common_all_1.LookupSelectionTypeEnum.selection2Items: {
                    if (ToLinkBtn)
                        ToLinkBtn.pressed = false;
                    if (ExtractBtn)
                        ExtractBtn.pressed = false;
                    if (ToItemsBtn)
                        ToItemsBtn.pressed = true;
                    break;
                }
                case common_all_1.LookupSelectionTypeEnum.selection2link: {
                    if (ToLinkBtn)
                        ToLinkBtn.pressed = true;
                    if (ExtractBtn)
                        ExtractBtn.pressed = false;
                    if (ToItemsBtn)
                        ToItemsBtn.pressed = false;
                    break;
                }
                case common_all_1.LookupSelectionTypeEnum.selectionExtract: {
                    if (ToLinkBtn)
                        ToLinkBtn.pressed = false;
                    if (ExtractBtn)
                        ExtractBtn.pressed = true;
                    if (ToItemsBtn)
                        ToItemsBtn.pressed = false;
                    break;
                }
                case common_all_1.LookupSelectionTypeEnum.none: {
                    if (ToLinkBtn)
                        ToLinkBtn.pressed = false;
                    if (ExtractBtn)
                        ExtractBtn.pressed = false;
                    if (ToItemsBtn)
                        ToItemsBtn.pressed = false;
                    break;
                }
                default:
                    (0, common_all_1.assertUnreachable)(newValue);
            }
            const buttons = [];
            if (ToLinkBtn)
                buttons.push(ToLinkBtn);
            if (ExtractBtn)
                buttons.push(ExtractBtn);
            if (ToItemsBtn)
                buttons.push(ToItemsBtn);
            this.updateButtonsOnQuickPick(...buttons);
        }));
        const vaultSelectionBtn = this.getButton("selectVault");
        if (vaultSelectionBtn !== undefined) {
            this._disposables.push(this._viewState.vaultSelectionMode.bind(async (newValue) => {
                vaultSelectionBtn.pressed =
                    newValue === types_1.VaultSelectionMode.alwaysPrompt;
                this.updateButtonsOnQuickPick(vaultSelectionBtn);
            }));
        }
        const multiSelectBtn = this.getButton("multiSelect");
        if (multiSelectBtn) {
            this._disposables.push(this._viewState.isMultiSelectEnabled.bind(async (newValue) => {
                multiSelectBtn.pressed = newValue;
                this.updateButtonsOnQuickPick(multiSelectBtn);
            }));
        }
        const copyLinkBtn = this.getButton("copyNoteLink");
        if (copyLinkBtn) {
            this._disposables.push(this._viewState.isCopyNoteLinkEnabled.bind(async (enabled) => {
                copyLinkBtn.pressed = enabled;
                this.updateButtonsOnQuickPick(copyLinkBtn);
            }));
        }
        const directChildBtn = this.getButton("directChildOnly");
        if (directChildBtn) {
            this._disposables.push(this._viewState.isApplyDirectChildFilter.bind(async (newValue) => {
                directChildBtn.pressed = newValue;
                this.updateButtonsOnQuickPick(directChildBtn);
            }));
        }
        const journalBtn = this.getButton(common_all_1.LookupNoteTypeEnum.journal);
        const scratchBtn = this.getButton(common_all_1.LookupNoteTypeEnum.scratch);
        const taskBtn = this.getButton(common_all_1.LookupNoteTypeEnum.task);
        this._disposables.push(this._viewState.nameModifierMode.bind(async (newValue) => {
            switch (newValue) {
                case common_all_1.LookupNoteTypeEnum.journal:
                    if (journalBtn)
                        journalBtn.pressed = true;
                    if (scratchBtn)
                        scratchBtn.pressed = false;
                    if (taskBtn)
                        taskBtn.pressed = false;
                    break;
                case common_all_1.LookupNoteTypeEnum.scratch:
                    if (journalBtn)
                        journalBtn.pressed = false;
                    if (scratchBtn)
                        scratchBtn.pressed = true;
                    if (taskBtn)
                        taskBtn.pressed = false;
                    break;
                case common_all_1.LookupNoteTypeEnum.task:
                    if (journalBtn)
                        journalBtn.pressed = false;
                    if (scratchBtn)
                        scratchBtn.pressed = false;
                    if (taskBtn)
                        taskBtn.pressed = true;
                    break;
                case common_all_1.LookupNoteTypeEnum.none:
                    if (journalBtn)
                        journalBtn.pressed = false;
                    if (scratchBtn)
                        scratchBtn.pressed = false;
                    if (taskBtn)
                        taskBtn.pressed = false;
                    break;
                default:
                    (0, common_all_1.assertUnreachable)(newValue);
            }
            const validButtons = [];
            if (journalBtn)
                validButtons.push(journalBtn);
            if (scratchBtn)
                validButtons.push(scratchBtn);
            if (taskBtn)
                validButtons.push(taskBtn);
            this.updateButtonsOnQuickPick(...validButtons);
        }));
        const horizontalBtn = this.getButton("horizontal");
        if (horizontalBtn) {
            this._disposables.push(this._viewState.isSplitHorizontally.bind(async (splitHorizontally) => {
                horizontalBtn.pressed = splitHorizontally;
                this.updateButtonsOnQuickPick(horizontalBtn);
            }));
        }
    }
    getButtonFromArray(type, buttons) {
        return lodash_1.default.find(buttons, (value) => value.type === type);
    }
    getButton(type) {
        var _a;
        if (this._quickPick) {
            return this.getButtonFromArray(type, (_a = this._quickPick) === null || _a === void 0 ? void 0 : _a.buttons);
        }
        return;
    }
    updateButtonsOnQuickPick(...btns) {
        const newButtons = this._quickPick.buttons.map((b) => {
            const toUpdate = lodash_1.default.find(btns, (value) => value.type === b.type);
            if (toUpdate) {
                return toUpdate;
            }
            else {
                return b.clone();
            }
        });
        this._quickPick.buttons = newButtons;
    }
}
exports.LookupV3QuickPickView = LookupV3QuickPickView;
//# sourceMappingURL=LookupV3QuickPickView.js.map