import { describe, it, expect } from "vitest";
import varint from "../lib/varint.js";

describe("varint.js", () => {
	it("should encode and decode integers symmetrically (round-trip)", () => {
		const testValues = [
			0,
			1,
			127, // Max 1-byte
			128, // Min 2-byte
			255,
			16383, // Max 2-byte
			16384, // Min 3-byte
			2147483647, // Max signed 32-bit int
			-1, // Critical edge case (encodes as max unsigned int)
		];

		testValues.forEach((value) => {
			const encoded = varint.encodeInt(value);
			const decoded = varint.decodeInt(encoded, 0);
			expect(decoded, `Value ${value} failed round-trip`).toBe(value);
		});
	});

	it("should decode an integer from a non-zero offset", () => {
		// [255 (invalid varint), 128 (valid varint), 127 (valid varint)]
		const buffer = Buffer.from([0xff, 0x80, 0x01, 0x7f]);
		expect(varint.decodeInt(buffer, 1)).toBe(128);
	});

	it("should throw an error for a malformed varint that is too long", () => {
		const invalidBuffer = Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80, 0x80]);
		expect(() => varint.decodeInt(invalidBuffer, 0)).toThrow(
			"VarInt is too big"
		);
	});

	it("should correctly predict the encoded length of a varint", () => {
		const boundaries = [0, 127, 128, 16383, 16384, 2097151, 2097152];
		boundaries.forEach((value) => {
			const predictedLength = varint.decodeLength(value);
			const actualLength = varint.encodeInt(value).length;
			expect(predictedLength).toBe(actualLength);
		});
	});

	it("should encode 16-bit unsigned shorts in big-endian format", () => {
		expect(varint.encodeUShort(0)).toEqual(Buffer.from([0x00, 0x00]));
		expect(varint.encodeUShort(256)).toEqual(Buffer.from([0x01, 0x00]));
		expect(varint.encodeUShort(65535)).toEqual(Buffer.from([0xff, 0xff]));
	});

	it("should correctly assemble and parse a Minecraft handshake packet", () => {
		const protocolVersion = -1;
		const virtualHost = "mc.example.com";
		const port = 25565;

		const payload = Buffer.concat([
			varint.encodeInt(0),
			varint.encodeInt(protocolVersion),
			varint.encodeInt(virtualHost.length),
			varint.encodeString(virtualHost),
			varint.encodeUShort(port),
			varint.encodeInt(1),
		]);

		const finalPacket = varint.concat([payload]);

		const decodedPacketLength = varint.decodeInt(finalPacket, 0);
		expect(decodedPacketLength).toBe(payload.length);

		const lengthOfPacketLength = varint.decodeLength(decodedPacketLength);
		const decodedPayload = finalPacket.subarray(lengthOfPacketLength);
		expect(decodedPayload).toEqual(payload);
	});
});
