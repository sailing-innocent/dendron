"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SQLiteMetadataStore = void 0;
/* eslint-disable no-undef */
const common_all_1 = require("@dendronhq/common-all");
const lodash_1 = __importDefault(require("lodash"));
const vscode_uri_1 = require("vscode-uri");
// @ts-ignore
const prisma_shim_1 = require("./prisma-shim");
let _prisma;
function getPrismaClient() {
    if (_prisma === undefined) {
        throw Error("prisma client not initialized");
    }
    return _prisma;
}
class SQLiteMetadataStore {
    constructor({ wsRoot, client, force, }) {
        if (_prisma && (!force || client)) {
            this.status = "ready";
            // TODO: throw an error
            return;
        }
        if (client && !force) {
            _prisma = client;
            this.status = "ready";
            return;
        }
        this.status = "loading";
        // example uri: "DATABASE_URL="file://Users/kevinlin/code/dendron/local/notes.db""
        const dbUrl = vscode_uri_1.URI.file(`${wsRoot}/metadata.db`);
        (0, prisma_shim_1.loadPrisma)().then(({ PrismaClient }) => {
            _prisma = new PrismaClient({
                datasources: {
                    db: {
                        url: dbUrl.toString(),
                    },
                },
            });
            this.status = "ready";
        });
    }
    dispose() { }
    async get(id) {
        const note = await getPrismaClient().note.findUnique({ where: { id } });
        if (lodash_1.default.isNull(note)) {
            return {
                error: common_all_1.ErrorFactory.create404Error({ url: `${id} is missing` }),
            };
        }
        return { data: note };
    }
    async find(opts) {
        const note = (await getPrismaClient().note.findMany({
            where: opts,
        }));
        return {
            data: note,
        };
    }
    async write(key, data) {
        try {
            await getPrismaClient().note.create({ data });
        }
        catch (err) {
            return {
                error: err,
            };
        }
        return {
            data: key,
        };
    }
    async delete(key) {
        try {
            await getPrismaClient().note.delete({ where: { id: key } });
        }
        catch (err) {
            return {
                error: err,
            };
        }
        return {
            data: key,
        };
    }
    query(_opts) {
        throw new Error("Method not implemented.");
    }
    static prisma() {
        return getPrismaClient();
    }
    static async isDBInitialized() {
        const query = `SELECT name FROM sqlite_master WHERE type='table' AND name='Note'`;
        const resp = (await getPrismaClient().$queryRawUnsafe(query));
        return resp.length === 1;
    }
    /**
     * Check if this vault is initialized in sqlite
     */
    static async isVaultInitialized(vault) {
        const resp = await getPrismaClient().dVault.findFirst({
            where: { fsPath: vault.fsPath },
        });
        return resp !== null;
    }
    static async createWorkspace(wsRoot) {
        return getPrismaClient().workspace.create({
            data: { prismaSchemaVersion: 0, wsRoot },
        });
    }
    static async createAllTables() {
        const queries = `
    CREATE TABLE IF NOT EXISTS "Workspace" (
      "wsRoot" TEXT NOT NULL PRIMARY KEY,
      "prismaSchemaVersion" INTEGER NOT NULL
  );
  CREATE UNIQUE INDEX "Workspace_wsRoot_key" ON "Workspace"("wsRoot");
  CREATE TABLE IF NOT EXISTS "DVault" (
      "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
      "name" TEXT,
      "fsPath" TEXT NOT NULL,
      "wsRoot" TEXT NOT NULL,
      CONSTRAINT "DVault_wsRoot_fkey" FOREIGN KEY ("wsRoot") REFERENCES "Workspace" ("wsRoot") ON DELETE CASCADE ON UPDATE CASCADE
  );
  CREATE UNIQUE INDEX "DVault_name_key" ON "DVault"("name");
  CREATE UNIQUE INDEX "DVault_wsRoot_fsPath_key" ON "DVault"("wsRoot", "fsPath");
  CREATE TABLE IF NOT EXISTS "Note" (
      "id" TEXT NOT NULL PRIMARY KEY,
      "fname" TEXT,
      "title" TEXT,
      "updated" INTEGER,
      "created" INTEGER,
      "stub" BOOLEAN,
      "dVaultId" INTEGER NOT NULL,
      CONSTRAINT "Note_dVaultId_fkey" FOREIGN KEY ("dVaultId") REFERENCES "DVault" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
  );
  CREATE INDEX "idx_notes_id" ON "Note"("id");

	CREATE VIRTUAL TABLE [notes_fts] USING FTS5 (
			fname, id,
			content=[Note]
	);`
            .split(";")
            .slice(0, -1);
        queries.push(`CREATE TRIGGER notes_ai AFTER INSERT ON Note
    BEGIN
        INSERT INTO notes_fts (fname, id)
        VALUES (new.fname, new.id);
    END;`);
        queries.push(`CREATE TRIGGER notes_ad AFTER DELETE ON Note
      BEGIN
        INSERT INTO notes_fts (notes_fts, rowid, fname, id) VALUES ('delete', old.rowid, old.id, old.fname);
      END;`);
        queries.push(`CREATE TRIGGER notes_au AFTER UPDATE ON Note
    BEGIN
      INSERT INTO notes_fts(notes_fts, rowid, fname, id) VALUES('delete', old.rowid, old.id, old.fname);
      INSERT INTO notes_fts(rowid, fname, id) VALUES (new.rowid, new.fname, new.id);
    END;`);
        return (0, common_all_1.asyncLoopOneAtATime)(queries, async (_query) => {
            return getPrismaClient().$queryRawUnsafe(_query);
        });
    }
    static async upsertNote(_note) {
        // TODO: will be used to fill cache misses
        throw Error("not impelmented");
    }
    static async bulkInsertAllNotes({ notesIdDict, }) {
        if (lodash_1.default.isEmpty(notesIdDict)) {
            return;
        }
        const prisma = getPrismaClient();
        const allVaultsMap = lodash_1.default.keyBy(await prisma.dVault.findMany(), (ent) => ent.fsPath);
        const sqlBegin = "INSERT OR REPLACE INTO 'Note' ('fname', 'id', 'dVaultId') VALUES ";
        const sqlEnd = lodash_1.default.values(notesIdDict)
            .map(({ fname, id, vault }) => {
            const maybeVault = allVaultsMap[vault.fsPath];
            if (!maybeVault) {
                throw Error(`no vault found with fsPath ${vault.fsPath}`);
            }
            return `('${fname}', '${id}', '${maybeVault.id}')`;
        })
            .join(",");
        const fullQuery = sqlBegin + sqlEnd;
        // eslint-disable-next-line no-useless-catch
        try {
            await prisma.$queryRawUnsafe(fullQuery);
        }
        catch (error) {
            // uncomment to log
            // console.log("---> ERROR START");
            // console.log(fullQuery);
            // // eslint-disable-next-line global-require
            // const fs = require("fs-extra");
            // fs.writeFileSync("/tmp/query.txt", fullQuery);
            // console.log("---> ERROR END");
            throw error;
        }
        return { query: fullQuery };
    }
    static async search(query) {
        query = transformQuery(query).join(" ");
        const raw = `SELECT * FROM notes_fts WHERE notes_fts = '"fname" : NEAR(${query})'`;
        return {
            hits: (await getPrismaClient().$queryRawUnsafe(raw)),
            query: raw,
        };
    }
}
exports.SQLiteMetadataStore = SQLiteMetadataStore;
/**
 * Transform queries for sqlite syntax. All queries become prefix queries.
 * So "foo bar" becomes "foo* bar*"
 */
function transformQuery(query) {
    return query.split(" ").map((ent) => `"${ent}"*`);
}
//# sourceMappingURL=SQLiteMetadataStore.js.map