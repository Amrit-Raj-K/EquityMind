import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
// import { FileDatabase } from './database/fileDb.js';
import { MongoDatabase } from './database/mongoDb.js'; // [NEW]
import { YahooService } from './services/yahoo.js';
import dotenv from 'dotenv'; // [NEW]

dotenv.config();

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json());

// const db = new FileDatabase();
const db = new MongoDatabase(); // [NEW]
const yahoo = new YahooService();

// Connect to DB lazily inside handlers or via middleware
const ensureConnected = async () => {
    await db.connect();
};

const PROGRESS_FILE = path.resolve(process.cwd(), 'data/progress.json');

// Reset progress on startup if it was stuck (Skip on Vercel read-only FS)
const isVercel = process.env.VERCEL === '1';

if (!isVercel) {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            if (p.status === 'running' || p.status === 'starting') {
                console.log("Found stale progress. Resetting to interrupted.");
                p.status = 'interrupted';
                fs.writeFileSync(PROGRESS_FILE, JSON.stringify(p));
            }
        }
    } catch (e) { }
}

// Health Check
app.get('/', (req, res) => {
    res.send('EquityMind Backend is running (Partitioned DB)');
});

// Get all stocks (Screener/Universe)
// Supports: ?q=search&exchange=NSE|BSE
app.get('/api/stocks', async (req, res) => {
    try {
        await ensureConnected();
        const q = (req.query.q as string || '').toLowerCase();
        const exchange = (req.query.exchange as string || '').toUpperCase();

        let stocks = await db.getAllStocks();

        // Filter by exchange if specified
        if (exchange === 'NSE' || exchange === 'BSE') {
            stocks = stocks.filter((s: any) => s.exchange === exchange);
        }

        // Filter by search query
        if (q) {
            stocks = stocks.filter((s: any) =>
                s.symbol.toLowerCase().includes(q) ||
                s.name.toLowerCase().includes(q)
            );
        }

        res.json(stocks);
    } catch (e) {
        console.error("API Stocks Error:", e);
        res.status(500).json({ error: (e as Error).message, stack: isVercel ? undefined : (e as Error).stack });
    }
});

// Search Live (Yahoo)
app.get('/api/search', async (req, res) => {
    try {
        await ensureConnected();
        const q = req.query.q as string;
        if (!q || q.length < 2) return res.json([]);
        const results = await yahoo.searchLive(q);
        res.json(results);
    } catch (e) {
        console.error("API Search Error:", e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get Stock Details
app.get('/api/stocks/:symbol', async (req, res) => {
    try {
        await ensureConnected();
        const { symbol } = req.params;
        const quote = await yahoo.getQuote(symbol);
        res.json(quote);
    } catch (e) {
        console.error("API Stock Details Error:", e);
        res.status(404).json({ error: "Stock not found" });
    }
});

// Get Stock Financials
app.get('/api/stocks/:symbol/financials', async (req, res) => {
    try {
        await ensureConnected();
        const { symbol } = req.params;
        const [quarterly, annual, balanceSheet] = await Promise.all([
            yahoo.getQuarterlyResults(symbol),
            yahoo.getAnnualFinancials(symbol),
            yahoo.getBalanceSheet(symbol)
        ]);
        res.json({ quarterly, annual, balanceSheet });
    } catch (e) {
        console.error("API Financials Error:", e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Get Historical Data
app.get('/api/stocks/:symbol/history', async (req, res) => {
    try {
        await ensureConnected();
        const { symbol } = req.params;
        const range = (req.query.range as string) || '1y';
        const history = await yahoo.getHistoricalPrices(symbol, range);
        res.json(history);
    } catch (e) {
        console.error("API History Error:", e);
        res.status(500).json({ error: (e as Error).message });
    }
});

// Admin: Get Update Status
app.get('/api/admin/update-status', (req, res) => {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const data = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            return res.json(data);
        }
    } catch (e) { }
    res.json({ status: 'idle' });
});

// Admin: Force Run
import { spawn, ChildProcess } from 'child_process';
let scraperProcess: ChildProcess | null = null;

app.post('/api/admin/force-update', (req, res) => {
    if (isVercel) {
        return res.status(400).json({ error: "Scraper cannot be run directly on Vercel serverless environment. Use local runner." });
    }

    console.log("Admin triggered Force Update...");
    // 1. Kill existing process if running
    if (scraperProcess) {
        try {
            console.log("Killing existing scraper process...");
            scraperProcess.kill();
            scraperProcess = null;
        } catch (e) {
            console.error("Failed to kill existing scraper:", e);
        }
    }

    // Clear any stale stop flag — write a completely clean progress file
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify({
            status: 'starting', current: 0, total: 0, percent: 0,
            currentSymbol: '', failed: 0, stop_requested: false
        }));
    } catch (e) { }

    // Spawn separate process
    const scriptPath = path.resolve(process.cwd(), 'dist/scripts/fetch-universe.js');
    console.log(`Spawning scraper: ${scriptPath}`);

    const child = spawn('node', [scriptPath, '--force'], {
        cwd: process.cwd(),
        detached: false, // Keep attached to manage lifecycle
        stdio: 'pipe'    // Capture stdout/stderr
    });

    scraperProcess = child;

    child.stdout?.on('data', (data) => console.log(`[Scraper Output]: ${data}`));
    child.stderr?.on('data', (data) => console.error(`[Scraper Error]: ${data}`));

    child.on('error', (err) => {
        console.error("Failed to spawn scraper:", err);
    });

    child.on('close', (code) => {
        console.log(`Scraper process exited with code ${code}`);
        if (scraperProcess === child) {
            scraperProcess = null;
        }
    });

    res.json({ message: "Job started (old process killed if any)" });
});

// Admin: Stop Update
app.post('/api/admin/stop-update', (req, res) => {
    if (isVercel) {
        return res.status(400).json({ error: "Operation not supported on Vercel." });
    }
    console.log("Admin requested Stop Update...");
    try {
        let progress: any = { status: 'running' };
        if (fs.existsSync(PROGRESS_FILE)) {
            progress = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
        }
        progress.stop_requested = true;
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(progress));
        res.json({ message: "Stop signal sent" });
    } catch (e) {
        res.status(500).json({ error: "Failed to send stop signal" });
    }
});

// Only listen if not running in Vercel (or similar serverless env)
if (process.env.NODE_ENV !== 'production') {
    app.listen(port, () => {
        console.log(`Backend listening at http://localhost:${port}`);
    });
}

export default app;
