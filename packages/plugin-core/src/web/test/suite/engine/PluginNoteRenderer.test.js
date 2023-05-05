"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const assert_1 = __importDefault(require("assert"));
const tsyringe_1 = require("tsyringe");
const DendronEngineV3Web_1 = require("../../../engine/DendronEngineV3Web");
const setupTestEngineContainer_1 = require("../../helpers/setupTestEngineContainer");
async function initializeTest() {
    await (0, setupTestEngineContainer_1.setupTestEngineContainer)();
    const engine = tsyringe_1.container.resolve(DendronEngineV3Web_1.DendronEngineV3Web);
    await engine.init();
    return engine;
}
suite("GIVEN renderNote is run", () => {
    test("WHEN a basic note is rendered THEN the right HTML is returned", async () => {
        const engine = await initializeTest();
        const vault = {
            fsPath: "foo",
        };
        const testNote = {
            fname: "foo",
            id: "foo",
            title: "foo",
            desc: "foo",
            links: [],
            anchors: {},
            type: "note",
            updated: 1,
            created: 1,
            parent: "root",
            children: [],
            data: "test_data",
            body: "this is the body",
            vault,
        };
        const result = await engine.renderNote({ id: "foo", note: testNote });
        assert_1.default.strictEqual(result.data, '<h1 id="foo">foo</h1>\n<p>this is the body</p>');
    });
    test("WHEN a wikilink is rendered THEN the HTML contains the proper link info", async () => {
        var _a;
        const engine = await initializeTest();
        const vault = {
            fsPath: "foo",
        };
        const testNote = {
            fname: "foo",
            id: "foo",
            title: "foo",
            desc: "foo",
            links: [],
            anchors: {},
            type: "note",
            updated: 1,
            created: 1,
            parent: "root",
            children: [],
            data: "test_data",
            body: "[[bar]]",
            vault,
        };
        const result = await engine.renderNote({ id: "foo", note: testNote });
        (0, assert_1.default)((_a = result.data) === null || _a === void 0 ? void 0 : _a.includes(`<a href="bar.html">Bar</a>`));
    });
});
//# sourceMappingURL=PluginNoteRenderer.test.js.map