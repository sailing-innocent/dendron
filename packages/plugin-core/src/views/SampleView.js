"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SampleView = void 0;
const common_all_1 = require("@dendronhq/common-all");
const utils_1 = require("./utils");
class SampleView {
    postMessage(msg) {
        var _a;
        (_a = this._view) === null || _a === void 0 ? void 0 : _a.webview.postMessage(msg);
    }
    async resolveWebviewView(webviewView, _context, _token) {
        this._view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [],
        };
        webviewView.webview.html = await this._getHtmlForWebview(webviewView.webview);
    }
    _getHtmlForWebview(_webview) {
        return utils_1.WebViewUtils.genHTMLForTreeView({
            title: "SamplePage",
            view: common_all_1.DendronTreeViewKey.SAMPLE_VIEW,
        });
    }
}
SampleView.viewType = common_all_1.DendronTreeViewKey.SAMPLE_VIEW;
exports.SampleView = SampleView;
//# sourceMappingURL=SampleView.js.map