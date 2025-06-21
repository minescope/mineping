/**
 * Asynchronously pings a Minecraft Bedrock server.
 * @param {string} host - The IP address or hostname of the server.
 * @param {BedrockPingOptions} [options={}] - Optional configuration.
 * @returns {Promise<BedrockPingResponse>} A promise that resolves with the server's parsed MOTD.
 */
export function pingBedrock(host: string, options?: BedrockPingOptions): Promise<BedrockPingResponse>;
/**
 * Representation of raw, semicolon-delimited MOTD string.
 * This struct directly mirrors the fields and order from the server response.
 * See [`Unconnected Pong Documentation`](https://minecraft.wiki/w/RakNet#Unconnected_Pong) for more details.
 */
export type BedrockMotd = {
    /**
     * - The edition of the server (MCPE or MCEE).
     */
    edition: string;
    /**
     * - The primary name of the server (first line of MOTD).
     */
    name: string;
    /**
     * - The protocol version.
     */
    protocol: number;
    /**
     * - The game version (e.g., "1.21.2").
     */
    version: string;
    /**
     * - The current number of players online.
     */
    playerCount: number;
    /**
     * - The maximum number of players allowed.
     */
    playerMax: number;
    /**
     * - The server's GUID.
     */
    serverGuid: bigint;
    /**
     * - The secondary name of the server (second line of MOTD).
     */
    subName: string;
    /**
     * - The default gamemode (e.g., "Survival").
     */
    gamemode: string;
    /**
     * - Whether the server is Nintendo limited.
     */
    nintendoLimited?: boolean;
    /**
     * - The server's IPv4 port, if provided.
     */
    port?: number;
    /**
     * - The server's IPv6 port, if provided.
     */
    ipv6Port?: number;
    /**
     * - Whether the server is in editor mode, if provided. See [Minecraft Editor Mode Documentation](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockeditor/editoroverview?view=minecraft-bedrock-stable) for more details.
     */
    editorMode?: boolean;
};
/**
 * Represents the structured and user-friendly response from a server ping.
 * This is the public-facing object that users of the library will receive.
 */
export type BedrockPingResponse = {
    /**
     * - The edition of the server (MCPE or MCEE).
     */
    edition: string;
    /**
     * - The primary name of the server (first line of MOTD).
     */
    name: string;
    /**
     * - The name of the world or level being hosted.
     */
    levelName: string;
    /**
     * - The default gamemode of the server.
     */
    gamemode: string;
    /**
     * - Game and protocol versions.
     */
    version: {
        protocol: number;
        minecraft: string;
    };
    /**
     * - Current and maximum player counts.
     */
    players: {
        online: number;
        max: number;
    };
    /**
     * - Announced IPv4 and IPv6 ports.
     */
    port: {
        v4?: number;
        v6?: number;
    };
    /**
     * - The server's unique 64-bit GUID.
     */
    guid: bigint;
    /**
     * - True if the server restricts Nintendo Switch players.
     */
    isNintendoLimited?: boolean;
    /**
     * - True if the server is in editor mode. See [Minecraft Editor Mode Documentation](https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockeditor/editoroverview?view=minecraft-bedrock-stable) for more details.
     */
    isEditorModeEnabled?: boolean;
};
export type BedrockPingOptions = {
    /**
     * - The server port to ping.
     */
    port?: number;
    /**
     * - The timeout in milliseconds for the request.
     */
    timeout?: number;
};
