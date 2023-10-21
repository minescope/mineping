import { pingBedrock } from '../index.js';

const [thehive, oasys, frizmine, breadix] = await Promise.allSettled([
    pingBedrock('geo.hivebedrock.network'),
    pingBedrock('oasys-pe.com'),
    pingBedrock('frizmine.ru'),
    pingBedrock('play.breadixpe.ru')
]);

console.dir({ thehive, oasys, frizmine, breadix }, { depth: 3 });