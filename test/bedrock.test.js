import dgram from "node:dgram";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pingBedrock } from "../lib/bedrock.js";

vi.mock("node:dgram");

describe("bedrock.js", () => {
	let mockSocket;

	beforeEach(() => {
		// A store for event handlers, closed over by the mockSocket.
		const handlers = {};

		// Create a stateful mock socket to simulate EventEmitter.
		mockSocket = {
			send: vi.fn(),
			close: vi.fn(),
			on: vi.fn((event, handler) => {
				handlers[event] = handler;
			}),
			emit: vi.fn((event, ...args) => {
				if (handlers[event]) {
					handlers[event](...args);
				}
			}),
		};

		dgram.createSocket = vi.fn().mockReturnValue(mockSocket);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("should ping a server and parse MOTD", async () => {
		const host = "play.example.com";
		const options = { port: 25565, timeout: 10000 };
		const pingPromise = pingBedrock(host, options);

		const motd =
			"MCPE;§l§bＯａｓｙｓ§fＰＥ;0;1337;1096;1999;-37530542056358113;oasys-pe.ru;Adventure;1";
		const mockPongPacket = createMockPongPacket(motd);

		mockSocket.emit("message", mockPongPacket);

		const result = await pingPromise;

		expect(dgram.createSocket).toHaveBeenCalledWith("udp4");
		expect(mockSocket.send).toHaveBeenCalledWith(
			expect.any(Buffer),
			0,
			33,
			options.port,
			host
		);
		expect(mockSocket.close).toHaveBeenCalled();
		expect(result).toEqual({
			edition: "MCPE",
			name: "§l§bＯａｓｙｓ§fＰＥ",
			version: { protocolVersion: 0, minecraftVersion: "1337" },
			players: { online: 1096, max: 1999 },
			serverId: "-37530542056358113",
			mapName: "oasys-pe.ru",
			gameMode: "Adventure",
		});
	});

	describe("errors", () => {
		it("should throw an error if host is not provided", () => {
			expect(() => pingBedrock(null)).toThrow("Host argument is not provided");
		});

		it("should reject on socket timeout", async () => {
			const pingPromise = pingBedrock("play.example.com", { timeout: 1000 });

			vi.advanceTimersByTime(1000);

			await expect(pingPromise).rejects.toThrow("Socket timeout");
			expect(mockSocket.close).toHaveBeenCalled();
		});

		it("should reject on a generic socket error", async () => {
			const pingPromise = pingBedrock("play.example.com");

			// Simulate a DNS or network error by emitting it.
			mockSocket.emit("error", new Error("EHOSTUNREACH"));

			await expect(pingPromise).rejects.toThrow("EHOSTUNREACH");
		});

		it("should only reject once, even if multiple errors occur", async () => {
			const pingPromise = pingBedrock("play.example.com");

			// Fire a socket error first.
			mockSocket.emit("error", new Error("First error"));

			// Then, try to trigger another error by sending a bad message.
			mockSocket.emit("message", Buffer.alloc(0));

			await expect(pingPromise).rejects.toThrow("First error");
			expect(mockSocket.close).toHaveBeenCalledTimes(1);
		});
	});
});

function createMockPongPacket(motd) {
	const motdBuffer = Buffer.from(motd, "utf-8");
	const packet = Buffer.alloc(35 + motdBuffer.length);
	packet.writeUInt8(0x1c, 0);
	packet.writeBigInt64LE(BigInt(Date.now()), 1);
	Buffer.from("00ffff00fefefefefdfdfdfd12345678", "hex").copy(packet, 17);
	packet.writeUInt16BE(motdBuffer.length, 33);
	motdBuffer.copy(packet, 35);
	return packet;
}
