"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PreviewPanelFactory = void 0;
require("reflect-metadata");
const tsyringe_1 = require("tsyringe");
const PreviewPanel_1 = require("../../views/common/preview/PreviewPanel");
/**
 * NOTE: This class is meant to only be used in _extension.ts/workspace.ts, or in
 * tests. If you need to show preview in a component, inject a PreviewProxy in
 * the constructor signature and use that object to show/hide preview instead.
 */
class PreviewPanelFactory {
    /**
     * Get a usable PreviewProxy for showing the preview
     */
    static create() {
        // Simple singleton implementation, since we only want one preview panel at
        // any given time.
        // if preview panel doesn't exist yet, create a new one.
        if (!PreviewPanelFactory._preview) {
            PreviewPanelFactory._preview = tsyringe_1.container.resolve(PreviewPanel_1.PreviewPanel);
        }
        return PreviewPanelFactory._preview;
    }
}
exports.PreviewPanelFactory = PreviewPanelFactory;
//# sourceMappingURL=PreviewViewFactory.js.map