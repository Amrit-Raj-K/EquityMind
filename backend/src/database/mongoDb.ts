import mongoose from 'mongoose';
import { StockRecord } from '../types.js';
import { StockModel } from './schema.js';
import path from 'path';

export class MongoDatabase {
    private isConnected = false;

    constructor() { }

    async connect() {
        if (this.isConnected) return;

        const uri = process.env.MONGODB_URI;
        if (!uri) {
            throw new Error("MONGODB_URI is not defined. Please check your Vercel Environment Variables.");
        }

        try {
            // Masked log for debugging without exposing secrets
            console.log(`Attempting to connect to MongoDB with URI: ${uri.substring(0, 20)}...`);
            await mongoose.connect(uri);
            this.isConnected = true;
            console.log("Connected to MongoDB Atlas");
        } catch (e) {
            console.error("MongoDB Connection Error:", e);
            throw e;
        }
    }

    /**
     * Get all stocks from MongoDB.
     * Note: For 2000+ stocks, this might be heavy. consider pagination later.
     */
    async getAllStocks(): Promise<StockRecord[]> {
        if (!this.isConnected) await this.connect();

        // Return plain JS objects, exclude _id and __v
        const docs = await StockModel.find({}).lean();
        return docs.map((d: any) => {
            const { _id, __v, ...rest } = d;
            return rest as StockRecord;
        });
    }

    /**
     * Updates or inserts a stock record.
     */
    async updateStock(record: StockRecord, _masterIndex?: number) {
        if (!this.isConnected) await this.connect();

        try {
            await StockModel.findOneAndUpdate(
                { symbol: record.symbol },
                { $set: record },
                { upsert: true, new: true }
            );
        } catch (e) {
            console.error(`Failed to update ${record.symbol} in MongoDB:`, e);
        }
    }
}
