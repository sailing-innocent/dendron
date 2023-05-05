"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SCHEMA_PRESETS_V4 = void 0;
const common_all_1 = require("@dendronhq/common-all");
const common_server_1 = require("@dendronhq/common-server");
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const noteUtils_1 = require("../noteUtils");
const CreateSchemaFactory = (opts) => {
    const func = ({ vault, wsRoot, noWrite }) => {
        const _opts = {
            ...opts,
            vault,
            wsRoot,
            noWrite,
        };
        return noteUtils_1.NoteTestUtilsV4.createSchema(_opts);
    };
    return { create: func, fname: opts.fname };
};
exports.SCHEMA_PRESETS_V4 = {
    SCHEMA_SIMPLE: CreateSchemaFactory({
        fname: "foo",
        modifier: (schema) => {
            const vault = schema.root.vault;
            const child = common_all_1.SchemaUtils.createFromSchemaRaw({ id: "ch1", vault });
            schema.schemas["ch1"] = child;
            common_all_1.DNodeUtils.addChild(schema.root, child);
            return schema;
        },
    }),
    SCHEMA_SIMPLE_OTHER: CreateSchemaFactory({
        fname: "bar",
        modifier: (schema) => {
            const vault = schema.root.vault;
            const child = common_all_1.SchemaUtils.createFromSchemaRaw({ id: "ch1", vault });
            schema.schemas["ch1"] = child;
            common_all_1.DNodeUtils.addChild(schema.root, child);
            return schema;
        },
    }),
    SCHEMA_SIMPLE_OTHER_NO_CHILD: CreateSchemaFactory({
        fname: "bar",
    }),
    SCHEMA_DOMAIN_NAMESPACE: CreateSchemaFactory({
        fname: "pro",
        modifier: (schema) => {
            //const vault = schema.root.vault;
            schema.schemas[schema.root.id].data.namespace = true;
            return schema;
        },
    }),
    BAD_SCHEMA: {
        create: ({ vault, wsRoot }) => {
            const vpath = (0, common_server_1.vault2Path)({ vault, wsRoot });
            fs_extra_1.default.writeFileSync(path_1.default.join(vpath, "hello.schema.yml"), `
schemas:
- id: hello
  title: hello`, { encoding: "utf8" });
        },
        fname: "hello",
    },
};
//# sourceMappingURL=schemas.js.map