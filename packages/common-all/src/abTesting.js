"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ABTest = void 0;
const lodash_1 = __importDefault(require("lodash"));
const spark_md5_1 = __importDefault(require("spark-md5"));
const error_1 = require("./error");
const MAX_B16_INT = 0xffffffff;
/** One A/B test.
 *
 * Warning! Test names **must** stay consistent between Dendron releases, or
 * users will see the tests flip/flop.
 *
 * Can test two or more groups.
 *
 * ```ts
 * const EXAMPLE_TEST = new ABTest("example", [
 *   {
 *     name: "user with example",
 *     weight: 2,
 *   },
 *   {
 *     name: "users without example",
 *     weight: 1,
 *   },
 * ]);
 *
 * EXAMPLE_TEST.getUserGroup("anonymous user UUID");
 * ```
 CURRENT_AB_TESTS|* ^85lbm3148c1a
 */
class ABTest {
    get name() {
        return this._name;
    }
    constructor(name, groups) {
        this._name = name;
        if (groups.length < 2)
            throw new error_1.DendronServerError({
                message: "An A/B test is created with less than 2 groups. Each test must have at least 2.",
            });
        const sumWeights = lodash_1.default.sumBy(groups, (group) => group.weight);
        this.groups = groups.map((group) => {
            return { ...group, weight: group.weight / sumWeights };
        });
    }
    /** Given the user ID, find which group of the AB test the user belongs to. */
    getUserGroup(userId) {
        const hash = spark_md5_1.default.hash(`${this._name}:${userId}`);
        const hashedInt = parseInt(`0x${hash.slice(0, 8)}`, 16);
        const userRandom = hashedInt / MAX_B16_INT;
        // add up group weights until we hit the user random
        let accum = 0;
        for (const group of this.groups) {
            accum += group.weight;
            // once we're above the user's random threshold, the user is in this group
            if (userRandom <= accum) {
                return group.name;
            }
        }
        return this.groups[this.groups.length - 1].name;
    }
}
exports.ABTest = ABTest;
//# sourceMappingURL=abTesting.js.map