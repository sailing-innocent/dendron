"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserDefinedTraitV1 = void 0;
/**
 * A Note Trait that will execute end-user defined javascript code.
 */
class UserDefinedTraitV1 {
    /**
     *
     * @param traitId ID for the note type
     * @param scriptPath - path to the .js file that will be dynamically run
     */
    constructor(traitId, scriptPath) {
        this.id = traitId;
        this.scriptPath = scriptPath;
    }
    /**
     * This method needs to be called before a user defined trait's defined
     * methods will be invoked.
     */
    async initialize() {
        var _a, _b, _c;
        const hack = require(`./webpack-require-hack.js`);
        const trait = hack(this.scriptPath);
        this.OnWillCreate = {
            setNameModifier: ((_a = trait.OnWillCreate) === null || _a === void 0 ? void 0 : _a.setNameModifier)
                ? this.wrapFnWithRequiredModules(trait.OnWillCreate.setNameModifier)
                : undefined,
        };
        this.OnCreate = {
            setTitle: ((_b = trait.OnCreate) === null || _b === void 0 ? void 0 : _b.setTitle)
                ? this.wrapFnWithRequiredModules(trait.OnCreate.setTitle)
                : undefined,
            setTemplate: ((_c = trait.OnCreate) === null || _c === void 0 ? void 0 : _c.setTemplate)
                ? this.wrapFnWithRequiredModules(trait.OnCreate.setTemplate)
                : undefined,
        };
    }
    /**
     * Helper method that returns a modified form of the passed in function. The
     * modified form allows the function to access lodash and luxon modules as if
     * they were imported modules. It does this by temporarily modifying the
     * global Object prototype, which allows module access with '_.*' or 'luxon.*'
     * syntax
     * @param fn
     * @returns
     */
    wrapFnWithRequiredModules(fn) {
        return function (args) {
            const objectPrototype = Object.prototype;
            const _ = require("lodash");
            const luxon = require("luxon");
            try {
                objectPrototype._ = _;
                objectPrototype.luxon = luxon;
                return fn(args);
            }
            finally {
                // Make sure to clean up the global object after we're done.
                delete objectPrototype._;
                delete objectPrototype.luxon;
            }
        };
    }
}
exports.UserDefinedTraitV1 = UserDefinedTraitV1;
//# sourceMappingURL=UserDefinedTraitV1.js.map