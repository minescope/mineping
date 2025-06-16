# mineping

This JavaScript library provides an implementation of the Minecraft server ping protocol. **It allows you to gather information about a Minecraft server**, such as the MOTD, current online players, server icon (Java Edition only), and more.

Mirror on my [<img src="https://git.zeldon.ru/assets/img/logo.svg" align="center" width="20" height="20"/> Git](https://git.zeldon.ru/zeldon/mineping)

## Requirements

> **[Node.js](https://nodejs.org/) 14 or newer is required**

## Install

To install `mineping`, simply run the following command:

```
npm i @minescope/mineping
```

> To install _beta_ version (if available), run: `npm i @minescope/mineping@next`

## Loading and configuration the module

### ES Modules (ESM)

If you are using ES Modules, you can import the library like this:

```js
import { pingJava, pingBedrock } from "@minescope/mineping";
```

### CommonJS

`mineping` is an ESM-only module — you are not able to import it with `require()`.
If you cannot switch to ESM, you can use the async `import()` function from CommonJS to load `mineping` asynchronously:

```js
const pingJava = (...args) =>
	import("@minescope/mineping").then((module) => module.pingJava(...args));
const pingBedrock = (...args) =>
	import("@minescope/mineping").then((module) => module.pingBedrock(...args));
```

## Usage

Ping a Java server with default options:

```js
import { pingJava } from "@minescope/mineping";

const data = await pingJava("mc.hypixel.net");
console.log(data);
```

Ping a Bedrock server with custom options:

```js
import { pingBedrock } from "@minescope/mineping";

const data = await pingBedrock("mco.mineplex.com", {
	port: 19132,
	timeout: 500,
});
console.log(data);
```

> More complex example can be found in the `example` folder!

## Acknowledgements

Special thanks to the following projects:

- [mcping](https://github.com/Scetch/mcping) crate for Rust
- [mcping-js](https://github.com/Cryptkeeper/mcping-js) library for quering Minecraft Java Edition servers
