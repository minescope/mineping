// https://wiki.vg/Data_types

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
        // "constInts are never longer than 5 bytes"
        // https://wiki.vg/Data_types#constInt_and_constLong
        const buf = Buffer.alloc(5);
        let written = 0;

        while (true) {
            const byte = val & 0x7F;
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
        return Buffer.from(val, 'utf-8');
    },

    /**
     * Encodes an unsigned short value into a byte buffer.
     * @param {number} val - The unsigned short value to encode.
     * @returns {Buffer}
     */
    encodeUShort: (val) => {
        return Buffer.from([val >> 8, val & 0xFF]);
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

        const buffer = [
            varint.encodeInt(length),
            ...chunks
        ];

        return Buffer.concat(buffer);
    },

    /**
     * Decodes a varint integer value from a byte buffer.
     * @param {Buffer} buffer - The byte buffer to decode from.
     * @param {number} offset - The offset in the buffer to start decoding from.
     * @returns {number}
     */
    decodeInt: (buffer, offset) => {
        let val = 0;
        let count = 0;

        while (true) {
            const byte = buffer.readUInt8(offset++);

            val |= (byte & 0x7F) << count++ * 7;

            if ((byte & 0x80) !== 0x80) {
                break;
            }
        }

        return val;
    },

    /**
     * Calculates the number of bytes required to decode a varint integer value.
     * @param {number} val - The varint integer value.
     * @returns {5 | 7 | 8 | 1 | 2 | 3 | 4 | 6 | 9 | 10}
     */
    decodeLength: (val) => {
        // Constants representing the powers of 2 used for comparison
        const N1 = Math.pow(2, 7);
        const N2 = Math.pow(2, 14);
        const N3 = Math.pow(2, 21);
        const N4 = Math.pow(2, 28);
        const N5 = Math.pow(2, 35);
        const N6 = Math.pow(2, 42);
        const N7 = Math.pow(2, 49);
        const N8 = Math.pow(2, 56);
        const N9 = Math.pow(2, 63);

        // Return the number of bytes required based on the value
        return (
            val < N1 ? 1
                : val < N2 ? 2
                    : val < N3 ? 3
                        : val < N4 ? 4
                            : val < N5 ? 5
                                : val < N6 ? 6
                                    : val < N7 ? 7
                                        : val < N8 ? 8
                                            : val < N9 ? 9
                                                : 10
        );
    }
};

export default varint;
