"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GithubIssuePublishPod = exports.GITHUBMESSAGE = exports.GithubIssueImportPod = void 0;
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const graphql_1 = require("@octokit/graphql");
const lodash_1 = __importDefault(require("lodash"));
const common_all_1 = require("@dendronhq/common-all");
const ID = "dendron.githubissue";
class GithubIssueImportPod extends basev3_1.ImportPod {
    constructor() {
        super(...arguments);
        /**
         * method to fetch issues from github graphql api
         */
        this.getDataFromGithub = async (opts) => {
            let result;
            const { owner, repository, status, created, afterCursor, token } = opts;
            const queryVal = `repo:${owner}/${repository} is:issue is:${status} ${created}`;
            const query = `query search($val: String!, $after: String)
    {search(type: ISSUE, first: 100, query: $val, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
        edges {
          node {
            ... on Issue {
              id
              title
              url
              number
              state
              author {
                url
              }
              labels(first:5) {
                edges {
                  node {
                    name
                  }
                }
              }
              body
            }
          }
        }
      }
    }`;
            try {
                result = await (0, graphql_1.graphql)(query, {
                    headers: { authorization: `token ${token}` },
                    val: queryVal,
                    after: afterCursor,
                });
            }
            catch (error) {
                this.L.error({
                    msg: "failed to import all the issues",
                    payload: (0, common_all_1.stringifyError)(error),
                });
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
            return result;
        };
        /**
         * method to add fromtmatter to notes: url, status and tags
         */
        this.addFrontMatterToData = (data, fname, config) => {
            const slugger = (0, common_all_1.getSlugger)();
            return data.map((d) => {
                var _a;
                const labels = d.node.labels.edges;
                let tags;
                if (labels.length > 0) {
                    tags = labels.map((label) => label.node.name);
                }
                d.node.title = slugger.slug(d.node.title.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, // eslint-disable-line
                ""));
                d.node = {
                    body: d.node.body,
                    fname: `${fname}.${d.node.number}-${d.node.title}`,
                    custom: {
                        ...config.frontmatter,
                        url: d.node.url,
                        status: d.node.state,
                        issueID: d.node.id,
                        // can be null if user deleted their github account
                        author: (_a = d.node.author) === null || _a === void 0 ? void 0 : _a.url,
                    },
                    tags,
                };
            });
        };
    }
    get config() {
        return utils_1.PodUtils.createImportConfig({
            required: ["repository", "owner", "status", "token", "fname"],
            properties: {
                owner: {
                    type: "string",
                    description: "owner of the repository",
                },
                repository: {
                    description: "github repository to import from",
                    type: "string",
                },
                status: {
                    type: "string",
                    description: "status of issue open/closed",
                    enum: ["open", "closed"],
                },
                endDate: {
                    type: "string",
                    description: "import issues created before this date: YYYY-MM-DD",
                    format: "date",
                    default: common_all_1.Time.now().toISODate(),
                    nullable: true,
                },
                startDate: {
                    type: "string",
                    description: "import issues created after this date: YYYY-MM-DD",
                    format: "date",
                    nullable: true,
                },
                token: {
                    type: "string",
                    description: "github personal access token",
                },
                fname: {
                    type: "string",
                    description: "name of hierarchy to import into",
                },
            },
        });
    }
    async _issues2Notes(entries, opts) {
        const { vault } = opts;
        const notes = lodash_1.default.map(entries, (ent) => {
            if (!ent.node.fname) {
                throw Error("fname not defined");
            }
            const fname = ent.node.fname;
            if (opts.fnameAsId) {
                ent.node.id = ent.node.fname;
            }
            return common_all_1.NoteUtils.create({ ...ent.node, fname, vault });
        });
        if (opts.concatenate) {
            if (!opts.destName) {
                throw Error("destname needs to be specified if concatenate is set to true");
            }
            const acc = [""];
            lodash_1.default.forEach(notes, (n) => {
                acc.push(`# [[${n.fname}]]`);
                acc.push(n.body);
                acc.push("---");
            });
            return [
                common_all_1.NoteUtils.create({
                    fname: opts.destName,
                    body: acc.join("\n"),
                    vault,
                }),
            ];
        }
        else {
            return notes;
        }
    }
    /**
     * method to get notes that are not already present in the vault
     */
    async getNewNotes(notes, engine, vault) {
        const engineNotes = await Promise.all(notes.map(async (note) => {
            return (await engine.findNotesMeta({ fname: note.fname, vault }))[0];
        }));
        const engineSet = new Set(engineNotes);
        return notes.filter((note) => !engineSet.has(note));
    }
    /**
     * method to update the notes whose status has changed
     */
    async getUpdatedNotes(notes, engine, vault) {
        let updatedNotes = [];
        (0, common_all_1.asyncLoopOneAtATime)(notes, async (note) => {
            const n = (await engine.findNotes({ fname: note.fname, vault }))[0];
            if (!lodash_1.default.isUndefined(n) &&
                (n.custom.issueID === undefined ||
                    n.custom.status !== note.custom.status)) {
                n.custom.status = note.custom.status;
                n.custom.issueID = note.custom.issueID;
                updatedNotes = [...updatedNotes, n];
                await engine.writeNote(n);
            }
        });
        return updatedNotes;
    }
    async plant(opts) {
        const ctx = "GithubIssuePod";
        const { wsRoot, engine, vault, config } = opts;
        this.L.info({ ctx, msg: "enter", wsRoot });
        const { owner, repository, status, endDate = common_all_1.Time.now().toISODate(), startDate, token, destName, concatenate, fname, fnameAsId, } = config;
        let hasNextPage = true;
        let afterCursor = null;
        let created;
        let data = [];
        if (!lodash_1.default.isUndefined(startDate)) {
            created = `created:${startDate}..${endDate}`;
        }
        else {
            created = `created:<${endDate}`;
        }
        while (hasNextPage) {
            // eslint-disable-next-line no-await-in-loop
            const result = await this.getDataFromGithub({
                owner,
                repository,
                status,
                created,
                afterCursor,
                token,
            });
            data = [...data, ...result.search.edges];
            hasNextPage = result.search.pageInfo.hasNextPage;
            afterCursor = result.search.pageInfo.endCursor;
        }
        if (data.length === 0) {
            throw new common_all_1.DendronError({
                message: "No issues present for this filter. Change the config values and try again",
            });
        }
        this.addFrontMatterToData(data, fname, config);
        const notes = await this._issues2Notes(data, {
            vault,
            destName,
            concatenate,
            fnameAsId,
        });
        const newNotes = await this.getNewNotes(notes, engine, vault);
        const updatedNotes = await this.getUpdatedNotes(notes, engine, vault);
        await engine.bulkWriteNotes({ notes: newNotes, skipMetadata: true });
        return { importedNotes: [...newNotes, ...updatedNotes] };
    }
}
GithubIssueImportPod.id = ID;
GithubIssueImportPod.description = "import github issues";
exports.GithubIssueImportPod = GithubIssueImportPod;
var GITHUBMESSAGE;
(function (GITHUBMESSAGE) {
    GITHUBMESSAGE["INVALID_TAG"] = "Github: The labels in the tag does not belong to selected repository";
    GITHUBMESSAGE["INVALID_CATEGORY"] = "Github: Invalid category";
    GITHUBMESSAGE["INVALID_MILESTONE"] = "Github: Invalid milestone";
    GITHUBMESSAGE["ISSUE_CREATED"] = "Github: Issue Created";
    GITHUBMESSAGE["ISSUE_UPDATED"] = "Github: Issue Updated";
    GITHUBMESSAGE["DISCUSSION_CREATED"] = "Github: Discussion Created";
    GITHUBMESSAGE["INVALID_ASSIGNEE"] = "Github: Invalid assignee username";
})(GITHUBMESSAGE = exports.GITHUBMESSAGE || (exports.GITHUBMESSAGE = {}));
class GithubIssuePublishPod extends basev3_1.PublishPod {
    constructor() {
        super(...arguments);
        /**
         * method to get data of a repository from github.
         *
         */
        this.getDataFromGithub = async (opts) => {
            const { owner, repository, token } = opts;
            let labelsHashMap = {};
            let assigneesHashMap = {};
            let discussionCategoriesHashMap = {};
            let milestonesHashMap = {};
            let githubDataHashMap;
            const query = `query repository($name: String!, $owner: String!)
    {
      repository(owner: $owner , name: $name) { 
        id
        labels(last: 100) {
          edges{
            node {
              id
              name
            }
          }
        }
        assignableUsers(first: 100){
          edges {
            node {
              id,
              login
            }
          }
        }
        discussionCategories(last:10){
          edges{
            node {
              id
              name
            }
          }
        }
        milestones(first: 100,
          orderBy: {field: CREATED_AT, direction: DESC},
          ){
           edges {
             node {
               id,
               title
              }
            }
          }
    }
    }`;
            try {
                const result = await (0, graphql_1.graphql)(query, {
                    headers: { authorization: `token ${token}` },
                    owner,
                    name: repository,
                });
                const repositoryId = result.repository.id;
                const allLabels = result.repository.labels.edges;
                allLabels.forEach((label) => {
                    labelsHashMap = {
                        ...labelsHashMap,
                        [label.node.name]: label.node.id,
                    };
                });
                const assignees = result.repository.assignableUsers.edges;
                assignees.forEach((assignee) => {
                    assigneesHashMap = {
                        ...assigneesHashMap,
                        [assignee.node.login]: assignee.node.id,
                    };
                });
                const allCategories = result.repository.discussionCategories.edges;
                allCategories.forEach((category) => {
                    discussionCategoriesHashMap = {
                        ...discussionCategoriesHashMap,
                        [category.node.name]: category.node.id,
                    };
                });
                const allMilestones = result.repository.milestones.edges;
                allMilestones.forEach((milestone) => {
                    milestonesHashMap = {
                        ...milestonesHashMap,
                        [milestone.node.title]: milestone.node.id,
                    };
                });
                githubDataHashMap = {
                    repositoryId,
                    labelsHashMap,
                    assigneesHashMap,
                    discussionCategoriesHashMap,
                    milestonesHashMap,
                };
            }
            catch (error) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
            return githubDataHashMap;
        };
        /**
         * method to update the milestone and assignee of issue in github
         */
        this.updateMilestoneAndAssignee = async (opts) => {
            const { issueID, token, milestoneId, assigneeIds } = opts;
            const assigneesSize = assigneeIds.length;
            const mutation = `mutation updateIssue($id: ID!, ${milestoneId ? `$milestoneId: ID` : ""}, ${assigneesSize > 0 ? `$assigneeIds: [ID!]` : ""}){
      updateIssue(input: {id : $id , ${milestoneId ? `milestoneId: $milestoneId` : ""}, ${assigneesSize > 0 ? `assigneeIds: $assigneeIds` : ""}}){
        issue {
              id
            }
        }
      }`;
            try {
                await (0, graphql_1.graphql)(mutation, {
                    headers: { authorization: `token ${token}` },
                    id: issueID,
                    milestoneId,
                    assigneeIds,
                });
            }
            catch (error) {
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
        };
        /**
         * method to update the issue in github
         * Only users with push access can set labels, assignees and milestone for issues. Otherwise dropped silently.
         */
        this.updateIssue = async (opts) => {
            const { issueID, token, status, labelIDs, milestoneId, showMessage, assigneeIds, } = opts;
            if (milestoneId || assigneeIds.length > 0) {
                /**
                 * While regression it was observed that milestone and assignee is not updated if the issue
                 * state remains same, hence creating a new method to update
                 */
                this.updateMilestoneAndAssignee({
                    issueID,
                    token,
                    milestoneId,
                    assigneeIds,
                });
            }
            let resp = "";
            const mutation = `mutation updateIssue($id: ID!, $state: IssueState, $labelIDs: [ID!]){
          updateIssue(input: {id : $id , state: $state, labelIds: $labelIDs}){
            issue {
                  id
                  url
                }
            }
          }`;
            try {
                const result = await (0, graphql_1.graphql)(mutation, {
                    headers: { authorization: `token ${token}` },
                    id: issueID,
                    state: status,
                    labelIDs,
                });
                if (!lodash_1.default.isUndefined(result.updateIssue.issue.id)) {
                    showMessage.info(GITHUBMESSAGE.ISSUE_UPDATED);
                    resp = result.updateIssue.issue.url;
                }
            }
            catch (error) {
                resp = (0, common_all_1.stringifyError)(error);
                throw new common_all_1.DendronError({ message: (0, common_all_1.stringifyError)(error) });
            }
            return resp;
        };
        /**
         * method to create an issue in github
         * Only users with push access can set labels, milestone and assignees for new issues. Labels, Assignees and Milestone are not dropped silently in Graphql createIssue.
         */
        this.createIssue = async (opts) => {
            const { token, labelIDs, note, engine, milestoneId, showMessage, assigneeIds, repositoryId, } = opts;
            const { title, body } = note;
            let resp = "";
            const labelSize = labelIDs.length;
            const assigneesSize = assigneeIds.length;
            const mutation = `mutation createIssue($repositoryId: ID!, $title: String!, $body: String, ${labelSize > 0 ? `$labelIDs: [ID!]` : ""}, ${milestoneId ? `$milestoneId: ID` : ""}, ${assigneesSize > 0 ? `$assigneeIds: [ID!]` : ""} ){
      createIssue(input: {repositoryId : $repositoryId , title: $title, body: $body, ${labelSize > 0 ? `labelIds: $labelIDs` : ""}, ${milestoneId ? `milestoneId: $milestoneId` : ""}, ${assigneesSize > 0 ? `assigneeIds: $assigneeIds` : ""}}){
                issue {
                      id
                      url
                      state
                    }
                }
              }`;
            try {
                const result = await (0, graphql_1.graphql)(mutation, {
                    headers: { authorization: `token ${token}` },
                    repositoryId,
                    title,
                    body,
                    labelIDs,
                    milestoneId,
                    assigneeIds,
                });
                const issue = result.createIssue.issue;
                if (!lodash_1.default.isUndefined(result.createIssue.issue.id)) {
                    note.custom.issueID = issue.id;
                    note.custom.url = issue.url;
                    note.custom.status = issue.state;
                    await engine.writeNote(note);
                    showMessage.info(GITHUBMESSAGE.ISSUE_CREATED);
                    resp = issue.url;
                }
            }
            catch (error) {
                resp = (0, common_all_1.stringifyError)(error);
                throw new common_all_1.DendronError({
                    message: (0, common_all_1.stringifyError)(error),
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                });
            }
            return resp;
        };
        /**
         * method to create a discussion in github
         */
        this.createDiscussion = async (opts) => {
            const { token, note, engine, categoryId, includeNoteBodyInDiscussion, showMessage, repositoryId, } = opts;
            const { title } = note;
            let { body } = note;
            if (!includeNoteBodyInDiscussion || !body.trim()) {
                body = `Discussion for ${title}`;
            }
            let resp = "";
            const mutation = `mutation createDiscussion($repositoryId: ID!, $title: String!, $body: String, $categoryId: ID! ){
        createDiscussion(input: {repositoryId : $repositoryId , title: $title, body: $body, categoryId: $categoryId})
		      {
            discussion 
              {
                id
                url
                author 
                  {
                    url
                  }
		         }
            }
          }`;
            try {
                const result = await (0, graphql_1.graphql)(mutation, {
                    headers: { authorization: `token ${token}` },
                    repositoryId,
                    title,
                    body,
                    categoryId,
                });
                const discussion = result.createDiscussion.discussion;
                if (!lodash_1.default.isUndefined(discussion.url)) {
                    note.custom.discussionID = discussion.id;
                    note.custom.url = discussion.url;
                    note.custom.author = discussion.author.url;
                    await engine.writeNote(note);
                    showMessage.info(GITHUBMESSAGE.DISCUSSION_CREATED);
                    resp = discussion.url;
                }
            }
            catch (error) {
                resp = (0, common_all_1.stringifyError)(error);
                throw new common_all_1.DendronError({
                    message: (0, common_all_1.stringifyError)(error),
                    severity: common_all_1.ERROR_SEVERITY.MINOR,
                });
            }
            return resp;
        };
    }
    get config() {
        return utils_1.PodUtils.createPublishConfig({
            required: ["token", "owner", "repository"],
            properties: {
                owner: {
                    type: "string",
                    description: "owner of the repository",
                },
                repository: {
                    description: "github repository to import from",
                    type: "string",
                },
                token: {
                    type: "string",
                    description: "github personal access token",
                },
                includeNoteBodyInDiscussion: {
                    type: "boolean",
                    description: "if set to false, starts a discussion without the contents of note body",
                    default: true,
                },
                aliasMapping: {
                    type: "object",
                    nullable: true,
                    description: "mapping of issue FM fields with the task note",
                },
            },
        });
    }
    async plant(opts) {
        var _a;
        const { config, engine, utilityMethods } = opts;
        const { owner, repository, token, includeNoteBodyInDiscussion = true, aliasMapping, } = config;
        const { showMessage } = utilityMethods;
        let milestoneId;
        const note = opts.note;
        const tags = opts.note.tags;
        if (lodash_1.default.isUndefined(note.custom)) {
            note.custom = {};
        }
        const { issueID, milestone, category } = note.custom;
        let { assignees, status } = note.custom;
        //if assignees field not present in FM, check for its alias
        assignees =
            assignees !== null && assignees !== void 0 ? assignees : lodash_1.default.get(note.custom, `${(_a = aliasMapping === null || aliasMapping === void 0 ? void 0 : aliasMapping.assignees) === null || _a === void 0 ? void 0 : _a.alias}`);
        const assigneesVal = aliasMapping === null || aliasMapping === void 0 ? void 0 : aliasMapping.assignees.value;
        // checks for aliasMapping of values if username in github and task note is different
        if (assigneesVal && assigneesVal[assignees]) {
            assignees = assigneesVal[assignees];
        }
        const statusValue = aliasMapping === null || aliasMapping === void 0 ? void 0 : aliasMapping.status.value;
        if (status && statusValue && statusValue[status]) {
            status = statusValue[status];
        }
        const githubDataHashMap = await this.getDataFromGithub({
            owner,
            repository,
            token,
        });
        const { repositoryId, discussionCategoriesHashMap, labelsHashMap, milestonesHashMap, assigneesHashMap, } = githubDataHashMap;
        if (!lodash_1.default.isUndefined(category)) {
            const categoryId = discussionCategoriesHashMap[category];
            if (lodash_1.default.isUndefined(categoryId)) {
                showMessage.warning(GITHUBMESSAGE.INVALID_CATEGORY);
                return "";
            }
            const resp = await this.createDiscussion({
                token,
                note,
                engine,
                categoryId,
                includeNoteBodyInDiscussion,
                showMessage,
                repositoryId,
            });
            return resp;
        }
        if (!lodash_1.default.isUndefined(milestone)) {
            milestoneId = milestonesHashMap[milestone];
            if (lodash_1.default.isUndefined(milestoneId)) {
                showMessage.warning(GITHUBMESSAGE.INVALID_MILESTONE);
                return "";
            }
        }
        const assigneeIds = [];
        if (!lodash_1.default.isUndefined(assignees)) {
            if (lodash_1.default.isString(assignees)) {
                if (assigneesHashMap[assignees])
                    assigneeIds.push(assigneesHashMap[assignees]);
            }
            else {
                assignees === null || assignees === void 0 ? void 0 : assignees.forEach((assignee) => {
                    const id = assigneesHashMap[assignee];
                    if (id)
                        assigneeIds.push(id);
                });
            }
        }
        if (!lodash_1.default.isUndefined(assignees) && assigneeIds.length === 0) {
            showMessage.warning(GITHUBMESSAGE.INVALID_ASSIGNEE);
            return "";
        }
        const labelIDs = [];
        if (!lodash_1.default.isUndefined(tags)) {
            if (lodash_1.default.isString(tags)) {
                if (labelsHashMap[tags])
                    labelIDs.push(labelsHashMap[tags]);
            }
            else {
                tags === null || tags === void 0 ? void 0 : tags.forEach((tag) => {
                    if (labelsHashMap[tag])
                        labelIDs.push(labelsHashMap[tag]);
                });
            }
        }
        if (!lodash_1.default.isUndefined(tags) && labelIDs.length === 0) {
            showMessage.warning(GITHUBMESSAGE.INVALID_TAG);
            return "";
        }
        const resp = lodash_1.default.isUndefined(issueID) && lodash_1.default.isUndefined(status)
            ? await this.createIssue({
                token,
                labelIDs,
                note,
                engine,
                milestoneId,
                showMessage,
                assigneeIds,
                repositoryId,
            })
            : await this.updateIssue({
                issueID,
                token,
                status: status.toUpperCase(),
                labelIDs,
                milestoneId,
                showMessage,
                assigneeIds,
            });
        return resp;
    }
}
GithubIssuePublishPod.id = ID;
GithubIssuePublishPod.description = "publish github issues";
exports.GithubIssuePublishPod = GithubIssuePublishPod;
//# sourceMappingURL=GithubIssuePod.js.map