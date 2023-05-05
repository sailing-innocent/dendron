import { JSONSchemaType } from "ajv";
import { ExportPodConfigurationV2 } from "./PodV2Types";
/**
 * Complete Pod Config for Markdown Export V2
 */
export type MarkdownV2PodConfig = ExportPodConfigurationV2 & {
    wikiLinkToURL?: boolean;
    convertTagNotesToLinks?: boolean;
    convertUserNotesToLinks?: boolean;
    addFrontmatterTitle?: boolean;
    destination: string | "clipboard";
};
/**
 * Markdown V2 config that contains just the properties required for markdown
 * export command execution
 */
export type RunnableMarkdownV2PodConfig = Omit<MarkdownV2PodConfig, "podId" | "podType">;
/**
 * Helper function to perform a type check on an object to see if it's an
 * instance of {@link RunnableMarkdownV2PodConfig}
 * @param object
 * @returns
 */
export declare function isRunnableMarkdownV2PodConfig(object: any): object is RunnableMarkdownV2PodConfig;
/**
 *
 * @returns
 * creates an AJV schema for runnable config
 */
export declare function createRunnableMarkdownV2PodConfigSchema(): JSONSchemaType<RunnableMarkdownV2PodConfig>;
