/**
 * Implementation of the RakNet ping/pong protocol.
 * @see https://minecraft.wiki/w/RakNet
 */

"use strict";

import dgram from "node:dgram";
import crypto from "node:crypto";
import createDebug from "debug";

const debug = createDebug("mineping:bedrock");

const MAGIC = "00ffff00fefefefefdfdfdfd12345678";
const START_TIME = Date.now();
const UNCONNECTED_PONG = 0x1c;

/**
 * Representation of raw, semicolon-delimited MOTD string.
 * This struct directly mirrors the fields and order from the server response.
 * @see {@link https://minecraft.wiki/w/RakNet#Unconnected_Pong}
 * @typedef {object} BedrockMotd
 * @property {string} edition - The edition of the server (MCPE or MCEE)
 * @property {string} name - The primary name of the server (first line of MOTD)
 * @property {number} protocol - The protocol version
 * @property {string} version - The game version (e.g., "1.21.2")
 * @property {number} playerCount - The current number of players online
 * @property {number} playerMax - The maximum number of players allowed
 * @property {bigint} serverGuid - The server's GUID
 * @property {string} subName - The secondary name of the server (second line of MOTD)
 * @property {string} gamemode - The default gamemode (e.g., "Survival")
 * @property {boolean | undefined} nintendoLimited - Whether the server is Nintendo limited
 * @property {string | undefined} port - The server's IPv4 port, if provided
 * @property {string | undefined} ipv6Port - The server's IPv6 port, if provided
 * @property {string | undefined} editorMode - Whether the server is in editor mode, if provided. See: https://learn.microsoft.com/en-us/minecraft/creator/documents/bedrockeditor/editoroverview?view=minecraft-bedrock-stable
 */

/**
 * Represents the structured and user-friendly response from a server ping.
 * This is the public-facing object that users of the library will receive.
 * @typedef {object} BedrockPingResponse
 * @property {string} edition
 * @property {string} name
 * @property {string} levelName
 * @property {string} gamemode
 * @property {{ protocol: number, minecraft: string }} version
 * @property {{ online: number, max: number }} players
 * @property {{ v4: number | undefined, v6: number | undefined }} port
 * @property {bigint} guid
 * @property {boolean | undefined} isNintendoLimited
 * @property {string | undefined} isEditorModeEnabled
 */

/**
 * Creates an Unconnected Ping packet.
 * @param {number} timestamp - The current time delta since the script started
 * @returns {Buffer}
 * @see {@link https://minecraft.wiki/w/RakNet#Unconnected_Ping}
 */
const createUnconnectedPingFrame = (timestamp) => {
	const buffer = Buffer.alloc(33);
	buffer.writeUInt8(0x01, 0); // Packet ID
	buffer.writeBigInt64LE(BigInt(timestamp), 1); // Timestamp
	Buffer.from(MAGIC, "hex").copy(buffer, 9); // OFFLINE_MESSAGE_DATA_ID (Magic bytes)
	Buffer.from(crypto.randomBytes(8)).copy(buffer, 25); // Client GUID
	return buffer;
};

/**
 * Parses the semicolon-delimited MOTD string into a structured object.
 * @param {string} motdString - The raw MOTD string from the server
 * @throws {Error} If the MOTD string is missing required fields
 */
const parseMotd = (motdString) => {
	const parts = motdString.split(";");

	if (parts.length < 5) {
		throw new Error(
			`Invalid MOTD format: Expected at least 5 fields, but got ${parts.length}.`
		);
	}

	const [
		edition,
		name,
		protocolStr,
		version,
		playerCountStr,
		playerMaxStr,
		serverGuidStr,
		subName,
		gamemode,
		nintendoLimitedStr,
		port,
		ipv6Port,
		editorModeStr,
	] = parts;

	let nintendoLimited;
	if (nintendoLimitedStr === "0") {
		nintendoLimited = true;
	} else if (nintendoLimitedStr === "1") {
		nintendoLimited = false;
	}

	return {
		edition,
		name,
		protocol: Number(protocolStr),
		version,
		playerCount: Number(playerCountStr),
		playerMax: Number(playerMaxStr),
		serverGuid: BigInt(serverGuidStr),
		subName,
		gamemode,
		nintendoLimited,
		port: port ? Number(port) : undefined,
		ipv6Port: ipv6Port ? Number(ipv6Port) : undefined,
		editorMode: editorModeStr ? Boolean(Number(editorModeStr)) : undefined,
	};
};

