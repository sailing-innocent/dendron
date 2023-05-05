"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotionExportPod = void 0;
const common_all_1 = require("@dendronhq/common-all");
const martian_1 = require("@instantish/martian");
const client_1 = require("@notionhq/client");
const lodash_1 = __importDefault(require("lodash"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const limiter_1 = require("limiter");
const ID = "dendron.notion";
// Allow 3 req/sec (the Notion API limit). Also understands 'hour', 'minute', 'day', or a no. of ms
// @ts-ignore
const limiter = new limiter_1.RateLimiter({ tokensPerInterval: 3, interval: "second" });
class NotionExportPod extends basev3_1.ExportPod {
    constructor() {
        super(...arguments);
        /**
         * Method to create pages in Notion
         */
        this.createPagesInNotion = (blockPagesArray, notion) => {
            return (0, common_all_1.asyncLoop)(blockPagesArray, async (block) => {
                await limiter.removeTokens(1);
                try {
                    await notion.pages.create(block);
                }
                catch (error) {
                    throw new common_all_1.DendronError({
                        message: "Failed to export all the notes. " + JSON.stringify(error),
                        severity: common_all_1.ERROR_SEVERITY.MINOR,
                    });
                }
            });
        };
        /**
         * Method to convert markdown to Notion Block
         */
        this.convertMdToNotionBlock = (notes, pageId) => {
            const notionBlock = notes.map((note) => {
                const children = (0, martian_1.markdownToBlocks)(note.body);
                return {
                    parent: {
                        page_id: pageId,
                    },
                    properties: {
                        title: {
                            title: [{ type: "text", text: { content: note.title } }],
                        },
                    },
                    children,
                };
            });
            return notionBlock;
        };
        /**
         * Method to get page name of a Notion Page
         */
        this.getPageName = (page) => {
            const { title } = page.parent.type !== "database_id"
                ? page.properties.title
                : page.properties.Name;
            return title[0] ? title[0].plain_text : "Untitled";
        };
        /**
         * Method to get all the pages from Notion
         */
        this.getAllNotionPages = async (notion, progressOpts) => {
            const { token, showMessage } = progressOpts;
            token.onCancellationRequested(() => {
                showMessage("Cancelled..");
                return;
            });
            const allDocs = await notion.search({
                sort: { direction: "descending", timestamp: "last_edited_time" },
                filter: { value: "page", property: "object" },
            });
            const pagesMap = {};
            const pages = allDocs.results;
            pages.forEach((page) => {
                const key = this.getPageName(page);
                const value = page.id;
                pagesMap[key] = value;
            });
            return pagesMap;
        };
    }
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: ["apiKey", "vault"],
            properties: {
                apiKey: {
                    type: "string",
                    description: "Api key for Notion",
                },
                vault: {
                    type: "string",
                    description: "vault to export from",
                },
            },
        });
    }
    async plant(opts) {
        const { config, utilityMethods } = opts;
        const { getSelectionFromQuickpick, withProgressOpts } = utilityMethods;
        const { apiKey, vault } = config;
        let { notes } = opts;
        notes = notes.filter((note) => note.vault.fsPath === vault);
        // Initializing a client
        const notion = new client_1.Client({
            auth: apiKey,
        });
        const pagesMap = await withProgressOpts.withProgress({
            location: withProgressOpts.location,
            title: "importing parent pages",
            cancellable: true,
        }, async (progress, token) => {
            return this.getAllNotionPages(notion, {
                progress,
                token,
                showMessage: withProgressOpts.showMessage,
            });
        });
        if (lodash_1.default.isUndefined(pagesMap)) {
            return { notes: [] };
        }
        const selectedPage = await getSelectionFromQuickpick(Object.keys(pagesMap));
        if (lodash_1.default.isUndefined(selectedPage)) {
            return { notes: [] };
        }
        const pageId = pagesMap[selectedPage];
        const blockPagesArray = this.convertMdToNotionBlock(notes, pageId);
        await this.createPagesInNotion(blockPagesArray, notion);
        return { notes };
    }
}
NotionExportPod.id = ID;
NotionExportPod.description = "export notes to notion";
exports.NotionExportPod = NotionExportPod;
//# sourceMappingURL=NotionPod.js.map