import { pingBedrock } from '../index.js';

const hosts = [
    'play.timecrack.net',
    'geo.hivebedrock.network',
    'oasys-pe.com',
    'play.galaxite.net',
];

const pingPromises = hosts.map(host => pingBedrock(host));
const results = await Promise.allSettled(pingPromises);

for (let result of results) {
    if (result.status === 'rejected') {
        console.error(result.reason);
        break;
    }

    console.log(result.value);
}