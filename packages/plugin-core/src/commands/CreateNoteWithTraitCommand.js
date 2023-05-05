"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateNoteWithTraitCommand = void 0;
const common_all_1 = require("@dendronhq/common-all");
const path_1 = __importDefault(require("path"));
const vscode = __importStar(require("vscode"));
const utils_1 = require("../components/lookup/utils");
const vsCodeUtils_1 = require("../vsCodeUtils");
const base_1 = require("./base");
const GotoNote_1 = require("./GotoNote");
const ExtensionProvider_1 = require("../ExtensionProvider");
const vaultSelectionModeConfigUtils_1 = require("../components/lookup/vaultSelectionModeConfigUtils");
const NoteLookupProviderUtils_1 = require("../components/lookup/NoteLookupProviderUtils");
const common_server_1 = require("@dendronhq/common-server");
const analytics_1 = require("../utils/analytics");
const TraitUtils_1 = require("../traits/TraitUtils");
const lodash_1 = __importDefault(require("lodash"));
const constants_1 = require("../constants");
const autoCompleter_1 = require("../utils/autoCompleter");
const AutoCompletableRegistrar_1 = require("../utils/registers/AutoCompletableRegistrar");
class CreateNoteWithTraitCommand extends base_1.BaseCommand {
    constructor(ext, commandId, 
    // TODO: refactor trait to `initTratCb` and remove static initialization of trait
    trait) {
        super();
        this.key = commandId;
        this.skipAnalytics = true;
        if (lodash_1.default.isFunction(trait)) {
            this.initTrait = trait;
        }
        else {
            this.initTrait = () => trait;
        }
        this._extension = ext;
    }
    get trait() {
        if (!this._trait) {
            this._trait = this.initTrait();
            if (lodash_1.default.isUndefined(this._trait)) {
                throw new common_all_1.DendronError({
                    message: `unable to init trait for ${this.key}`,
                });
            }
        }
        return this._trait;
    }
    async gatherInputs() {
        var _a, _b;
        if (!TraitUtils_1.TraitUtils.checkWorkspaceTrustAndWarn()) {
            return;
        }
        // If there's no modifier, provide a regular lookup UI.
        if (!((_a = this.trait.OnWillCreate) === null || _a === void 0 ? void 0 : _a.setNameModifier)) {
            const resp = await this.getNoteNameFromLookup();
            if (!resp) {
                return;
            }
            return {
                fname: resp,
            };
        }
        try {
            const context = await this.getCreateContext();
            // Default settings in case something goes wrong.
            let resp = {
                name: (_b = context.currentNoteName) !== null && _b !== void 0 ? _b : "",
                promptUserForModification: true,
            };
            try {
                resp = this.trait.OnWillCreate.setNameModifier(context);
            }
            catch (Error) {
                this.L.error({ ctx: "trait.OnWillCreate.setNameModifier", msg: Error });
            }
            let fname = resp.name;
            if (resp.promptUserForModification) {
                const resp = await this.getNoteNameFromLookup(fname);
                if (!resp) {
                    return;
                }
                fname = resp;
            }
            return {
                fname,
            };
        }
        catch (e) {
            this.L.error(e);
            //TODO: Info box with error.
            return;
        }
    }
    async enrichInputs(inputs) {
        const { fname: title } = inputs;
        return {
            title,
            fname: `${(0, common_all_1.cleanName)(title)}`,
        };
    }
    async execute(opts) {
        var _a, _b, _c, _d;
        const { fname } = opts;
        const ctx = "CreateNoteWithTraitCommand";
        this.L.info({ ctx, msg: "enter", opts });
        if (!TraitUtils_1.TraitUtils.checkWorkspaceTrustAndWarn()) {
            return;
        }
        let title;
        let body;
        let custom;
        let vault;
        // TODO: GoToNoteCommand() needs to have its arg behavior fixed, and then
        // this vault logic can be deferred there.
        if ((_a = this.trait.OnCreate) === null || _a === void 0 ? void 0 : _a.setVault) {
            try {
                const vaultName = this.trait.OnCreate.setVault();
                const { vaults } = ExtensionProvider_1.ExtensionProvider.getDWorkspace();
                vault = vaults.find((vault) => common_all_1.VaultUtils.getName(vault) === vaultName);
                if (!vault) {
                    vsCodeUtils_1.VSCodeUtils.showMessage(vsCodeUtils_1.MessageSeverity.ERROR, "Vault specified in the note trait does not exist", {});
                    return;
                }
            }
            catch (Error) {
                this.L.error({ ctx: "traint.onCreate.setVault", msg: Error });
            }
        }
        else {
            vault = opts.vaultOverride;
            if (!opts.vaultOverride) {
                const selectionMode = vaultSelectionModeConfigUtils_1.VaultSelectionModeConfigUtils.getVaultSelectionMode();
                const currentVault = utils_1.PickerUtilsV2.getVaultForOpenEditor();
                const selectedVault = await utils_1.PickerUtilsV2.getOrPromptVaultForNewNote({
                    vault: currentVault,
                    fname,
                    vaultSelectionMode: selectionMode,
                });
                if (!selectedVault) {
                    vscode.window.showInformationMessage("Note creation cancelled");
                    return;
                }
                else {
                    vault = selectedVault;
                }
            }
        }
        // Handle Trait Behavior
        if ((_b = this.trait.OnCreate) === null || _b === void 0 ? void 0 : _b.setTitle) {
            const context = await this.getCreateContext();
            context.currentNoteName = fname;
            try {
                title = this.trait.OnCreate.setTitle(context);
            }
            catch (Error) {
                this.L.error({ ctx: "trait.OnCreate.setTitle", msg: Error });
            }
        }
        if ((_c = this.trait.OnCreate) === null || _c === void 0 ? void 0 : _c.setBody) {
            try {
                body = await this.trait.OnCreate.setBody();
            }
            catch (Error) {
                this.L.error({ ctx: "trait.OnCreate.setBody", msg: Error });
            }
        }
        else if ((_d = this.trait.OnCreate) === null || _d === void 0 ? void 0 : _d.setTemplate) {
            // Check if we should apply a template from any traits:
            let templateNoteName = "";
            try {
                templateNoteName = this.trait.OnCreate.setTemplate();
            }
            catch (Error) {
                this.L.error({ ctx: "trait.OnCreate.setTemplate", msg: Error });
            }
            let maybeVault;
            // for cross vault template
            const { link: fname, vaultName } = (0, common_all_1.parseDendronURI)(templateNoteName);
            if (!lodash_1.default.isUndefined(vaultName)) {
                maybeVault = common_all_1.VaultUtils.getVaultByName({
                    vname: vaultName,
                    vaults: ExtensionProvider_1.ExtensionProvider.getEngine().vaults,
                });
                // If vault is not found, skip lookup through rest of notes and return error
                if (lodash_1.default.isUndefined(maybeVault)) {
                    this.L.error({
                        ctx: "trait.OnCreate.setTemplate",
                        msg: `No vault found for ${vaultName}`,
                    });
                    return;
                }
            }
            const notes = await ExtensionProvider_1.ExtensionProvider.getEngine().findNotes({
                fname,
                vault: maybeVault,
            });
            const dummy = common_all_1.NoteUtils.createForFake({
                contents: "",
                fname: "trait-tmp",
                id: "trait-tmp",
                vault: vault,
            });
            if (notes && notes.length > 0) {
                // Only apply schema if note is found
                common_server_1.TemplateUtils.applyTemplate({
                    templateNote: notes[0],
                    targetNote: dummy,
                    engine: this._extension.getEngine(),
                });
                body = dummy.body;
                custom = dummy.custom;
                analytics_1.AnalyticsUtils.track(common_all_1.EngagementEvents.TemplateApplied, {
                    source: "Trait",
                });
            }
            else {
                this.L.error({
                    ctx: "trait.OnCreate.setTemplate",
                    msg: `Unable to find note with name ${templateNoteName} to use as template.`,
                });
            }
        }
        await new GotoNote_1.GotoNoteCommand(this._extension).execute({
            qs: fname,
            vault,
            overrides: { title, traits: [this.trait.id], body, custom },
        });
        this.L.info({ ctx, msg: "exit" });
    }
    async getNoteNameFromLookup(initialValue) {
        return new Promise((resolve) => {
            var _a;
            const lookupCreateOpts = {
                nodeType: "note",
                disableVaultSelection: true,
            };
            const extension = ExtensionProvider_1.ExtensionProvider.getExtension();
            const lc = extension.lookupControllerFactory.create(lookupCreateOpts);
            const provider = extension.noteLookupProviderFactory.create("createNoteWithTrait", {
                allowNewNote: true,
                forceAsIsPickerValueUsage: true,
            });
            const defaultNoteName = initialValue !== null && initialValue !== void 0 ? initialValue : path_1.default.basename(((_a = vsCodeUtils_1.VSCodeUtils.getActiveTextEditor()) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath) || "", ".md");
            let disposable;
            NoteLookupProviderUtils_1.NoteLookupProviderUtils.subscribe({
                id: "createNoteWithTrait",
                controller: lc,
                logger: this.L,
                onHide: () => {
                    resolve(undefined);
                    NoteLookupProviderUtils_1.NoteLookupProviderUtils.cleanup({
                        id: "createNoteWithTrait",
                        controller: lc,
                    });
                },
                onDone: (event) => {
                    const data = event.data;
                    if (data.cancel) {
                        resolve(undefined);
                    }
                    else {
                        resolve(data.selectedItems[0].fname);
                    }
                    NoteLookupProviderUtils_1.NoteLookupProviderUtils.cleanup({
                        id: "createNoteWithTrait",
                        controller: lc,
                    });
                    disposable === null || disposable === void 0 ? void 0 : disposable.dispose();
                    vsCodeUtils_1.VSCodeUtils.setContext(constants_1.DendronContext.NOTE_LOOK_UP_ACTIVE, false);
                },
                onError: (event) => {
                    const error = event.data.error;
                    vscode.window.showErrorMessage(error.message);
                    resolve(undefined);
                    NoteLookupProviderUtils_1.NoteLookupProviderUtils.cleanup({
                        id: "createNoteWithTrait",
                        controller: lc,
                    });
                    disposable === null || disposable === void 0 ? void 0 : disposable.dispose();
                    vsCodeUtils_1.VSCodeUtils.setContext(constants_1.DendronContext.NOTE_LOOK_UP_ACTIVE, false);
                },
            });
            lc.show({
                placeholder: "Enter Note Name",
                provider,
                initialValue: defaultNoteName,
                title: `Create Note with Trait`,
            });
            vsCodeUtils_1.VSCodeUtils.setContext(constants_1.DendronContext.NOTE_LOOK_UP_ACTIVE, true);
            disposable = AutoCompletableRegistrar_1.AutoCompletableRegistrar.OnAutoComplete(() => {
                if (lc.quickPick) {
                    lc.quickPick.value = autoCompleter_1.AutoCompleter.getAutoCompletedValue(lc.quickPick);
                    lc.provider.onUpdatePickerItems({
                        picker: lc.quickPick,
                    });
                }
            });
        });
    }
    async getCreateContext() {
        var _a, _b;
        const clipboard = await vscode.env.clipboard.readText();
        const activeRange = await vsCodeUtils_1.VSCodeUtils.extractRangeFromActiveEditor();
        const { document, range } = activeRange || {};
        const selectedText = document ? document.getText(range).trim() : "";
        const openNoteName = ((_a = vscode.window.activeTextEditor) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath)
            ? path_1.default.basename((_b = vscode.window.activeTextEditor) === null || _b === void 0 ? void 0 : _b.document.uri.fsPath, ".md")
            : "";
        return {
            selectedText,
            clipboard,
            currentNoteName: openNoteName,
        };
    }
}
exports.CreateNoteWithTraitCommand = CreateNoteWithTraitCommand;
//# sourceMappingURL=CreateNoteWithTraitCommand.js.map