/**
 * Transforms the raw MOTD object into a user-friendly, nested structure.
 * @param {BedrockMotd} motd - The parsed MOTD object
 * @returns {BedrockPingResponse}
 */
const transformMotd = (motd) => {
	return {
		edition: motd.edition,
		name: motd.name,
		levelName: motd.subName,
		gamemode: motd.gamemode,
		version: {
			protocol: motd.protocol,
			minecraft: motd.version,
		},
		players: {
			online: motd.playerCount,
			max: motd.playerMax,
		},
		port: {
			v4: motd.port,
			v6: motd.ipv6Port,
		},
		guid: motd.serverGuid,
		isNintendoLimited: motd.nintendoLimited,
		isEditorModeEnabled: motd.editorMode,
	};
};

/**
 * Extracts the MOTD string from an Unconnected Pong packet and parses it.
 * @param {Buffer} pongPacket - The raw pong packet from the server
 * @returns {BedrockPingResponse}
 * @throws {Error} If the packet is malformed
 */
const parseUnconnectedPong = (pongPacket) => {
	if (!Buffer.isBuffer(pongPacket) || pongPacket.length < 35) {
		throw new Error("Invalid pong packet: buffer is too small.");
	}

	const packetId = pongPacket.readUInt8(0);
	if (packetId !== UNCONNECTED_PONG) {
		throw new Error(
			`Unexpected packet ID: 0x${packetId.toString(16)}. Expected 0x1c.`
		);
	}

	// The MOTD string is prefixed with its length as a 16-bit big-endian integer
	const motdLength = pongPacket.readUInt16BE(33);
	const motdOffset = 35;

	if (motdOffset + motdLength > pongPacket.length) {
		throw new Error("Malformed pong packet: MOTD length exceeds buffer size.");
	}

	const motdString = pongPacket.toString(
		"utf-8",
		motdOffset,
		motdOffset + motdLength
	);
	debug("received raw MOTD string: %s", motdString);

	const rawMotd = parseMotd(motdString);
	const motd = transformMotd(rawMotd);
	return motd;
};

/**
 * Asynchronously pings a Minecraft Bedrock server.
 * @param {string} host - The IP address or hostname of the server
 * @param {object} [options] - Optional configuration
 * @param {number} [options.port=19132] - The server port
 * @param {number} [options.timeout=5000] - The request timeout in milliseconds
 * @returns {Promise<BedrockPingResponse>} A promise that resolves with the server's parsed MOTD
 */
export const pingBedrock = (host, options = {}) => {
	if (!host) {
		throw new Error("Host argument is required.");
	}

	const { port = 19132, timeout = 5000 } = options;
	debug("pinging Bedrock server %s:%d with %dms timeout", host, port, timeout);

	return new Promise((resolve, reject) => {
		const socket = dgram.createSocket("udp4");

		// Prevent cleanup tasks from running more than once
		// in case of multiple error callbacks
		let isCleanupCompleted = false;

		// Set a manual timeout interval to ensure
		// the connection will NEVER hang regardless of internal state
		const timeoutTask = setTimeout(() => {
			socket.emit("error", new Error("Socket timeout"));
		}, timeout);

		// Idempotent function to handle cleanup tasks, we can safely call it multiple times without side effects
		const cleanup = () => {
			if (isCleanupCompleted) return;
			isCleanupCompleted = true;
			debug("cleaning up resources for %s:%d", host, port);
			clearTimeout(timeoutTask);
			socket.close();
		};

		// Generic error handler
		socket.on("error", (err) => {
			debug("socket error for %s:%d - %s", host, port, err.message);
			cleanup();
			reject(err);
		});

		socket.on("message", (pongPacket) => {
			debug("received %d bytes from %s:%d", pongPacket.length, host, port);
			try {
				const motd = parseUnconnectedPong(pongPacket);
				cleanup();
				resolve(motd);
			} catch (err) {
				socket.emit("error", err);
			}
		});

		try {
			const pingPacket = createUnconnectedPingFrame(Date.now() - START_TIME);
			debug("sending Unconnected Ping packet to %s:%d", host, port);
			debug("packet: %o", pingPacket);
			socket.send(pingPacket, 0, pingPacket.length, port, host);
		} catch (err) {
			// Handle any immediate, synchronous errors that might occur when sending the ping packet
			socket.emit("error", err);
		}
	});
};
