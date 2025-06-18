// https://minecraft.wiki/w/Java_Edition_protocol/Data_types

"use strict";

export const ERR_VARINT_BUFFER_UNDERFLOW = "VARINT_BUFFER_UNDERFLOW";
export const ERR_VARINT_MALFORMED = "VARINT_MALFORMED";
export const ERR_VARINT_ENCODE_TOO_LARGE = "VARINT_ENCODE_TOO_LARGE";

export class VarIntError extends Error {
	/**
	 * @param {string} message The error message.
	 * @param {string} code The error code.
	 */
	constructor(message, code) {
		super(message);
		this.name = "VarIntError";
		this.code = code;
	}
}

/**
 * Encodes an integer into a VarInt buffer.
 * VarInts are never longer than 5 bytes for the Minecraft protocol.
 * @param {number} value The integer to encode
 * @returns {Buffer} The encoded VarInt as a buffer
 * @throws {VarIntError} if the value is too large to be encoded
 */
export function encodeVarInt(value) {
	const buf = Buffer.alloc(5);
	let written = 0;
	let val = value;

	while (true) {
		const byte = val & 0x7f;
		val >>>= 7;

		if (val === 0) {
			buf.writeUInt8(byte, written++);
			break;
		}

		buf.writeUInt8(byte | 0x80, written++);

		if (written >= 5 && val > 0) {
			throw new VarIntError(
				"Value too large for a 5-byte VarInt",
				ERR_VARINT_ENCODE_TOO_LARGE
			);
		}
	}

	return buf.subarray(0, written);
}

/**
 * Encodes a string into a UTF-8 buffer.
 * @param {string} value The string to encode
 * @returns {Buffer}
 */
export function encodeString(value) {
	return Buffer.from(value, "utf-8");
}

/**
 * Encodes an unsigned short (16-bit big-endian) into a 2-byte buffer.
 * @param {number} value The number to encode
 * @returns {Buffer}
 */
export function encodeUShort(value) {
	const buf = Buffer.alloc(2);
	buf.writeUInt16BE(value, 0);
	return buf;
}

/**
 * Creates a Minecraft-style packet by concatenating chunks and prefixing the total length as a VarInt.
 * @param {Buffer[]} chunks An array of buffers to include in the packet payload
 * @returns {Buffer} The complete packet with its length prefix
 */
export function concatPackets(chunks) {
	const payload = Buffer.concat(chunks);
	const lengthPrefix = encodeVarInt(payload.length);
	return Buffer.concat([lengthPrefix, payload]);
}

/**
 * Decodes a VarInt from a buffer.
 * Returns the decoded value and the number of bytes it consumed.
 * @param {Buffer} buffer The buffer to read from
 * @param {number} [offset=0] The starting offset in the buffer
 * @returns {{ value: number, bytesRead: number }}
 * @throws {VarIntError} if the buffer is too short or the VarInt is malformed
 */
export function decodeVarInt(buffer, offset = 0) {
	if (offset >= buffer.length) {
		throw new VarIntError(
			"Buffer underflow: Cannot decode VarInt at or beyond buffer length.",
			ERR_VARINT_BUFFER_UNDERFLOW
		);
	}

	// Fast path for single-byte VarInts, which are very common.
	const firstByte = buffer.readUInt8(offset);
	if ((firstByte & 0x80) === 0) {
		return { value: firstByte, bytesRead: 1 };
	}

	let val = firstByte & 0x7f; // Get the first 7 bits
	let position = 7; // Bit position for the next byte's data
	let bytesRead = 1; // We've read one byte so far
	let currentOffset = offset + 1; // Start reading from the next

	// Max 4 more bytes (total 5 bytes for a VarInt)
	for (let i = 0; i < 4; i++) {
		if (currentOffset >= buffer.length) {
			throw new VarIntError(
				"Buffer underflow: Incomplete VarInt, expected more bytes.",
				ERR_VARINT_BUFFER_UNDERFLOW
			);
		}

		const byte = buffer.readUInt8(currentOffset);
		bytesRead++;
		currentOffset++;

		val |= (byte & 0x7f) << position;
		position += 7;

		if ((byte & 0x80) === 0) {
			return { value: val, bytesRead: bytesRead };
		}
	}

	throw new VarIntError(
		"VarInt is too big or malformed: 5 bytes read with continuation bit still set.",
		ERR_VARINT_MALFORMED
	);
}
