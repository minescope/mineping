/**
 * Implementation of the RakNet ping/pong protocol.
 * @see https://wiki.vg/Raknet_Protocol#Unconnected_Ping
 *
 * Data types:
 * @see https://wiki.vg/Raknet_Protocol#Data_types
 */

'use strict';

import dgram from 'dgram';

const START_TIME = new Date().getTime();

/**
 * Reads a BigInt value from the buffer at the specified offset using big-endian byte order.
 * @param {Buffer} buffer - The buffer to read from.
 * @param {number} offset - The offset in the buffer to read the value.
 * @returns {BigInt} - The read BigInt value.
 */
const readBigInt64BE = (buffer, offset) => {
    return buffer.readBigInt64BE(offset);
};

/**
 * Reads a string from the buffer at the specified offset.
 * @param {Buffer} buffer - The buffer to read from.
 * @param {number} offset - The offset in the buffer to read the string.
 * @returns {string} - The read string.
 */
const readStringFromBuffer = (buffer, offset) => {
    const length = buffer.readUInt16BE(offset);
    return buffer.toString('utf8', offset + 2, offset + 2 + length);
};

/**
 * Parses the advertise string into an object with properties.
 * @param {string} advertiseStr - The advertise string to parse.
 * @returns {Object} - The parsed object with properties.
 */
const parseAdvertiseString = (advertiseStr) => {
    const parts = advertiseStr.split(';');
    return {
        gameId: parts[0],
        description: parts[1],
        protocolVersion: parts[2],
        gameVersion: parts[3],
        currentPlayers: parts[4],
        maxPlayers: parts[5],
        name: parts[7],
        mode: parts[8]
    };
};

/**
 * Creates an Unconnected Ping buffer.
 * @param {number} pingId - The ping ID.
 * @returns {Buffer} - The Unconnected Ping buffer.
 * @see {@link https://wiki.vg/Raknet_Protocol#Unconnected_Ping}
 */
const UNCONNECTED_PING = (pingId) => {
    const buffer = Buffer.alloc(33);
    buffer.writeUInt8(0x01, 0);
    buffer.writeBigInt64LE(BigInt(pingId), 1);
    Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex").copy(buffer, 9);
    buffer.writeBigInt64LE(BigInt(0), 25);
    return buffer;
};

/**
 * Decodes an Unconnected Pong buffer and returns the parsed data.
 * @param {Buffer} buffer - The Unconnected Pong buffer.
 * @returns {Object} - The parsed Unconnected Pong data.
 * @see {@link https://wiki.vg/Raknet_Protocol#Unconnected_Pong}
 */
const UNCONNECTED_PONG = (buffer) => {
    const pingId = readBigInt64BE(buffer, 1);
    const serverId = readBigInt64BE(buffer, 9);
    let offset = 25;
    let advertiseStr;

    try {
        advertiseStr = readStringFromBuffer(buffer, offset);
    } catch (err) {
        const length = parseInt(err.message.substr(err.message.indexOf(',') + 2, 3));
        advertiseStr = buffer.toString('utf8', offset, offset + length);
    }

    const parsedAdvertiseStr = parseAdvertiseString(advertiseStr);

    return { pingId, advertiseStr, serverId, offset, ...parsedAdvertiseStr };
};

/**
 * Sends a ping request to the specified host and port.
 * @param {string} host - The IP address or hostname of the server.
 * @param {number} [port=19132] - The port number.
 * @param {function} cb - The callback function to handle the response.
 * @param {number} [timeout=5000] - The timeout duration in milliseconds.
 */
const ping = (host, port = 19132, cb, timeout = 5000) => {
    const socket = dgram.createSocket('udp4');

    // Set manual timeout interval.
    // This ensures the connection will NEVER hang regardless of internal state
    const timeoutTask = setTimeout(() => {
        socket.emit('error', new Error('Socket timeout'));
    }, timeout);

    const closeSocket = () => {
        socket.close();
        clearTimeout(timeoutTask);
    };

    // Generic error handler
    // This protects multiple error callbacks given the complex socket state
    // This is mostly dangerous since it can swallow errors
    let didFireError = false;

    /**
     * Handle any error that occurs during the ping process.
     * @param {Error} err The error that occurred.
     */
    const handleError = (err) => {
        closeSocket();

        if (!didFireError) {
            didFireError = true;
            cb(null, err);
        }
    };

    try {
        const ping = UNCONNECTED_PING(new Date().getTime() - START_TIME);
        socket.send(ping, 0, ping.length, port, host);
    } catch (err) {
        handleError(err);
    }

    socket.on('message', (msg) => {
        const id = msg[0];

        switch (id) {
            case 0x1c: {
                const pong = UNCONNECTED_PONG(msg);
                const clientData = {
                    version: {
                        name: pong.name,
                        protocol: pong.protocolVersion
                    },
                    players: {
                        max: pong.maxPlayers,
                        online: pong.currentPlayers
                    },
                    description: pong.description.replace(/\xA7[0-9A-FK-OR]/ig, ''),
                    gamemode: pong.mode
                };

                closeSocket();
                cb(clientData, null);
                break;
            }

            default: {
                handleError(new Error('Received unexpected packet'));
                break;
            }
        }
    });

    socket.on('error', handleError);
};

/**
 * Asynchronously ping Minecraft Bedrock server.
 * The optional `options` argument can be an object with a `ping` (default is `19132`) or/and `timeout` (default is `5000`) property.
 * @param {string} host The Bedrock server address.
 * @param {import('../types/index.js').PingOptions} options The configuration for pinging Minecraft Bedrock server.
 * @returns {Promise<import('../types/index.js').BedrockPingResponse>}
 */
export const pingBedrock = (host, options = {}) => {
    if (!host) throw new Error('Host argument is not provided');

    const { port = 19132, timeout = 5000 } = options;

    return new Promise((resolve, reject) => {
        ping(host, port, (res, err) => {
            err ? reject(err) : resolve(res);
        }, timeout);
    });
};
