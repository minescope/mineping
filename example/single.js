import { pingBedrock } from "../index.js";

const host = "mc.nevertime.su";
const ping = await pingBedrock(host);
console.log(ping);
