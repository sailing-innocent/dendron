import { JSONSchemaType } from "ajv";
import { PublishPod, PublishPodConfig, PublishPodPlantOpts } from "../basev3";
export type HTMLPublishPodConfig = PublishPodConfig & {
    /**
     * check for parsing links(wikilinks and backlinks). Used by gdoc export pod to avoid parsing wikilinks as href.
     */
    convertLinks?: boolean;
    convertTagNotesToLinks?: boolean;
    convertUserNotesToLinks?: boolean;
    enablePrettyRefs?: boolean;
};
export declare class HTMLPublishPod extends PublishPod<HTMLPublishPodConfig> {
    static id: string;
    static description: string;
    get config(): JSONSchemaType<HTMLPublishPodConfig>;
    plant(opts: PublishPodPlantOpts): Promise<any>;
}
