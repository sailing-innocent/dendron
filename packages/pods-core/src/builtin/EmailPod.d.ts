import { PublishPodConfig, PublishPodPlantOpts, PublishPod } from "../basev3";
import { JSONSchemaType } from "ajv";
type EmailPublishConfig = PublishPodConfig & {
    username: string;
    password: string;
    host: string;
    from: string;
};
export declare class EmailPublishPod extends PublishPod<EmailPublishConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<EmailPublishConfig>;
    plant(opts: PublishPodPlantOpts): Promise<string>;
}
export {};
