"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestTrait = void 0;
/**
 * A Trait class for testing purposes
 */
class TestTrait {
    constructor(template) {
        this.TEST_NAME_MODIFIER = "Test Name Modifier";
        this.TEST_TITLE_MODIFIER = "Test Title Modifier";
        this.id = "test-trait";
        this.OnWillCreate = {
            setNameModifier: () => {
                return {
                    name: this.TEST_NAME_MODIFIER,
                    promptUserForModification: false,
                };
            },
        };
        this.OnCreate = {
            setTitle: () => {
                return this.TEST_TITLE_MODIFIER;
            },
            setTemplate: () => {
                return this.template;
            },
        };
        this.template = template;
    }
}
exports.TestTrait = TestTrait;
//# sourceMappingURL=TestTrait.js.map