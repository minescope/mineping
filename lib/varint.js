// https://wiki.vg/Data_types

const varint = {
    encodeInt: (val) => {
        // "constInts are never longer than 5 bytes"
        // https://wiki.vg/Data_types#constInt_and_constLong
        const buf = Buffer.alloc(5);
        let written = 0;

        while (true) {
            if ((val & 0xFFFFFF80) === 0) {
                buf.writeUInt8(val, written++);
                break;
            } else {
                buf.writeUInt8(val & 0x7F | 0x80, written++);
                val >>>= 7;
            }
        }

        return buf.slice(0, written);
    },

    encodeString: (val) => {
        return Buffer.from(val, 'utf-8');
    },

    encodeUShort: (val) => {
        return Buffer.from([val >> 8, val & 0xFF]);
    },

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

    decodeInt: (buffer, offset) => {
        let val = 0;
        let count = 0;

        while (true) {
            const b = buffer.readUInt8(offset++);

            val |= (b & 0x7F) << count++ * 7;

            if ((b & 0x80) != 128) {
                break;
            }
        }

        return val;
    },

    // The number of bytes that the last .decodeInt() call had to use to decode.
    decodeLength: (val) => {
        const N1 = Math.pow(2, 7);
        const N2 = Math.pow(2, 14);
        const N3 = Math.pow(2, 21);
        const N4 = Math.pow(2, 28);
        const N5 = Math.pow(2, 35);
        const N6 = Math.pow(2, 42);
        const N7 = Math.pow(2, 49);
        const N8 = Math.pow(2, 56);
        const N9 = Math.pow(2, 63);

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
