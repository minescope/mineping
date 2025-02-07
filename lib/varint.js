// https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Protocol#Data_types

/**
 * A utility object for encoding and decoding varints.
 */
const varint = {
	/**
	 * Encodes an integer value into a varint byte buffer.
	 * @param {number} val - The integer value to encode.
	 * @returns {Buffer}
	 */
	encodeInt: (val) => {
		// "VarInts are never longer than 5 bytes"
		// https://minecraft.wiki/w/Minecraft_Wiki:Projects/wiki.vg_merge/Data_types#VarInt_and_VarLong
		const buf = Buffer.alloc(5);
		let written = 0;

		while (true) {
			const byte = val & 0x7f;
			val >>>= 7;

			if (val === 0) {
				buf.writeUInt8(byte, written++);
				break;
			}

			buf.writeUInt8(byte | 0x80, written++);
		}

		return buf.slice(0, written);
	},

	/**
	 * Encodes a string value into a UTF-8 byte buffer.
	 * @param {string} val - The string value to encode.
	 * @returns {Buffer}
	 */
	encodeString: (val) => {
		return Buffer.from(val, "utf-8");
	},

	/**
	 * Encodes an unsigned short value into a byte buffer.
	 * @param {number} val - The unsigned short value to encode.
	 * @returns {Buffer}
	 */
	encodeUShort: (val) => {
		return Buffer.from([val >> 8, val & 0xff]);
	},

	/**
	 * Concatenates multiple byte buffers into a single byte buffer.
	 * @param {Buffer[]} chunks - An array of byte buffers to concatenate.
	 * @returns {Buffer}
	 */
	concat: (chunks) => {
		let length = 0;

		for (const chunk of chunks) {
			length += chunk.length;
		}

		const buffer = [varint.encodeInt(length), ...chunks];

		return Buffer.concat(buffer);
	},

	/**
	 * Decodes a varint integer value from a buffer.
	 * @param {Buffer} buffer - The byte buffer to decode from.
	 * @param {number} offset - The offset in the buffer to start decoding from.
	 * @returns {number}
	 */
	decodeInt: (buffer, offset) => {
		// Fast path for single-byte varints
		const firstByte = buffer.readUInt8(offset);
		if (firstByte < 0x80) {
			return firstByte;
		}

		let val = firstByte & 0x7f;
		let position = 7;

		while (position < 32) {
			const byte = buffer.readUInt8(++offset);
			val |= (byte & 0x7f) << position;

			if ((byte & 0x80) === 0) {
				return val;
			}

			position += 7;
		}

		throw new Error("VarInt is too big");
	},

	/**
	 * Calculates how many bytes are needed to encode a number as a VarInt
	 * VarInts use a variable number of bytes to efficiently encode integers
	 * Each byte uses 7 bits for the value and 1 bit to indicate if more bytes follow
	 * VarInts are never longer than 5 bytes
	 *
	 * @param {number} val - The number to calculate the VarInt length for
	 * @returns {1|2|3|4|5} The number of bytes needed to encode the value
	 */
	decodeLength: (val) => {
		// Using bit shifts to calculate power of 2 thresholds
		// 1 << 7  = 2^7  = 128      - Numbers below this fit in 1 byte
		// 1 << 14 = 2^14 = 16,384   - Numbers below this fit in 2 bytes
		// 1 << 21 = 2^21 = 2,097,152 - Numbers below this fit in 3 bytes
		// 1 << 28 = 2^28 = 268,435,456 - Numbers below this fit in 4 bytes
		// Any larger number needs 5 bytes (maximum VarInt size)

		if (val < 1 << 7) return 1;
		if (val < 1 << 14) return 2;
		if (val < 1 << 21) return 3;
		if (val < 1 << 28) return 4;
		return 5;
	},
};

export default varint;
