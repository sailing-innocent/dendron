"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionUtils = exports.NotionExportPodV2 = void 0;
const common_all_1 = require("@dendronhq/common-all");
const martian_1 = require("@instantish/martian");
const limiter_1 = require("limiter");
const lodash_1 = __importDefault(require("lodash"));
const __1 = require("../../..");
// Allow 3 req/sec (the Notion API limit). Also understands 'hour', 'minute', 'day', or a no. of ms
// @ts-ignore
const limiter = new limiter_1.RateLimiter({ tokensPerInterval: 3, interval: "second" });
/**
 * Notion Export Pod (V2 - for compatibility with Pod V2 workflow).
 */
class NotionExportPodV2 {
    constructor({ podConfig }) {
        /**
         * Method to convert markdown to Notion Block
         */
        this.convertMdToNotionBlock = (notes, parentPageId) => {
            const notionBlock = notes.map((note) => {
                const children = (0, martian_1.markdownToBlocks)(note.body);
                return {
                    dendronId: note.id,
                    block: {
                        parent: {
                            page_id: parentPageId,
                        },
                        properties: {
                            title: {
                                title: [{ type: "text", text: { content: note.title } }],
                            },
                        },
                        children,
                    },
                };
            });
            return notionBlock;
        };
        /**
         * Method to create pages in Notion
         */
        this.createPagesInNotion = async (blockPagesArray) => {
            const notion = new __1.Client({
                auth: this._config.apiKey,
            });
            const errors = [];
            const out = await Promise.all(blockPagesArray.map(async (ent) => {
                // @ts-ignore
                await limiter.removeTokens(1);
                try {
                    const response = await notion.pages.create(ent.block);
                    return {
                        notionId: response.id,
                        dendronId: ent.dendronId,
                    };
                }
                catch (error) {
                    errors.push(error);
                    return;
                }
            }));
            return {
                data: out,
                errors,
            };
        };
        this._config = podConfig;
    }
    async exportNotes(notes) {
        const { parentPageId } = this._config;
        const blockPagesArray = this.convertMdToNotionBlock(notes, parentPageId);
        const { data, errors } = await this.createPagesInNotion(blockPagesArray);
        const createdNotes = data.filter((ent) => !lodash_1.default.isUndefined(ent));
        if (errors.length > 0) {
            return {
                data: { created: createdNotes },
                error: new common_all_1.DendronCompositeError(errors),
            };
        }
        else {
            return common_all_1.ResponseUtil.createHappyResponse({
                data: {
                    created: createdNotes,
                },
            });
        }
    }
    static config() {
        return __1.ConfigFileUtils.createExportConfig({
            required: ["connectionId", "parentPageId"],
            properties: {
                connectionId: {
                    description: "ID of the Notion Connected Service",
                    type: "string",
                },
                parentPageId: {
                    description: "ID of parent page in notion",
                    type: "string",
                },
            },
        });
    }
}
exports.NotionExportPodV2 = NotionExportPodV2;
class NotionUtils {
}
_a = NotionUtils;
NotionUtils.updateNotionIdForNewlyCreatedNotes = async (records, engine) => {
    await Promise.all(records.map(async (record) => {
        if (lodash_1.default.isUndefined(record))
            return;
        const { notionId, dendronId } = record;
        if (!dendronId)
            return;
        const resp = await engine.getNote(dendronId);
        if (resp.data) {
            const note = resp.data;
            note.custom = {
                ...note.custom,
                notionId,
            };
            await engine.writeNote(note, { metaOnly: true });
        }
    }));
};
exports.NotionUtils = NotionUtils;
//# sourceMappingURL=NotionExportPodV2.js.map