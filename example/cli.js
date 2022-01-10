import { pingBedrock, pingJava } from '../index.js';

const args = getArgs();

if (args.help || args.h || Object.keys(args).length === 0) {
    console.log(`node cli.js [..]
    A simple to use, efficient, and full-featured Minecraft server info parser!
    
    USAGE:
        node cli.js [OPTIONS] --host <HOST> --port <PORT> --timeout <TIMEOUT>
        
    OPTIONS:
        -j  Use for Minecraft Java Edition
        -b Use for Minecraft Bedrock Edition
        P.S. Don't use them at the same time!`);

    process.exit(1);
}

if (!args.host) {
    console.error('ERROR: The host argument not found! Use -h or --help.');
    process.exit(1);
}

// easter egg <3
if (args.j && args.b) {
    console.log(`Some interesting facts about MOTDs on bedrock:
    - so far they seem to exclusively use legacy color codes
    - the random style has a special impl for periods, they turn into animated
    colons that warp up and down rapidly
    - motd_2 is ignored? client displays "motd_1 - v{version}", where the
    appended version text is considered part of motd_1 for color code processing
    - motd_2 seems to mainly be used to return the server software in use (e.g. PocketMine-MP)`);
    process.exit(0);
}

if (args.j) {
    const data = await pingJava(args.host, {
        port: args.port || 25565,
        timeout: args.timeout || 500
    });

    console.log(`host: ${args.host}\nprotocol: ${data.version.protocol}\nonline: ${data.players.online}`);
} else if (args.b) {
    const data = await pingBedrock(args.host, {
        port: args.port || 19132,
        timeout: args.timeout || 500
    });

    console.log(`host: ${args.host}\nprotocol: ${data.version.protocol}\nonline: ${data.players.online}`);
} else {
    console.error('ERROR: Unsupported flag passed. Use -h or --help.');
}

// parsing command line arguments
function getArgs() {
    const args = {};
    process.argv.slice(2).forEach(arg => {
        // long arg
        if (arg.slice(0, 2) === '--') {
            const longArg = arg.split('=');
            const longArgFlag = longArg[0].slice(2, longArg[0].length);
            const longArgValue = longArg.length > 1 ? longArg[1] : true;
            args[longArgFlag] = longArgValue;
            // flags
        } else if (arg[0] === '-') {
            const flags = arg.slice(1, arg.length).split('');
            flags.forEach(flag => {
                args[flag] = true;
            });
        }
    });

    return args;
}