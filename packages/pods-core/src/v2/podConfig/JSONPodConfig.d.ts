import { JSONSchemaType } from "ajv";
import { ExportPodConfigurationV2 } from "./PodV2Types";
/**
 * Complete Pod Config for JSON Export V2
 */
export type JSONV2PodConfig = ExportPodConfigurationV2 & {
    destination: string | "clipboard";
};
/**
 * JSON V2 config that contains just the properties required for JSON
 * export command execution
 */
export type RunnableJSONV2PodConfig = Omit<JSONV2PodConfig, "podId" | "podType" | "description">;
/**
 * Helper function to perform a type check on an object to see if it's an
 * instance of {@link RunnableJSONV2PodConfig}
 * @param object
 * @returns
 */
export declare function isRunnableJSONV2PodConfig(object: any): object is RunnableJSONV2PodConfig;
/**
 *
 * @returns
 * creates an AJV schema for runnable config
 */
export declare function createRunnableJSONV2PodConfigSchema(): JSONSchemaType<RunnableJSONV2PodConfig>;
