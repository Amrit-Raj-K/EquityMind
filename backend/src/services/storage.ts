import fs from 'fs';
import path from 'path';
import { StockRecord } from '../types.js';

const DB_FILE = 'stocks.json';
// In backend, assuming running from backend root
const DB_PATH = path.resolve(process.cwd(), DB_FILE);

export class StorageService {

    constructor() {
        console.log(`StorageService initialized. DB Path: ${DB_PATH}`);
    }

    private readDB(): StockRecord[] {
        try {
            if (!fs.existsSync(DB_PATH)) {
                // Try looking one level up if in dist
                const upOne = path.resolve(process.cwd(), '..', DB_FILE);
                if (fs.existsSync(upOne)) {
                    return JSON.parse(fs.readFileSync(upOne, 'utf-8'));
                }
                return [];
            }
            const data = fs.readFileSync(DB_PATH, 'utf-8');
            return JSON.parse(data);
        } catch (e) {
            console.error("Failed to read DB", e);
            return [];
        }
    }

    getAllStocks(): StockRecord[] {
        return this.readDB();
    }

    filterStocks(whereClause: string): StockRecord[] {
        const stocks = this.readDB();

        let jsCondition = whereClause
            .replace(/ AND /gi, ' && ')
            .replace(/ OR /gi, ' || ')
            .replace(/ = /g, ' == ')
            .replace(/marketCap/g, 'item.marketCap')
            .replace(/peRatio/g, 'item.peRatio')
            .replace(/roe/g, 'item.roe')
            .replace(/roce/g, 'item.roce')
            .replace(/price/g, 'item.price')
            .replace(/dividendYield/g, 'item.dividendYield');

        try {
            // eslint-disable-next-line no-new-func
            const filterFn = new Function('item', `return ${jsCondition};`);
            return stocks.filter(stock => {
                try {
                    return filterFn(stock);
                } catch { return false; }
            });
        } catch (e) {
            console.error("Filter generation failed", e);
            return [];
        }
    }
}
