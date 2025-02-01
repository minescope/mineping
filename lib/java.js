/**
 * Implementation of the Java Minecraft ping protocol.
 * @see https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Server_List_Ping
 */

"use strict";

import net from "node:net";
import varint from "./varint.js";

/**
 * Ping a Minecraft Java server.
 * @param {string} host The host of the Java server.
 * @param {string} virtualHost The host sent in handshake.
 * @param {number} [port=25565] The port of the Java server.
 * @param {function} cb The callback function to handle the ping response.
 * @param {number} [timeout=5000] The timeout duration in milliseconds.
 * @param {number} [protocolVersion=-1] The protocol version of the Java client.
 */
function ping(host, virtualHost, port = 25565, cb, timeout = 5000, protocolVersion = -1) {
	const socket = net.createConnection({ host, port });

	// Set manual timeout interval.
	// This ensures the connection will NEVER hang regardless of internal state
	const timeoutTask = setTimeout(() => {
		socket.emit("error", new Error("Socket timeout"));
	}, timeout);

	const closeSocket = () => {
		socket.destroy();
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

	// #setNoDelay instantly flushes data during read/writes
	// This prevents the runtime from delaying the write at all
	socket.setNoDelay(true);

	socket.on("connect", () => {
		const handshake = varint.concat([
			varint.encodeInt(0),
			varint.encodeInt(protocolVersion),
			varint.encodeInt(virtualHost.length),
			varint.encodeString(virtualHost),
			varint.encodeUShort(port),
			varint.encodeInt(1),
		]);

		socket.write(handshake);

		const request = varint.concat([varint.encodeInt(0)]);

		socket.write(request);
	});

	let incomingBuffer = Buffer.alloc(0);

	socket.on("data", (data) => {
		incomingBuffer = Buffer.concat([incomingBuffer, data]);

		// Wait until incomingBuffer is at least 5 bytes long to ensure it has captured the first VarInt value
		// This value is used to determine the full read length of the response
		// "VarInts are never longer than 5 bytes"
		// https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Data_types#VarInt_and_VarLong
		if (incomingBuffer.length < 5) {
			return;
		}

		let offset = 0;
		const packetLength = varint.decodeInt(incomingBuffer, offset);

		// Ensure incomingBuffer contains the full response
		if (incomingBuffer.length - offset < packetLength) {
			return;
		}

		const packetId = varint.decodeInt(
			incomingBuffer,
			varint.decodeLength(packetLength)
		);

		if (packetId === 0) {
			const data = incomingBuffer.subarray(
				varint.decodeLength(packetLength) + varint.decodeLength(packetId)
			);
			const responseLength = varint.decodeInt(data, 0);
			const response = data.subarray(
				varint.decodeLength(responseLength),
				varint.decodeLength(responseLength) + responseLength
			);

			try {
				const message = JSON.parse(response);

				closeSocket();
				cb(message, null);
			} catch (err) {
				handleError(err);
			}
		} else {
			handleError(new Error("Received unexpected packet"));
		}
	});

	socket.on("error", handleError);
}

/**
 * Asynchronously ping Minecraft Java server.
 * The optional `options` argument can be an object with a `port` (default is `25565`) or/and `timeout` (default is `5000`) or/and `protocolVersion` (default is `-1`) property.
 * @param {string} host The Java server address.
 * @param {import('../types/index.js').PingOptions} options The configuration for pinging Minecraft Java server.
 * @returns {Promise<import('../types/index.js').JavaPingResponse>}
 */
export function pingJava(host, options = {}) {
	if (!host) throw new Error("Host argument is not provided");

	const { port = 25565, timeout = 5000, protocolVersion = -1, virtualHost = null } = options;

	return new Promise((resolve, reject) => {
		ping(
			host,
			virtualHost || host,
			port,
			(res, err) => {
				err ? reject(err) : resolve(res);
			},
			timeout,
			protocolVersion
		);
	});
}
