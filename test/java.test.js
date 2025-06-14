import net from "node:net";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pingJava } from "../lib/java.js";
import varint from "../lib/varint.js";

vi.mock("node:net");

describe("pingJava", () => {
	let mockSocket;

	beforeEach(() => {
		const mockHandlers = {};
		mockSocket = {
			write: vi.fn(),
			destroy: vi.fn(),
			setNoDelay: vi.fn(),
			on: vi.fn((event, handler) => (mockHandlers[event] = handler)),
			emit: vi.fn((event, ...args) => mockHandlers[event]?.(...args)),
		};
		net.createConnection = vi.fn().mockReturnValue(mockSocket);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should ping a server and handle a chunked response", async () => {
		const host = "mc.hypixel.net";
		const options = {
			port: 25565,
			timeout: 5000,
			protocolVersion: 765,
			virtualHost: "mc.hypixel.net",
		};

		const pingPromise = pingJava(host, options);

		mockSocket.emit("connect");

		expect(net.createConnection).toHaveBeenCalledWith({
			host,
			port: options.port,
		});
		expect(mockSocket.setNoDelay).toHaveBeenCalledWith(true);
		expect(mockSocket.write).toHaveBeenCalledTimes(2);

		const mockResponse = {
			version: { name: "1.21", protocol: 765 },
			players: { max: 20, online: 5, sample: [] },
			description: "A Minecraft Server",
			favicon: "data:image/png;base64,iVBORw0KGgo...",
		};
		const fullPacket = createMockJavaResponse(mockResponse);
		const chunk1 = fullPacket.subarray(0, 10);
		const chunk2 = fullPacket.subarray(10);

		mockSocket.emit("data", chunk1);
		mockSocket.emit("data", chunk2);

		const result = await pingPromise;
		expect(result).toEqual(mockResponse);
		expect(mockSocket.destroy).toHaveBeenCalled();
	});

	describe("errors", () => {
		it("should throw an error if host is not provided", () => {
			expect(() => pingJava(null)).toThrow("Host argument is not provided");
		});

		it("should reject on socket timeout before data is received", async () => {
			const pingPromise = pingJava("localhost", { timeout: 1000 });
			mockSocket.emit("connect");

			// Advance time to trigger the timeout
			vi.advanceTimersByTime(1000);

			await expect(pingPromise).rejects.toThrow("Socket timeout");
			expect(mockSocket.destroy).toHaveBeenCalled();
		});

		it("should reject on connection error", async () => {
			const pingPromise = pingJava("localhost");

			// Simulate a connection refusal
			mockSocket.emit("error", new Error("ECONNREFUSED"));

			await expect(pingPromise).rejects.toThrow("ECONNREFUSED");
		});

		it("should only reject once, even if multiple errors occur", async () => {
			const pingPromise = pingJava("localhost");

			// Fire two errors back-to-back
			mockSocket.emit("error", new Error("First error"));
			mockSocket.emit("error", new Error("Second error"));

			await expect(pingPromise).rejects.toThrow("First error");
			expect(mockSocket.destroy).toHaveBeenCalledTimes(1);
		});
	});
});

function createMockJavaResponse(response) {
	const jsonString = JSON.stringify(response);
	const jsonBuffer = Buffer.from(jsonString, "utf8");
	const responseLength = varint.encodeInt(jsonBuffer.length);
	const packetId = varint.encodeInt(0);
	const packetData = Buffer.concat([packetId, responseLength, jsonBuffer]);
	const packetLength = varint.encodeInt(packetData.length);
	return Buffer.concat([packetLength, packetData]);
}
