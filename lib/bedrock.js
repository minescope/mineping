/**
 * Implementation of the RakNet ping/pong protocol.
 * @see https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Raknet_Protocol
 */

"use strict";

import dgram from "node:dgram";
import crypto from "node:crypto";

const MAGIC = "00ffff00fefefefefdfdfdfd12345678";
const START_TIME = new Date().getTime();
const UNCONNECTED_PONG = 0x1c;

/**
 * Creates an Unconnected Ping packet.
 * @param {number} pingId
 * @returns {Buffer}
 * @see {@link https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Raknet_Protocol#Unconnected_Ping}
 */
const createUnconnectedPingFrame = (timestamp) => {
	const buffer = Buffer.alloc(33);
	buffer.writeUInt8(0x01, 0); // Packet ID
	buffer.writeBigInt64LE(BigInt(timestamp), 1); // Timestamp
	Buffer.from(MAGIC, "hex").copy(buffer, 9); // OFFLINE_MESSAGE_DATA_ID (Magic)
	Buffer.from(crypto.randomBytes(8)).copy(buffer, 25); // Client GUID
	return buffer;
};

/**
 * Extract Modt from Unconnected Pong Packet and convert to an object
 * @param {Buffer} unconnectedPongPacket
 * @returns {Object}
 * @throws {Error} If packet is malformed or invalid
 * @see {@link https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Raknet_Protocol#Unconnected_Pong}
 */
const extractModt = (unconnectedPongPacket) => {
	if (
		!Buffer.isBuffer(unconnectedPongPacket) ||
		unconnectedPongPacket.length < 35
	) {
		throw new Error("Invalid pong packet");
	}

	const offset = 33;
	const length = unconnectedPongPacket.readUInt16BE(offset);

	// Check for buffer bounds
	if (offset + 2 + length > unconnectedPongPacket.length) {
		throw new Error("Malformed pong packet");
	}

	let modt = unconnectedPongPacket.toString(
		"utf-8",
		offset + 2,
		offset + 2 + length
	);

	const components = modt.split(";");

	// Validate required components
	if (components.length < 9) {
		throw new Error("Invalid MODT format");
	}

	const parsedComponents = {
		edition: components[0],
		name: components[1],
		version: {
			protocolVersion: Number(components[2]),
			minecraftVersion: components[3],
		},
		players: {
			online: Number(components[4]),
			max: Number(components[5]),
		},
		serverId: components[6],
		mapName: components[7],
		gameMode: components[8],
	};

	return parsedComponents;
};

/**
 * Sends a ping request to the specified host and port.
 * @param {string} host - The IP address or hostname of the server.
 * @param {number} [port=19132] - The port number.
 * @param {function} cb - The callback function to handle the response.
 * @param {number} [timeout=5000] - The timeout duration in milliseconds.
 */
const ping = (host, port = 19132, cb, timeout = 5000) => {
	const socket = dgram.createSocket("udp4");

	// Set manual timeout interval.
	// This ensures the connection will NEVER hang regardless of internal state
	const timeoutTask = setTimeout(() => {
		socket.emit("error", new Error("Socket timeout"));
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
		const ping = createUnconnectedPingFrame(new Date().getTime() - START_TIME);
		socket.send(ping, 0, ping.length, port, host);
	} catch (err) {
		handleError(err);
	}

	socket.on("message", (pongPacket) => {
		if (!Buffer.isBuffer(pongPacket) || pongPacket.length === 0) {
			handleError(new Error("Invalid packet received"));
			return;
		}

		const id = pongPacket[0];
		if (id !== UNCONNECTED_PONG) {
			handleError(new Error(`Unexpected packet ID: 0x${id.toString(16)}`));
			return;
		}

		try {
			const modtObject = extractModt(pongPacket);
			closeSocket();
			cb(modtObject, null);
		} catch (err) {
			handleError(err);
		}
	});

	socket.on("error", handleError);
};

/**
 * Asynchronously ping Minecraft Bedrock server.
 * The optional `options` argument can be an object with a `ping` (default is `19132`) or/and `timeout` (default is `5000`) property.
 * @param {string} host The Bedrock server address.
 * @param {import('../types/index.js').PingOptions} options The configuration for pinging Minecraft Bedrock server.
 * @returns {Promise<import('../types/index.js').BedrockPingResponse>}
 */
export const pingBedrock = (host, options = {}) => {
	if (!host) throw new Error("Host argument is not provided");

	const { port = 19132, timeout = 5000 } = options;

	return new Promise((resolve, reject) => {
		ping(
			host,
			port,
			(res, err) => {
				err ? reject(err) : resolve(res);
			},
			timeout
		);
	});
};
