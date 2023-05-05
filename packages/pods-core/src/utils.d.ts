import { RespV3 } from "@dendronhq/common-all";
import { JSONSchemaType } from "ajv";
import { PodClassEntryV4, PodItemV4 } from "./types";
import { docs_v1 as docsV1 } from "googleapis";
export * from "./builtin";
export * from "./types";
export declare const podClassEntryToPodItemV4: (p: PodClassEntryV4) => PodItemV4;
export declare class PodUtils {
    /**
     * @param param0
     * @returns config for v1 pods
     */
    static getConfig({ podsDir, podClass, }: {
        podsDir: string;
        podClass: PodClassEntryV4;
    }): RespV3<any>;
    /**
     * @param param0
     * @returns config path for v1 pods
     */
    static getConfigPath({ podsDir, podClass, }: {
        podsDir: string;
        podClass: PodClassEntryV4;
    }): string;
    static getPath({ podsDir, podClass, }: {
        podsDir: string;
        podClass: PodClassEntryV4;
    }): string;
    static getPodDir(opts: {
        wsRoot: string;
    }): string;
    static createExportConfig(opts: {
        required: string[];
        properties: any;
    }): {
        type: string;
        additionalProperties: boolean;
        required: string[];
        properties: any;
    };
    static createImportConfig(opts: {
        required: string[];
        properties: any;
    }): {
        type: string;
        required: string[];
        properties: any;
        if: {
            properties: {
                concatenate: {
                    const: boolean;
                };
            };
        };
        then: {
            dependencies: {
                concatenate: string[];
            };
        };
    };
    static createPublishConfig(opts: {
        required: string[];
        properties: any;
    }): {
        type: string;
        required: string[];
        properties: any;
    };
    /**
     * Create config file if it doesn't exist
     */
    static genConfigFile({ podsDir, podClass, force, }: {
        podsDir: string;
        podClass: PodClassEntryV4;
        force?: boolean;
    }): string;
    static validate<T>(config: Partial<T>, schema: JSONSchemaType<T>): void;
    static hasRequiredOpts(_pClassEntry: PodClassEntryV4): boolean;
    static getAnalyticsPayload(opts?: {
        config: any;
        podChoice: PodItemV4;
    }): {
        configured: boolean;
        podId?: undefined;
    } | {
        configured: boolean;
        podId: string;
    };
    static readPodConfigFromDisk<T>(podConfigPath: string): RespV3<T>;
    /**
     *
     * helper method to parse doc to md
     */
    static googleDocsToMarkdown: (file: docsV1.Schema$Document, assetDir: string) => string;
    /**
     * styles the element: heading, bold and italics
     */
    static styleElement: (element: docsV1.Schema$ParagraphElement, styleType?: string) => string | undefined;
    static content: (element: docsV1.Schema$ParagraphElement) => string | undefined;
    /**
     * downloads the image from cdn url and stores them in the assets directory inside vault
     */
    static downloadImage: (imageUrl: string | undefined, assetDir: string, text: string) => string;
    static refreshGoogleAccessToken(refreshToken: string, port: number, connectionId?: string): Promise<string>;
    /**
     * @param opts
     * @returns custom config file path for pods v2
     */
    static getCustomConfigPath: (opts: {
        wsRoot: string;
        podId: string;
    }) => string;
    /**
     * @param opts
     * @returns service config file path for pods v2
     */
    static getServiceConfigPath: (opts: {
        wsRoot: string;
        connectionId: string;
    }) => string;
}
