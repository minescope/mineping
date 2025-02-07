/**
 * @param port The server port (1-65535).
 * @param timeout The read/write socket timeout in milliseconds.
 */
export type BedrockPingOptions = {
	port?: number & { _brand: "Port" }; // 1-65535
	timeout?: number & { _brand: "Timeout" }; // > 0
};

export type BedrockPingResponse = {
	edition: string;
	name: string;
	version: {
		protocolVersion: number;
		minecraftVersion: string;
	};
	players: {
		online: number;
		max: number;
	};
	serverId: string;
	mapName: string;
	gameMode: string;
};

/**
 * Asynchronously ping Minecraft Bedrock server.
 *
 * @param host The Bedrock server address.
 * @param options The configuration for pinging Minecraft Bedrock server.
 *
 * ```js
 * import { pingBedrock } from '@minescope/mineping';
 *
 * const data = await pingBedrock('mco.mineplex.com');
 * console.log(data);
 * ```
 *
 * The resulting output will resemble:
 * ```console
 * {
 *   edition: "MCPE",
 *   name: "Mineplex",
 *   version: {
 *     protocolVersion: 475,
 *     minecraftVersion: "1.18.0"
 *   },
 *   players: {
 *     online: 5206,
 *     max: 5207
 *   },
 *   serverId: "12345678",
 *   mapName: "Lobby",
 *   gameMode: "Survival"
 * }
 * ```
 */
export function pingBedrock(
	host: string,
	options?: BedrockPingOptions
): Promise<BedrockPingResponse>;
