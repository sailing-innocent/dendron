"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
const common_all_1 = require("@dendronhq/common-all");
const lodash_1 = __importDefault(require("lodash"));
const STORE = {};
class MemoryStore {
    static instance(force) {
        if (!MemoryStore._instance || force) {
            MemoryStore._instance = new MemoryStore();
        }
        return MemoryStore._instance;
    }
    async put(key, value) {
        STORE[key] = value;
    }
    getEngine() {
        const out = lodash_1.default.values(STORE)[0];
        if (!out) {
            throw new common_all_1.DendronError({ message: "STORE is empty" });
        }
        return out;
    }
    async get(key) {
        return STORE[key];
    }
    async list(prefix) {
        const keys = lodash_1.default.filter(lodash_1.default.keys(STORE), (ent) => ent.startsWith(prefix));
        return lodash_1.default.pick(STORE, keys);
    }
}
MemoryStore.store = () => {
    return STORE;
};
exports.MemoryStore = MemoryStore;
//# sourceMappingURL=memoryStore.js.map