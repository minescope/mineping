export { pingJava } from "./lib/java.js";
export { pingBedrock } from "./lib/bedrock.js";

/**
 * @param port The server port.
 * @param timeout The read/write socket timeout.
 */
export type PingOptions = {
    port: number,
    timeout: number;
};