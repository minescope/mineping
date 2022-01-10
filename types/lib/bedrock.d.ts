import { PingOptions } from "..";

export type BedrockPingResponse = {
    version: {
        name: string;
        protocol: string;
    };
    players: {
        max: string;
        online: string;
    };
    description: string;
    gamemode: string;
};

/**
 * Asynchronously ping Minecraft Bedrock server.
 * 
 * The optional `options` argument can be an object with a `ping` (default is `19132`) or/and `timeout` (default is `5000`) property.
 * 
 * @param host The Bedrock server address.
 * 
 * ```js
 * import { pingBedrock } from 'mineping';
 * 
 * const data = await pingBedrock('mco.mineplex.com');
 * console.log(data);
 * ```
 * 
 * The resulting output will resemble:
 * ```console
 * {
 *   version: { name: 'Mineplex', protocol: '475' },
 *   players: { max: '5207', online: '5206' },
 *   description: ' New Costumes',
 *   gamemode: 'Survival'
 * }
 * ```
 */
export function pingBedrock(host: string, options?: PingOptions): Promise<BedrockPingResponse>;

