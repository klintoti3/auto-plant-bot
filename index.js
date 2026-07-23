const mineflayer = require('mineflayer');
const fs = require('fs');
const Vec3 = require('vec3');

// 1. Try to load local config.json if present, otherwise fall back to empty object
let localConfig = {};
if (fs.existsSync('./config.json')) {
    try {
        localConfig = JSON.parse(fs.readFileSync('./config.json', 'utf8'));
    } catch (err) {
        console.log('[BOT] config.json not found or invalid. Relying on Environment Variables.');
    }
}

// 2. Read values from Railway Environment Variables first, fallback to config.json or defaults
const HOST = process.env.SERVER_HOST || localConfig.host || 'your_server_ip.aternos.me';
const PORT = parseInt(process.env.SERVER_PORT || localConfig.port || 25565);
const USERNAME = process.env.BOT_USERNAME || localConfig.username || 'LumberjackBot';
const VERSION = process.env.MC_VERSION || localConfig.version || '1.20.4';

// STRICT FILTER: Only Oak, Spruce, and Cherry saplings
const SAPLING_NAMES = [
    'oak_sapling', 
    'spruce_sapling', 
    'cherry_sapling'
];

function createBot() {
    console.log(`[BOT] Connecting to ${HOST}:${PORT}...`);
    
    const bot = mineflayer.createBot({
        host: HOST,
        port: PORT,
        username: USERNAME,
        version: VERSION
    });

    bot.on('login', () => {
        console.log(`[BOT] Logged in as ${bot.username}! Silent mode active.`);
    });

    bot.on('spawn', () => {
        console.log('[BOT] Spawned in the world. Ready to plant!');
        setInterval(() => autoPlant(bot), 2000);
    });

    // Silent mode: ignore all in-game chats
    bot.on('chat', () => {});

    // Auto-Reconnect Logic
    bot.on('end', (reason) => {
        console.log(`[BOT] Disconnected: ${reason}. Reconnecting in 10 seconds...`);
        setTimeout(createBot, 10000);
    });

    bot.on('kicked', (reason) => console.log(`[BOT] Kicked: ${reason}`));
    bot.on('error', (err) => console.log(`[BOT] Error: ${err.message}`));
}

async function autoPlant(bot) {
    const sapling = bot.inventory.items().find(item => SAPLING_NAMES.includes(item.name));
    if (!sapling) return;

    const targetBlock = bot.findBlock({
        matching: (block) => ['dirt', 'grass_block', 'podzol', 'mycelium', 'rooted_dirt'].includes(block.name),
        maxDistance: 4,
        useExtraInfo: (block) => {
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return blockAbove && blockAbove.name === 'air';
        }
    });

    if (targetBlock) {
        try {
            await bot.equip(sapling, 'hand');
            await bot.lookAt(targetBlock.position.offset(0.5, 1, 0.5));
            const referenceBlock = bot.blockAt(targetBlock.position);
            await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
            console.log(`[BOT] Planted a ${sapling.name} at X:${targetBlock.position.x} Y:${targetBlock.position.y} Z:${targetBlock.position.z}`);
        } catch (err) {
            // Silently handle placement errors
        }
    }
}

createBot();
