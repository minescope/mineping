/**
 * Implementation of the Java Minecraft ping protocol.
 * @see https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping
 */

"use strict";

import net from "node:net";
import dns from "node:dns/promises";
import * as varint from "./varint.js";

/**
 * Represents the structured and user-friendly response from a server ping.
 * The fields and their optionality are based on the official protocol documentation.
 * @typedef {object} JavaPingResponse
 * @property {{ name: string, protocol: number }} version - Contains the server's version name and protocol number
 * @property {{ max: number, online: number, sample?: Array<{ name: string, id: string }> } | undefined} players - Player count and a sample of online players.
 * @property {object | string | undefined} description - Optional. The server's Message of the Day (MOTD)
 * @property {string | undefined} favicon - Optional. A Base64-encoded 64x64 PNG image data URI
 * @property {boolean | undefined} enforcesSecureChat - Optional. True if the server requires clients to have a Mojang-signed public key
 * @property {boolean | undefined} preventsChatReports - Optional. True if a mod is installed to disable chat reporting
 * @see {@link https://minecraft.wiki/w/Java_Edition_protocol/Server_List_Ping#Status_Response}
 */

/**
 * Creates the Handshake packet.
 * @param {string} host The hostname to connect to
 * @param {number} port The port to connect to
 * @param {number} protocolVersion The protocol version to use
 * @returns {Buffer} The complete Handshake packet
 */
function createHandshakePacket(host, port, protocolVersion) {
	const hostBuffer = varint.encodeString(host);

	const payload = [
		varint.encodeVarInt(0x00), // Packet ID
		varint.encodeVarInt(protocolVersion),
		varint.encodeVarInt(hostBuffer.length),
		hostBuffer,
		varint.encodeUShort(port),
		varint.encodeVarInt(1), // Next state: 1 for Status
	];

	return varint.concatPackets(payload);
}

/**
 * Creates the Status Request packet.
 * @returns {Buffer} The complete Status Request packet
 */
function createStatusRequestPacket() {
	const payload = [
		varint.encodeVarInt(0x00), // Packet ID
	];
	return varint.concatPackets(payload);
}

/**
 * Attempts to parse the server status response from the buffer.
 * @param {Buffer} buffer The incoming data buffer
 * @returns {{ response: JavaPingResponse, remainder: Buffer } | null} The parsed response and the remaining buffer, or null if the packet is incomplete
 */
function processResponse(buffer) {
	let offset = 0;

	try {
		const packetLengthResult = varint.decodeVarInt(buffer, offset);
		const packetLength = packetLengthResult.value;
		offset += packetLengthResult.bytesRead;

		// Check if the full packet has arrived yet.
		if (buffer.length < offset + packetLength) {
			return null; // Incomplete packet, wait for more data.
		}

		const packetIdResult = varint.decodeVarInt(buffer, offset);
		if (packetIdResult.value !== 0x00) {
			throw new Error(
				`Unexpected packet ID: ${packetIdResult.value}. Expected 0x00.`
			);
		}
		offset += packetIdResult.bytesRead;

		const jsonLengthResult = varint.decodeVarInt(buffer, offset);
		const jsonLength = jsonLengthResult.value;
		offset += jsonLengthResult.bytesRead;

		if (buffer.length < offset + jsonLength) {
			return null; // Incomplete JSON string, wait for more data.
		}

		const jsonString = buffer
			.subarray(offset, offset + jsonLength)
			.toString("utf8");
		const response = JSON.parse(jsonString);

		// Return the response and any data that came after this packet.
		const remainder = buffer.subarray(offset + jsonLength);

		return { response, remainder };
	} catch (err) {
		// If the buffer is too short for a VarInt, it's a recoverable state.
		if (err.code === varint.ERR_VARINT_BUFFER_UNDERFLOW) {
			return null; // Wait for more data.
		}
		// For malformed VarInts or JSON, throw the error to reject the promise.
		throw err;
	}
}

/**
 * Pings a Minecraft Java Edition server.
 * This function performs an SRV lookup and then attempts to connect and retrieve the server status.
 * @param {string} host The server address to ping
 * @param {object} [options={}] Optional configuration
 * @param {number} [options.port=25565] The fallback port if an SRV record is not found
 * @param {number} [options.timeout=5000] The connection timeout in milliseconds
 * @param {number} [options.protocolVersion=-1] The protocol version to use in the handshake. `-1` is for auto-detection
 * @returns {Promise<JavaPingResponse>} A promise that resolves with the server's status
 */
export async function pingJava(host, options = {}) {
	if (typeof host !== "string" || host.trim() === "") {
		throw new Error("Host argument is required.");
	}

	const {
		port: fallbackPort = 25565,
		timeout = 5000,
		protocolVersion = -1,
	} = options;

	let targetHost = host;
	let targetPort = fallbackPort;

	try {
		const srvRecords = await dns.resolveSrv(`_minecraft._tcp.${host}`);
		if (srvRecords.length > 0) {
			targetHost = srvRecords[0].name;
			targetPort = srvRecords[0].port;
		}
	} catch (err) {
		// Common errors like ENODATA or ENOTFOUND are expected when a server
		// does not have an SRV record, so we ignore them and proceed.
		if (!["ENODATA", "ENOTFOUND"].includes(err.code)) {
			// For other errors we should re-throw.
			throw err;
		}
	}

	return new Promise((resolve, reject) => {
		const socket = net.createConnection({ host: targetHost, port: targetPort });

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
			clearTimeout(timeoutTask);
			socket.destroy();
		};

		// #setNoDelay instantly flushes data during read/writes
		// This prevents the runtime from delaying the write at all
		socket.setNoDelay(true);

		// Generic error handler
		socket.on("error", (err) => {
			cleanup();
			reject(err);
		});

		socket.on("close", () => {
			if (!isCleanupCompleted) {
				cleanup();
				reject(new Error("Socket closed unexpectedly without a response."));
			}
		});

		socket.on("connect", () => {
			try {
				const handshakePacket = createHandshakePacket(
					host,
					targetPort,
					protocolVersion
				);
				const statusRequestPacket = createStatusRequestPacket();
				socket.write(handshakePacket);
				socket.write(statusRequestPacket);
			} catch (err) {
				// Handle synchronous errors during packet creation/writing
				socket.emit("error", err);
			}
		});

		let incomingBuffer = Buffer.alloc(0);

		socket.on("data", (data) => {
			incomingBuffer = Buffer.concat([incomingBuffer, data]);

			try {
				const result = processResponse(incomingBuffer);
				if (result) {
					// We successfully parsed a response. Clean up before resolving.
					cleanup();
					resolve(result.response);
				}
				// If result is null, we just wait for more data to arrive.
			} catch (err) {
				socket.emit("error", err);
			}
		});
	});
}
