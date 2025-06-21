/**
 * Encodes an integer into a VarInt buffer.
 * VarInts are never longer than 5 bytes for the Minecraft protocol.
 * @param {number} value The integer to encode
 * @returns {Buffer} The encoded VarInt as a buffer
 * @throws {VarIntError} if the value is too large to be encoded
 */
export function encodeVarInt(value: number): Buffer;
/**
 * Encodes a string into a UTF-8 buffer.
 * @param {string} value The string to encode
 * @returns {Buffer}
 */
export function encodeString(value: string): Buffer;
/**
 * Encodes an unsigned short (16-bit big-endian) into a 2-byte buffer.
 * @param {number} value The number to encode
 * @returns {Buffer}
 */
export function encodeUShort(value: number): Buffer;
/**
 * Creates a Minecraft-style packet by concatenating chunks and prefixing the total length as a VarInt.
 * @param {Buffer[]} chunks An array of buffers to include in the packet payload
 * @returns {Buffer} The complete packet with its length prefix
 */
export function concatPackets(chunks: Buffer[]): Buffer;
/**
 * Decodes a VarInt from a buffer.
 * Returns the decoded value and the number of bytes it consumed.
 * @param {Buffer} buffer The buffer to read from
 * @param {number} [offset=0] The starting offset in the buffer
 * @returns {{ value: number, bytesRead: number }}
 * @throws {VarIntError} if the buffer is too short or the VarInt is malformed
 */
export function decodeVarInt(buffer: Buffer, offset?: number): {
    value: number;
    bytesRead: number;
};
export const ERR_VARINT_BUFFER_UNDERFLOW: "VARINT_BUFFER_UNDERFLOW";
export const ERR_VARINT_MALFORMED: "VARINT_MALFORMED";
export const ERR_VARINT_ENCODE_TOO_LARGE: "VARINT_ENCODE_TOO_LARGE";
export class VarIntError extends Error {
    /**
     * @param {string} message The error message.
     * @param {string} code The error code.
     */
    constructor(message: string, code: string);
    code: string;
}
