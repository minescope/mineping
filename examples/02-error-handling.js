import { pingJava } from "../index.js";

const offlineServer = "this.server.does.not.exist";
const port = 12345;

console.log(`Pinging an offline server: ${offlineServer}:${port}`);

try {
	// We set a short timeout to fail faster.
	const data = await pingJava(offlineServer, { port, timeout: 500 });
	console.log("Success!?", data);
} catch (error) {
	console.error("Caught expected error:", error.message);
}
