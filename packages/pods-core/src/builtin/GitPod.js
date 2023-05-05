"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GitPunchCardExportPod = void 0;
const common_all_1 = require("@dendronhq/common-all");
const engine_server_1 = require("@dendronhq/engine-server");
const csv_writer_1 = require("csv-writer");
const fs_extra_1 = __importDefault(require("fs-extra"));
const lodash_1 = __importDefault(require("lodash"));
const path_1 = __importDefault(require("path"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const writeCSV = (opts) => {
    const { dest, data, header } = opts;
    const csvWriter = (0, csv_writer_1.createObjectCsvWriter)({
        path: dest,
        header,
    });
    return csvWriter.writeRecords(data);
};
class GitPunchCardExportPod extends basev3_1.ExportPod {
    get config() {
        return utils_1.PodUtils.createExportConfig({
            required: [],
            properties: {},
        });
    }
    parseChunk(chunk) {
        const [p1, p2] = chunk;
        const [commit, time] = p1.split(",").map((ent) => lodash_1.default.trim(ent, ` '"`));
        const dt = common_all_1.Time.DateTime.fromSeconds(parseInt(time));
        const out = {
            commit,
            time: dt.toFormat("y-MM-dd"),
            files: 0,
            insert: 0,
            delete: 0,
        };
        p2.split(",").map((ent) => {
            ent = lodash_1.default.trim(ent);
            if (ent.indexOf("changed") > 0) {
                out["files"] = parseInt(ent.split(" ")[0]);
            }
            else if (ent.indexOf("insertion") > 0) {
                out["insert"] = parseInt(ent.split(" ")[0]);
            }
            else if (ent.indexOf("deletion") > 0) {
                out["delete"] = parseInt(ent.split(" ")[0]);
            }
            else {
                console.log("INVALID VALUE", p2);
                throw Error();
            }
        });
        return out;
    }
    async plant(opts) {
        const { dest, notes, wsRoot } = opts;
        // verify dest exist
        const podDstPath = dest.fsPath;
        fs_extra_1.default.ensureDirSync(podDstPath);
        const repoPaths = await new engine_server_1.WorkspaceService({ wsRoot }).getAllRepos();
        const getAllCommits = async (root) => {
            const git = new engine_server_1.Git({ localUrl: root });
            const commits = await git.client([
                "log",
                "--pretty=commit%n%h, %at",
                "--shortstat",
            ]);
            const cleanCommits = commits
                .split("commit")
                .filter((ent) => !lodash_1.default.isEmpty(ent));
            const data = cleanCommits
                .map((chunk) => {
                const cleanChunk = chunk
                    .split("\n")
                    .filter((ent) => !lodash_1.default.isEmpty(ent))
                    .map((ent) => lodash_1.default.trim(ent));
                if (lodash_1.default.size(cleanChunk) == 2) {
                    const resp = this.parseChunk(cleanChunk);
                    return resp;
                }
                return undefined;
            })
                .filter((ent) => !lodash_1.default.isUndefined(ent));
            return data;
        };
        const data = lodash_1.default.flatten(await Promise.all(repoPaths.flatMap((root) => getAllCommits(root))));
        const csvDest = path_1.default.join(podDstPath, "commits.csv");
        const htmlDest = path_1.default.join(podDstPath, "index.html");
        await writeCSV({
            dest: csvDest,
            data,
            header: [
                { id: "commit", title: "commit" },
                { id: "delete", title: "delete" },
                { id: "files", title: "files" },
                { id: "insert", title: "insert" },
                { id: "time", title: "time" },
            ],
        });
        fs_extra_1.default.writeFileSync(htmlDest, template);
        return { notes };
    }
}
GitPunchCardExportPod.id = "dendron.gitpunchard";
GitPunchCardExportPod.description = "export notes as json";
exports.GitPunchCardExportPod = GitPunchCardExportPod;
const template = `<!DOCTYPE html>
<html>
  <head>
    <title>Vega-Lite Bar Chart</title>
    <meta charset="utf-8" />

    <script src="https://cdn.jsdelivr.net/npm/vega@5.19.1"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-lite@5.0.0"></script>
    <script src="https://cdn.jsdelivr.net/npm/vega-embed@6.15.1"></script>

    <style media="screen">
      /* Add space between Vega-Embed links  */
      .vega-actions a {
        margin-right: 5px;
      }
    </style>
  </head>
  <body>
    <h1>Dendron Punchard</h1>
    <!-- Container for the visualization -->
    <div id="vis" style="width:100%;min-height:800px"></div>

    <script>
      // Assign the specification to a local variable vlSpec.
      /*
      var vlSpec = {
          "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
          "description": "Punchcard Visualization like on Github. The day on y-axis uses a custom order from Monday to Sunday.  The sort property supports both full day names (e.g., 'Monday') and their three letter initials (e.g., 'mon') -- both of which are case insensitive.",
          "data": { "url": "./commits.csv"},
          "mark": "rect",
          "width": "container",
          "encoding": {
            "y": {"aggregate": "count", "field": "insert", "title": "commits" },
            "x": {
              "field": "time",
              "timeUnit": "yearmonthdate",
              "type": "ordinal",
              "title": "Time"
          },
          }
        
      };
      */
      var vlSpec = {
        "$schema": "https://vega.github.io/schema/vega-lite/v5.json",
        "description": "Punchcard Visualization like on Github. The day on y-axis uses a custom order from Monday to Sunday.  The sort property supports both full day names (e.g., 'Monday') and their three letter initials (e.g., 'mon') -- both of which are case insensitive.",
        "data": { "url": "./out.csv"},
        "mark": "circle",
        "width": "container",
        "encoding": {
          "y": {
            "field": "time",
            "type": "ordinal", 
            "timeUnit": "day",
            "sort": ["mon", "tue", "wed", "thu", "fri", "sat", "sun"]
          },
          "x": {
            "field": "time",
            "timeUnit": "yearmonthdate",
            "type": "ordinal",
            "title": "Month"
        },
          "size": {
            "field": "insert",
            "aggregate": "count",
            "type": "quantitative",
            "legend": {
                "title": null
            }
        }  
        }
      
    };

      // Embed the visualization in the container with id 
      vegaEmbed('#vis', vlSpec);
    </script>
  </body>
</html>`;
//# sourceMappingURL=GitPod.js.map