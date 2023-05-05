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
exports.onWatcher = exports.onExtension = exports.onWSInit = exports.createMockQuickPick = exports.createMockConfig = exports.getActiveEditorBasename = void 0;
const engine_server_1 = require("@dendronhq/engine-server");
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
// // You can import and use all API from the 'vscode' module
// // as well as import your extension to test it
const vscode = __importStar(require("vscode"));
const vsCodeUtils_1 = require("../vsCodeUtils");
function getActiveEditorBasename() {
    var _a;
    return path_1.default.basename((_a = vsCodeUtils_1.VSCodeUtils.getActiveTextEditor()) === null || _a === void 0 ? void 0 : _a.document.uri.fsPath);
}
exports.getActiveEditorBasename = getActiveEditorBasename;
function createMockConfig(settings) {
    const _settings = settings;
    return {
        get: (_key) => {
            return lodash_1.default.get(_settings, _key);
        },
        update: async (_key, _value) => {
            lodash_1.default.set(_settings, _key, _value);
        },
        has: (key) => {
            return lodash_1.default.has(_settings, key);
        },
        inspect: (_section) => {
            return _settings;
        },
    };
}
exports.createMockConfig = createMockConfig;
function createMockQuickPick({ value, selectedItems = [], canSelectMany, buttons, }) {
    const qp = vscode.window.createQuickPick();
    if (value) {
        qp.value = value;
    }
    qp.items = selectedItems;
    qp.selectedItems = selectedItems;
    qp.canSelectMany = canSelectMany || false;
    qp.buttons = buttons || [];
    return qp;
}
exports.createMockQuickPick = createMockQuickPick;
function onWSInit(cb) {
    engine_server_1.HistoryService.instance().subscribe("extension", async (_event) => {
        if (_event.action === "initialized") {
            await cb();
        }
    });
}
exports.onWSInit = onWSInit;
function onExtension({ action, cb, }) {
    engine_server_1.HistoryService.instance().subscribe("extension", async (_event) => {
        if (_event.action === action) {
            await cb(_event);
        }
    });
}
exports.onExtension = onExtension;
function onWatcher({ action, cb, }) {
    engine_server_1.HistoryService.instance().subscribe("watcher", async (_event) => {
        if (_event.action === action) {
            await cb();
        }
    });
}
exports.onWatcher = onWatcher;
//# sourceMappingURL=testUtils.js.map