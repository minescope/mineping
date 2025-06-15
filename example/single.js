import { pingBedrock } from "../index.js";

const host = "0.0.0.0";
const motd = await pingBedrock(host);
console.log(motd);
