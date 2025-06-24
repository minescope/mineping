import net from "node:net";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pingJava } from "../lib/java.js";
import * as varint from "../lib/varint.js";

const mockResolveSrv = vi.fn();

vi.mock("node:net");
vi.mock("node:dns/promises", () => ({
	Resolver: vi.fn().mockImplementation(() => ({
		resolveSrv: mockResolveSrv,
	})),
}));

describe("pingJava", () => {
	let mockSocket;

	beforeEach(() => {
		// Reset mocks before each test.
		mockResolveSrv.mockClear();
		// Simulate no SRV record found by default.
		mockResolveSrv.mockResolvedValue([]);

		const mockHandlers = {};
		mockSocket = {
			write: vi.fn(),
			// Make `destroy` emit 'error' if an error is passed.
			destroy: vi.fn((err) => {
				if (err) {
					mockSocket.emit("error", err);
				}
			}),
			setNoDelay: vi.fn(),
			on: vi.fn((event, handler) => (mockHandlers[event] = handler)),
			emit: vi.fn((event, ...args) => mockHandlers[event]?.(...args)),
		};
		net.createConnection.mockReturnValue(mockSocket);
		vi.useFakeTimers();
	});

	afterEach(() => {
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	it("should ping a server and handle a chunked response", async () => {
		const host = "mc.hypixel.net";
		const options = { port: 25565 };
		const pingPromise = pingJava(host, options);

		// Allow the async SRV lookup to complete
		await vi.runAllTicks();

		expect(net.createConnection).toHaveBeenCalledWith({
			host: host,
			port: options.port,
		});

		expect(net.createConnection).toHaveBeenCalledWith({
			host,
			port: options.port,
		});

		mockSocket.emit("connect");
		expect(mockSocket.write).toHaveBeenCalledTimes(2);

		const mockResponse = {
			version: { name: "1.21", protocol: 765 },
			players: { max: 20, online: 5, sample: [] },
			description: "A Minecraft Server",
		};

		const fullPacket = createMockJavaResponse(mockResponse);
		const chunk1 = fullPacket.subarray(0, 10);
		const chunk2 = fullPacket.subarray(10);

		// Simulate receiving data in chunks
		mockSocket.emit("data", chunk1);
		mockSocket.emit("data", chunk2);

		const result = await pingPromise;
		expect(result).toEqual(mockResponse);
	});

	describe("errors", () => {
		it("should throw an error if host is not provided", async () => {
			await expect(pingJava(null)).rejects.toThrow("Host argument is required");
		});

		it("should reject on socket timeout", async () => {
			const pingPromise = pingJava("localhost", { timeout: 1000 });
			await vi.runAllTicks();
			mockSocket.emit("connect");
			vi.advanceTimersByTime(1000);
			await expect(pingPromise).rejects.toThrow("Socket timeout");
		});

		it("should reject on connection error", async () => {
			const pingPromise = pingJava("localhost");
			await vi.runAllTicks();
			mockSocket.emit("error", new Error("ECONNREFUSED"));
			await expect(pingPromise).rejects.toThrow("ECONNREFUSED");
		});

		it("should reject if the socket closes prematurely without a response", async () => {
			const pingPromise = pingJava("localhost");

			// Allow the initial async operations to complete
			await vi.runAllTicks();

			// Simulate the server accepting the connection and then immediately closing it
			mockSocket.emit("connect");
			mockSocket.emit("close");

			// The promise should reject with our specific 'close' handler message
			await expect(pingPromise).rejects.toThrow(
				"Socket closed unexpectedly without a response."
			);
		});

		it("should only reject once, even if multiple errors occur", async () => {
			const pingPromise = pingJava("localhost");
			await vi.runAllTicks();
			mockSocket.emit("error", new Error("First error"));
			mockSocket.emit("error", new Error("Second error")); // Should be ignored
			await expect(pingPromise).rejects.toThrow("First error");
		});
	});
});

/**
 * Creates a mock Java status response packet according to the protocol.
 * Structure: [Overall Length] [Packet ID] [JSON Length] [JSON String]
 * @param {object} response The JSON response object
 * @returns {Buffer}
 */
function createMockJavaResponse(response) {
	const jsonString = JSON.stringify(response);
	const jsonBuffer = varint.encodeString(jsonString);
	const jsonLength = varint.encodeVarInt(jsonBuffer.length);
	const packetId = varint.encodeVarInt(0x00);
	const payloadParts = [packetId, jsonLength, jsonBuffer];
	return varint.concatPackets(payloadParts);
}
