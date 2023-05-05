"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailPublishPod = void 0;
const emailjs_1 = require("emailjs");
const lodash_1 = __importDefault(require("lodash"));
const basev3_1 = require("../basev3");
const utils_1 = require("../utils");
const ID = "dendron.email";
class EmailPublishPod extends basev3_1.PublishPod {
    get config() {
        return utils_1.PodUtils.createPublishConfig({
            required: [],
            properties: {
                from: {
                    description: "from address",
                    type: "string",
                    example: "you <username@outlook.com>",
                },
                to: {
                    description: "to address",
                    type: "string",
                    example: "someone <someone@your-email.com>, another <another@your-email.com>",
                },
                user: {
                    description: "username",
                    type: "string",
                    example: "hello@dendron.so",
                },
                password: {
                    description: "password",
                    type: "string",
                    example: "secret123",
                },
                host: {
                    description: "host",
                    type: "string",
                    default: "smtp.gmail.com",
                },
                subject: {
                    description: "subject",
                    type: "string",
                },
            },
        });
    }
    async plant(opts) {
        const { note, config } = opts;
        const { user, password, host, from, to, subject } = lodash_1.default.defaults(lodash_1.default.get(note.custom, "email", {}), config);
        const text = note.body;
        console.log("bond");
        console.log(user, password, host);
        const client = new emailjs_1.SMTPClient({
            user,
            password,
            host,
            ssl: true,
            tls: true,
        });
        const message = new emailjs_1.Message({
            text,
            from,
            to,
            subject,
        });
        // send the message and get a callback with an error or details of the message that was sent
        await client.sendAsync(message);
        return "";
    }
}
EmailPublishPod.id = ID;
EmailPublishPod.description = "publish to email";
exports.EmailPublishPod = EmailPublishPod;
//# sourceMappingURL=EmailPod.js.map