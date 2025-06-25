# mineping

[![npm version](https://img.shields.io/npm/v/@minescope/mineping.svg)](https://www.npmjs.com/package/@minescope/mineping)

A simple and efficient JavaScript library for pinging Minecraft servers. It supports both Java and Bedrock editions through a async/await-friendly API.

`@minescope/mineping` automatically resolves SRV records for Java servers and parses rich status data, including MOTD, player counts, version info, and server icons. Comes with full TypeScript support.

*Mirror on my [<img src="https://git.zeldon.ru/assets/img/logo.svg" align="center" width="20" height="20"/> Git](https://git.zeldon.ru/zeldon/mineping)*

## Features

- **Dual Protocol Support:** Ping both Java and Bedrock servers with a consistent API.
- **SRV Record Resolution:** Automatically resolves SRV records for Java Edition servers, so you don't have to worry about custom ports.
- **Rich Data:** Parses the full response from servers, including player samples, favicons, gamemodes, and more.
- **Lightweight:** Has only **one** runtime dependency — [debug](https://www.npmjs.com/package/debug) (used for tracing).

## Requirements

> **[Node.js](https://nodejs.org/) 14 or newer is required**

## Install

To install `mineping`, simply run the following command:

```bash
npm i @minescope/mineping
```

## API & Usage Examples

The library exports two main functions: `pingJava` and `pingBedrock`. Both are asynchronous and return a `Promise`.

### 1. Basic Server Ping

Java:
```js
import { pingJava } from "@minescope/mineping";

const data = await pingJava("0.0.0.0");
console.log(data)
```
```js
{
  version: { name: '1.21.5', protocol: 770 },
  enforcesSecureChat: true,
  description: '§1Welcome to §2My Minecraft Server!',
  players: { max: 20, online: 0 }
}
```

Bedrock:
```js
import { pingBedrock } from "@minescope/mineping";

const data = await pingBedrock("0.0.0.0");
console.log(data)
```
```js
{
  edition: 'MCPE',
  name: 'Dedicated Server',
  levelName: 'Bedrock level',
  gamemode: 'Survival',
  version: { protocol: 800, minecraft: '1.21.84' },
  players: { online: 0, max: 10 },
  port: { v4: 19132, v6: 19133 },
  guid: 12143264093420916401n,
  isNintendoLimited: false,
  isEditorModeEnabled: false
}
```

## Loading and configuration the module

### CommonJS

`mineping` is an ESM-only module — you are not able to import it with `require()`.
If you cannot switch to ESM, you can use the async `import()` function from CommonJS to load `mineping` asynchronously:

```js
const pingJava = (...args) =>
	import("@minescope/mineping").then((module) => module.pingJava(...args));
const pingBedrock = (...args) =>
	import("@minescope/mineping").then((module) => module.pingBedrock(...args));
```

## Debugging

`mineping` uses the [`debug`](https://www.npmjs.com/package/debug) library to provide detailed tracing information, which can be useful for diagnosing connection issues or understanding the library's internal workings.

To enable debug logs, set the `DEBUG` environment variable when running your script. The library uses two namespaces:

-   `mineping:java` for the Java Edition pinger.
-   `mineping:bedrock` for the Bedrock Edition pinger.

### Examples

**Enable all `mineping` debug logs:**

You can use a wildcard (`*`) to enable all logs from this library.

```bash
DEBUG=mineping:* node your-script.js
```

<details>
<summary>Click to see output for <code>DEBUG="mineping:*" node examples/01-basic-ping.js</code></summary>

```bash
DEBUG="mineping:*" node examples/01-basic-ping.js 
  mineping:java pinging Java server hypixel.net with options: {} +0ms
  mineping:java attempting SRV lookup for _minecraft._tcp.hypixel.net with 5000ms timeout +2ms
  mineping:java SRV lookup successful, new target: mc.hypixel.net:25565 +2ms
  mineping:java creating TCP connection to mc.hypixel.net:25565 +0ms
  mineping:java socket connected to mc.hypixel.net:25565, sending packets... +182ms
  mineping:java received 1440 bytes of data, total buffer size is now 1440 bytes +130ms
  mineping:java packet incomplete, waiting for more data +0ms
  mineping:java received 12960 bytes of data, total buffer size is now 14400 bytes +1ms
  mineping:java packet incomplete, waiting for more data +0ms
  mineping:java received 1601 bytes of data, total buffer size is now 16001 bytes +129ms
  mineping:java received raw JSON response +0ms
  mineping:java successfully parsed full response +0ms
  mineping:java cleaning up resources for mc.hypixel.net:25565 +0ms
--- Java Server ---
{
  version: { name: 'Requires MC 1.8 / 1.21', protocol: 47 },
  players: { max: 200000, online: 28654, sample: [] },
  description: '                §aHypixel Network §c[1.8-1.21]\n' +
    '       §6§lSB 0.23 §2§lFORAGING §8§l- §e§lSUMMER EVENT',
  favicon: 'data:image/png;base64,iVBORw0K'... 5738 more characters
}

====================

  mineping:bedrock pinging Bedrock server geo.hivebedrock.network:19132 with 5000ms timeout +0ms
  mineping:bedrock sending Unconnected Ping packet to geo.hivebedrock.network:19132 +1ms
  mineping:bedrock packet: <Buffer 01 c0 01 00 00 00 00 00 00 00 ff ff 00 fe fe fe fe fd fd fd fd 12 34 56 78 19 20 9f 00 e6 ed ef 96> +0ms
  mineping:bedrock received 124 bytes from geo.hivebedrock.network:19132 +104ms
  mineping:bedrock received raw MOTD string: MCPE;BEDWARS + BUILD BATTLE;121;1.0;13074;100001;-4669279440237021648;Hive Games;Survival +0ms
  mineping:bedrock cleaning up resources for geo.hivebedrock.network:19132 +0ms
--- Bedrock Server ---
{
  edition: 'MCPE',
  name: 'BEDWARS + BUILD BATTLE',
  levelName: 'Hive Games',
  gamemode: 'Survival',
  version: { protocol: 121, minecraft: '1.0' },
  players: { online: 13074, max: 100001 },
  port: { v4: undefined, v6: undefined },
  guid: -4669279440237021648n,
  isNintendoLimited: undefined,
  isEditorModeEnabled: undefined
}
```
</details>

**_PowerShell_ uses different syntax to set environment variables:**

```powershell
$env:DEBUG="mineping:*";node your-script.js
```

## Acknowledgements

Special thanks to the following projects for inspiration and protocol details:

- [mcping](https://github.com/Scetch/mcping) crate for Rust
- [mcping-js](https://github.com/Cryptkeeper/mcping-js) library for querying Minecraft Java Edition servers
- The amazing community at [minecraft.wiki](https://minecraft.wiki/) for documenting the protocols.
