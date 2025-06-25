import { pingJava, pingBedrock } from "../index.js";

try {
	const javaData = await pingJava("hypixel.net");
	console.log("--- Java Server ---");
	console.log(javaData);
} catch (error) {
	console.error("Could not ping Java server:", error);
}

console.log("\n" + "=".repeat(20) + "\n");

try {
	const motd = await pingBedrock("geo.hivebedrock.network");
	console.log("--- Bedrock Server ---");
	console.log(motd);
} catch (error) {
	console.error("Could not ping Bedrock server:", error);
}
