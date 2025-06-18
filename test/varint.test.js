import { describe, it, expect } from "vitest";
import * as varint from "../lib/varint.js";

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
			const encoded = varint.encodeVarInt(value);
			const { value: decoded } = varint.decodeVarInt(encoded, 0);
			expect(decoded, `Value ${value} failed round-trip`).toBe(value);
		});
	});

	it("should decode an integer from a non-zero offset", () => {
		// [255 (invalid varint), 128 (valid varint), 127 (valid varint)]
		const buffer = Buffer.from([0xff, 0x80, 0x01, 0x7f]);
		const { value: decoded } = varint.decodeVarInt(buffer, 1);
		expect(decoded).toBe(128);
	});

	it("should throw an error for a malformed varint that is too long", () => {
		const invalidBuffer = Buffer.from([0x80, 0x80, 0x80, 0x80, 0x80, 0x80]);
		expect(() => varint.decodeVarInt(invalidBuffer, 0)).toThrow(
			"VarInt is too big or malformed"
		);
	});

	it("should encode 16-bit unsigned shorts in big-endian format", () => {
		expect(varint.encodeUShort(0)).toEqual(Buffer.from([0x00, 0x00]));
		expect(varint.encodeUShort(256)).toEqual(Buffer.from([0x01, 0x00]));
		expect(varint.encodeUShort(65535)).toEqual(Buffer.from([0xff, 0xff]));
	});

	it("should correctly assemble a Minecraft packet with a length prefix", () => {
		const payloadParts = [
			varint.encodeVarInt(0), // protocol
			varint.encodeString("mc.example.com"), // host
			varint.encodeUShort(25565), // port
		];
		const payload = Buffer.concat(payloadParts);
		const finalPacket = varint.concatPackets(payloadParts);
		const { value: decodedPacketLength, bytesRead } = varint.decodeVarInt(
			finalPacket,
			0
		);
		expect(decodedPacketLength).toBe(payload.length);
		const decodedPayload = finalPacket.subarray(bytesRead);
		expect(decodedPayload).toEqual(payload);
	});
});
