
import fs from 'fs';
import path from 'path';
import { StockRecord } from '../types.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const MAX_RECORDS_PER_FILE = 300; // ~16 lines each = ~4800 lines, stays under 5K

export class FileDatabase {

    constructor() {
        if (!fs.existsSync(DATA_DIR)) {
            fs.mkdirSync(DATA_DIR, { recursive: true });
        }
    }

    /**
     * Get all partition file paths, sorted by index.
     */
    private getPartitionFiles(): string[] {
        return fs.readdirSync(DATA_DIR)
            .filter(f => f.startsWith('stocks_part_') && f.endsWith('.json'))
            .sort((a, b) => {
                const numA = parseInt(a.replace('stocks_part_', '').replace('.json', ''));
                const numB = parseInt(b.replace('stocks_part_', '').replace('.json', ''));
                return numA - numB;
            })
            .map(f => path.join(DATA_DIR, f));
    }

    /**
     * Read a partition file safely.
     */
    private readPartition(filePath: string): StockRecord[] {
        try {
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        } catch (e) { }
        return [];
    }

    /**
     * Write a partition file.
     */
    private writePartition(filePath: string, data: StockRecord[]) {
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    /**
     * Reads all partition files and merges them into a single list.
     */
    getAllStocks(): StockRecord[] {
        let allStocks: StockRecord[] = [];
        const files = this.getPartitionFiles();
        for (const file of files) {
            const chunk = this.readPartition(file);
            allStocks = allStocks.concat(chunk);
        }
        return allStocks;
    }

    /**
     * Updates or inserts a stock record.
     * 1. Search all partitions for existing record → update in-place.
     * 2. If not found → add to the last partition that has room.
     * 3. If last partition is full → create a new partition file.
     */
    updateStock(record: StockRecord, _masterIndex?: number) {
        const files = this.getPartitionFiles();

        // 1. Search all partitions for existing record
        for (const file of files) {
            const partition = this.readPartition(file);
            const idx = partition.findIndex(s => s.symbol === record.symbol);
            if (idx >= 0) {
                // Found — update in-place
                partition[idx] = { ...partition[idx], ...record };
                this.writePartition(file, partition);
                return;
            }
        }

        // 2. Not found — add to last partition if it has room
        if (files.length > 0) {
            const lastFile = files[files.length - 1];
            const lastPartition = this.readPartition(lastFile);
            if (lastPartition.length < MAX_RECORDS_PER_FILE) {
                lastPartition.push(record);
                this.writePartition(lastFile, lastPartition);
                return;
            }
        }

        // 3. Last partition is full (or no partitions exist) — create new one
        const nextIndex = files.length > 0
            ? parseInt(path.basename(files[files.length - 1]).replace('stocks_part_', '').replace('.json', '')) + 1
            : 0;
        const newFile = path.join(DATA_DIR, `stocks_part_${nextIndex}.json`);
        this.writePartition(newFile, [record]);
    }
}
