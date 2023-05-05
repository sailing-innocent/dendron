"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingNote = void 0;
const clientUtils_1 = require("../clientUtils");
class MeetingNote {
    constructor(config, ext, noConfirm) {
        this.id = "meetingNote";
        this._noConfirm = false;
        this._config = config;
        this._ext = ext;
        this._noConfirm = noConfirm !== null && noConfirm !== void 0 ? noConfirm : this._noConfirm;
    }
    get OnWillCreate() {
        const promptUserForModification = !this._noConfirm;
        return {
            setNameModifier(_opts) {
                const name = clientUtils_1.DendronClientUtilsV2.getMeetingNoteName();
                return { name, promptUserForModification };
            },
        };
    }
}
exports.MeetingNote = MeetingNote;
//# sourceMappingURL=MeetingNote.js.map