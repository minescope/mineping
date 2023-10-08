/**
 * Implementation of the RakNet ping/pong protocol.
 * @see https://wiki.vg/Raknet_Protocol#Unconnected_Ping
 *
 * Data types:
 * @see https://wiki.vg/Raknet_Protocol#Data_types
 */

'use strict';

import dgram from 'dgram';
import ByteBuffer from 'bytebuffer';

const START_TIME = new Date().getTime();

/**
 * Decode Unconnected Ping
 * @param {number} pingId
 * @returns {import('bytebuffer')}
 * @see https://wiki.vg/Raknet_Protocol#Unconnected_Ping
 */
const UNCONNECTED_PING = (pingId) => {
    // 0x01
    const bb = new ByteBuffer();
    bb.buffer[0] = 0x01;
    bb.offset = 1;
    return bb.writeLong(pingId).append('00ffff00fefefefefdfdfdfd12345678', 'hex').writeLong(0).flip().compact();
};

/**
 * Decode Unconnected Pong
 * @param {import('bytebuffer')} buffer
 * @see https://wiki.vg/Raknet_Protocol#Unconnected_Pong
 */
const UNCONNECTED_PONG = (buffer) => {
    // 0x1c
    buffer.offset = 1;
    const pingId = buffer.readLong();
    const serverId = buffer.readLong();
    const offset = buffer.offset += 16;
    const nameLength = buffer.readShort();
    let advertiseStr;

    try {
        advertiseStr = buffer.readUTF8String(nameLength);
    } catch (err) {
        advertiseStr = buffer.readUTF8String(parseInt(err.message.substr(err.message.indexOf(',') + 2, 3)));
    }

    advertiseStr = advertiseStr.split(/;/g);
    const gameId = advertiseStr[0];
    const description = advertiseStr[1];
    const protocolVersion = advertiseStr[2];
    const gameVersion = advertiseStr[3];
    const currentPlayers = advertiseStr[4];
    const maxPlayers = advertiseStr[5];
    const name = advertiseStr[7];
    const mode = advertiseStr[8];

    return {
        pingId,
        advertiseStr,
        serverId,
        offset,
        gameId,
        description,
        protocolVersion,
        gameVersion,
        currentPlayers,
        maxPlayers,
        name,
        mode
    };
};

function ping(host, port = 19132, cb, timeout = 5000) {
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

    const handleError = (err) => {
        closeSocket();

        if (!didFireError) {
            didFireError = true;
            cb(null, err);
        }
    };

    try {
        const ping = UNCONNECTED_PING(new Date().getTime() - START_TIME);
        socket.send(ping.buffer, 0, ping.buffer.length, port, host);
    } catch (err) {
        handleError(err);
    }

    socket.on('message', (msg) => {
        const buffer = new ByteBuffer().append(msg, 'hex').flip();
        const id = buffer.buffer[0];

        switch (id) {
            // https://wiki.vg/Raknet_Protocol#Unconnected_Ping
            case 0x1c: {
                const pong = UNCONNECTED_PONG(buffer);
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

                // Close the socket and clear the timeout task
                // This is a general cleanup for success conditions
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

    socket.on('error', (err) => handleError(err));
}

/**
 * Asynchronously ping Minecraft Bedrock server.
 * 
 * The optional `options` argument can be an object with a `ping` (default is `19132`) or/and `timeout` (default is `5000`) property.
 * 
 * @param {string} host The Bedrock server address.
 * @param {import('../types/index.js').PingOptions} options The configuration for pinging Minecraft Bedrock server.
 * @returns {Promise<import('../types/lib/bedrock.js').BedrockPingResponse>}
 */
export function pingBedrock(host, options = {}) {
    if (!host) throw new Error('Host argument is not provided');

    const { port = 19132, timeout = 5000 } = options;

    return new Promise((resolve, reject) => {
        ping(host, port, (res, err) => {
            err ? reject(err) : resolve(res);
        }, timeout);
    });
}
