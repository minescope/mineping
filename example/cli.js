#!/usr/bin/env node

/**
 * Usage examples:
 * - Java (with custom timeout): node cli.js -j --host="mc.hypixel.net" --timeout 1000
 * - Bedrock: node cli.js -b --host="play.timecrack.net"
 */

import { pingBedrock, pingJava } from "../index.js";

const DEFAULT_TIMEOUT = 5000;
const JAVA_DEFAULT_PORT = 25565;
const BEDROCK_DEFAULT_PORT = 19132;

try {
	const args = parseArgs(process.argv.slice(2));

	if (shouldShowHelp(args)) {
		printHelp();
		process.exit(0);
	}

	validateArgs(args);

	const port = Number(args.port) || getDefaultPort(args);
	const timeout = Number(args.timeout) || DEFAULT_TIMEOUT;

	if (args.j) {
		await pingJavaServer(args.host, port, timeout);
	} else if (args.b) {
		await pingBedrockServer(args.host, port, timeout);
	}
} catch (err) {
	console.error(`ERROR: ${err.message}`);
	process.exit(1);
}

function parseArgs(rawArgs) {
	const args = {};

	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];

		if (arg.startsWith("--")) {
			// Handle --key=value and --key value formats
			const [key, value] = arg.slice(2).split("=");
			args[key] = value ?? rawArgs[++i] ?? true;
		} else if (arg.startsWith("-")) {
			// Handle short flags (-j, -b, -h)
			const flags = arg.slice(1).split("");
			flags.forEach((flag) => {
				args[flag] = true;
			});
		}
	}

	return args;
}

function validateArgs(args) {
	if (args.j && args.b) {
		printInterestingFacts();
		process.exit(0);
	}

	if (!args.host) {
		throw new Error("The host argument not found! Use -h or --help.");
	}

	if (!args.j && !args.b) {
		throw new Error("Must specify either -j or -b flag. Use -h or --help.");
	}

	if (args.port && (isNaN(args.port) || args.port < 1 || args.port > 65535)) {
		throw new Error("Port must be a number between 1 and 65535");
	}

	if (args.timeout && (isNaN(args.timeout) || args.timeout < 0)) {
		throw new Error("Timeout must be a positive number");
	}
}

function shouldShowHelp(args) {
	return args.help || args.h || Object.keys(args).length === 0;
}

function printHelp() {
	console.log(`node cli.js [..]
    A simple to use, efficient, and full-featured Minecraft server info parser!
    
    USAGE:
        node cli.js [OPTIONS] --host <HOST> --port <PORT> --timeout <TIMEOUT>
        
    OPTIONS:
        -j  Use for Minecraft Java Edition
        -b  Use for Minecraft Bedrock Edition
        -h, --help  Show this help message
        
        --host     The server address (required)
        --port     The server port (default: ${JAVA_DEFAULT_PORT} for Java, ${BEDROCK_DEFAULT_PORT} for Bedrock)
        --timeout  The socket timeout in milliseconds (default: ${DEFAULT_TIMEOUT})
        
        P.S. Don't use -j and -b at the same time!`);
}

function printInterestingFacts() {
	console.log(`Some interesting facts about MOTDs on bedrock:
    - so far they seem to exclusively use legacy color codes
    - the random style has a special impl for periods, they turn into animated
    colons that warp up and down rapidly
    - motd_2 is ignored? client displays "motd_1 - v{version}", where the
    appended version text is considered part of motd_1 for color code processing
    - motd_2 seems to mainly be used to return the server software in use (e.g. PocketMine-MP)`);
}

function getDefaultPort(args) {
	return args.j ? JAVA_DEFAULT_PORT : BEDROCK_DEFAULT_PORT;
}

async function pingJavaServer(host, port, timeout) {
	const data = await pingJava(host, { port, timeout });
	console.log(`Host: ${host}
Version: ${data.version?.name} (protocol: ${data.version?.protocol})
Players: ${data.players?.online}/${data.players?.max}
Description: ${
		typeof data.description === "string"
			? data.description
			: data.description?.text
	}`);
}

async function pingBedrockServer(host, port, timeout) {
	const data = await pingBedrock(host, { port, timeout });
	console.log(`Host: ${host}
Edition: ${data.edition}
Version: ${data.version.minecraftVersion} (protocol: ${data.version.protocolVersion})
Players: ${data.players.online}/${data.players.max}
Name: ${data.name}
Gamemode: ${data.gameMode}`);
}
