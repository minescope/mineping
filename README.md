# mineping
Collect information about Minecraft (both Java and Bedrock) using **[Node.js](http://nodejs.org)**.

## Description

`mineping` is a Javasript library thar provides Minecraft server ping protocol implementation. It can be used to collect information about the server, such as MODT, current online, server icon (java edition only) and etc.

## Requirements
> **[Node.js](https://nodejs.org/) 14 or newer is required**

## Install

```
npm i @minescope/mineping
```

## Loading and configuration the module

### ES Modules (ESM)

```js
import { pingJava, pingBedrock } from '@minescope/mineping';
```

### CommonJS
`mineping` is an ESM-only module — you are not able to import it with `require()`.
If you cannot switch to ESM, you can use the async `import()` function from CommonJS to load `mineping` asynchronously:

```js
const pingJava = (...args) => import('@minescope/mineping').then(module => module.pingJava(...args));
const pingBedrock = (...args) => import('@minescope/mineping').then(module => module.pingBedrock(...args));
```

## Usage

Ping a Java server with default options:

```js
import { pingJava } from '@minescope/mineping';

const data = await pingJava('mc.hypixel.net');
console.log(data);
```

Ping a Bedrock server with custom options:

```js
import { pingBedrock } from '@minescope/mineping';

const data = await pingBedrock('mco.mineplex.com', {
    port: 19132,
    timeout: 500
});
console.log(data);
```
> More complex example can be found in the `example` folder!

## Acknowledgements
- [mcping](https://github.com/Scetch/mcping) crate for Rust
- [mcping-js](https://github.com/Cryptkeeper/mcping-js) library for quering Minecraft Java Edition servers