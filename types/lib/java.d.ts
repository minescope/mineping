/**
 * Asynchronously Pings a Minecraft Java Edition server.
 * This function performs an SRV lookup and then attempts to connect and retrieve the server status.
 * @param {string} host - The server address to ping.
 * @param {JavaPingOptions} [options={}] - Optional configuration.
 * @returns {Promise<JavaPingResponse>} A promise that resolves with the server's status.
 */
export function pingJava(host: string, options?: JavaPingOptions): Promise<JavaPingResponse>;
/**
 * Represents the structured and user-friendly response from a server ping.
 * The fields and their optionality are based on the protocol documentation.
 * See [Status Response Documentation](https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Status_Response) for more details.
 */
export type JavaPingResponse = {
    /**
     * - Contains the server's version name and protocol number.
     */
    version: {
        name: string;
        protocol: number;
    };
    /**
     * - Player count and a sample of online players.
     */
    players?: {
        max: number;
        online: number;
        sample?: Array<{
            name: string;
            id: string;
        }>;
    };
    /**
     * - The server's Message of the Day (MOTD).
     */
    description?: object | string;
    /**
     * - A Base64-encoded 64x64 PNG image data URI.
     */
    favicon?: string;
    /**
     * - True if the server requires clients to have a Mojang-signed public key.
     */
    enforcesSecureChat?: boolean;
    /**
     * - True if a mod is installed to disable chat reporting.
     */
    preventsChatReports?: boolean;
};
export type JavaPingOptions = {
    /**
     * - The fallback port if an SRV record is not found.
     */
    port?: number;
    /**
     * - The connection timeout in milliseconds.
     */
    timeout?: number;
    /**
     * - The protocol version to use in the handshake. `-1` is for auto-detection.
     */
    protocolVersion?: number;
};
