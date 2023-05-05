import { JSONSchemaType } from "ajv";
import { ExternalTarget } from "../external-services/ExternalConnectionManager";
import { NotionConnection } from "../external-services/NotionConnection";
import { ExportPodConfigurationV2 } from "./PodV2Types";
/**
 * Complete Pod Config for Notion V2
 */
export type NotionV2PodConfig = ExportPodConfigurationV2 & {
    parentPageId: string;
};
/**
 * This is the persisted version of the config that gets serialized into a YAML
 * file. It must contain a reference to an notion connection ID.
 */
export type PersistedNotionPodConfig = NotionV2PodConfig & Pick<ExternalTarget, "connectionId">;
/**
 * This is the set of parameters required for actual execution of the Pod
 */
export type RunnableNotionV2PodConfig = Pick<NotionV2PodConfig, "parentPageId" | "exportScope"> & Pick<NotionConnection, "apiKey">;
/**
 * Helper function to perform a type check on an object to see if it's an
 * instance of {@link RunnableNotionV2PodConfig}
 * @param object
 * @returns
 */
export declare function isRunnableNotionV2PodConfig(object: any): object is RunnableNotionV2PodConfig;
export declare function createRunnableNotionV2PodConfigSchema(): JSONSchemaType<RunnableNotionV2PodConfig>;
