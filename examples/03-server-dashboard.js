import { pingJava, pingBedrock } from "../index.js";

const servers = [
	{ type: "Java", host: "mc.hypixel.net" },
	{ type: "Java", host: "play.cubecraft.net" },
	{ type: "Java", host: "an-offline-java-server.com" },
	{ type: "Bedrock", host: "geo.hivebedrock.network" },
	{ type: "Bedrock", host: "buzz.insanitycraft.net" },
	{ type: "Bedrock", host: "an.offline.bedrock.server" },
];

console.log("Pinging all servers...");

// Create an array of ping promises
const pingPromises = servers.map((server) => {
	if (server.type === "Java") {
		return pingJava(server.host, { timeout: 3000 });
	} else {
		return pingBedrock(server.host, { timeout: 3000 });
	}
});

// Wait for all pings to complete (or fail)
const results = await Promise.allSettled(pingPromises);

// Process and display results
const displayData = results.map((result, index) => {
	const server = servers[index];
	if (result.status === "fulfilled") {
		const data = result.value;
		return {
			Server: `${server.type} - ${server.host}`,
			Status: "✅ Online",
			Players: `${data.players.online} / ${data.players.max}`,
			Version: data.version.name ?? data.version.minecraft,
		};
	} else {
		return {
			Server: `${server.type} - ${server.host}`,
			Status: "❌ Offline",
			Players: "N/A",
			Version: `Error: ${result.reason.message.slice(0, 30)}...`,
		};
	}
});

console.table(displayData);
