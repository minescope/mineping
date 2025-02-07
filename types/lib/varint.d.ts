export default varint;
declare namespace varint {
	/**
	 * Encodes an integer value into a varint byte buffer.
	 * @param val - The integer value to encode.
	 */
	function encodeInt(val: number): Buffer;

	/**
	 * Encodes a string value into a UTF-8 byte buffer.
	 * @param val - The string value to encode.
	 */
	function encodeString(val: string): Buffer;

	/**
	 * Encodes an unsigned short value into a byte buffer.
	 * @param val - The unsigned short value to encode.
	 */
	function encodeUShort(val: number): Buffer;

	/**
	 * Concatenates multiple byte buffers into a single byte buffer.
	 * @param chunks - An array of byte buffers to concatenate.
	 */
	function concat(chunks: Buffer[]): Buffer;

	/**
	 * Decodes a varint integer value from a buffer.
	 * @param buffer - The byte buffer to decode from.
	 * @param offset - The offset in the buffer to start decoding from.
	 */
	function decodeInt(buffer: Buffer, offset: number): number;

	/**
	 * Calculates how many bytes are needed to encode a number as a VarInt.
	 * VarInts use a variable number of bytes to efficiently encode integers.
	 * Each byte uses 7 bits for the value and 1 bit to indicate if more bytes follow.
	 * VarInts are never longer than 5 bytes.
	 *
	 * @param val - The number to calculate the VarInt length for.
	 * @returns The number of bytes needed to encode the value (1-5).
	 */
	function decodeLength(val: number): 1 | 2 | 3 | 4 | 5;
}
