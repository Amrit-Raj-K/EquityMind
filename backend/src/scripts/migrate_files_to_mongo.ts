
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { StockModel } from '../database/schema.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const DATA_DIR = path.resolve(process.cwd(), 'data');

async function migrate() {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
        console.error("Please set MONGODB_URI in .env first.");
        return;
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(uri);
    console.log("Connected.");

    // Get all partition files
    const files = fs.readdirSync(DATA_DIR)
        .filter(f => f.startsWith('stocks_part_') && f.endsWith('.json'));

    console.log(`Found ${files.length} partition files.`);

    let total = 0;
    let errors = 0;

    for (const file of files) {
        console.log(`Processing ${file}...`);
        const content = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), 'utf-8'));

        if (!Array.isArray(content)) continue;

        const operations = content.map(stock => ({
            updateOne: {
                filter: { symbol: stock.symbol },
                update: { $set: stock },
                upsert: true
            }
        }));

        if (operations.length > 0) {
            try {
                // Bulk write for speed
                await StockModel.bulkWrite(operations);
                total += operations.length;
                console.log(`  --> Migrated ${operations.length} stocks.`);
            } catch (e) {
                console.error(`  --> Failed to migrate ${file}:`, e);
                errors++;
            }
        }
    }

    console.log(`\nMigration Complete.`);
    console.log(`Total Stocks Migrated: ${total}`);
    console.log(`Errors: ${errors}`);

    await mongoose.disconnect();
}

migrate().catch(console.error);
