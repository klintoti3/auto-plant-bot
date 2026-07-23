const mineflayer = require('mineflayer');
const fs = require('fs');
const Vec3 = require('vec3');

// Load configuration
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

// STRICT FILTER: Only Oak, Spruce, and Cherry saplings
const SAPLING_NAMES = [
    'oak_sapling', 
    'spruce_sapling', 
    'cherry_sapling'
];

function createBot() {
    console.log(`[BOT] Connecting to ${config.host}...`);
    
    const bot = mineflayer.createBot({
        host: config.host,
        port: config.port,
        username: config.username,
        version: config.version
    });

    bot.on('login', () => {
        console.log(`[BOT] Logged in as ${bot.username}! Silent mode active.`);
    });

    bot.on('spawn', () => {
        console.log('[BOT] Spawned in the world. Ready to plant specific saplings!');
        // Run the auto-plant check every 2 seconds
        setInterval(() => autoPlant(bot), 2000);
    });

    // Explicitly ignoring all in-game chat to ensure absolute silence
    bot.on('chat', (username, message) => {
        return; 
    });

    // Auto-Reconnect Logic
    bot.on('end', (reason) => {
        console.log(`[BOT] Disconnected: ${reason}. Reconnecting in 10 seconds...`);
        setTimeout(createBot, 10000);
    });

    bot.on('kicked', (reason) => {
        console.log(`[BOT] Kicked from server: ${reason}`);
    });

    bot.on('error', (err) => {
        console.log(`[BOT] Error: ${err.message}`);
    });
}

async function autoPlant(bot) {
    // 1. Check if the bot has our specific saplings in its inventory
    const sapling = bot.inventory.items().find(item => SAPLING_NAMES.includes(item.name));
    
    if (!sapling) {
        return; // No valid saplings available.
    }

    // 2. Find a nearby dirt-type block (within a 4-block radius)
    const targetBlock = bot.findBlock({
        matching: (block) => {
            return ['dirt', 'grass_block', 'podzol', 'mycelium', 'rooted_dirt'].includes(block.name);
        },
        maxDistance: 4,
        useExtraInfo: (block) => {
            // Ensure there is air above the block so the sapling has space
            const blockAbove = bot.blockAt(block.position.offset(0, 1, 0));
            return blockAbove && blockAbove.name === 'air';
        }
    });

    if (targetBlock) {
        try {
            // Equip the sapling in the main hand
            await bot.equip(sapling, 'hand');
            
            // Look directly at the target block
            await bot.lookAt(targetBlock.position.offset(0.5, 1, 0.5));
            
            // Place the sapling on the top face of the block
            const referenceBlock = bot.blockAt(targetBlock.position);
            await bot.placeBlock(referenceBlock, new Vec3(0, 1, 0));
            
            console.log(`[BOT] Planted a ${sapling.name} at X:${targetBlock.position.x} Y:${targetBlock.position.y} Z:${targetBlock.position.z}`);
        } catch (err) {
            // Silently catch errors if blocked by entities or out of reach
        }
    }
}

// Initialize the bot
createBot();
