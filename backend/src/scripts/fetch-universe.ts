import fs from 'fs';
import path from 'path';
import { GoogleService } from '../services/google.js';
import { YahooService } from '../services/yahoo.js';
import { FileDatabase } from '../database/fileDb.js';
import { StockRecord } from '../types.js';

const db = new FileDatabase();
const google = new GoogleService();
const yahoo = new YahooService();

// Config
const MASTER_FILE = path.resolve(process.cwd(), 'data/master_symbols.json');
const META_FILE = path.resolve(process.cwd(), 'data/meta.json');
const PROGRESS_FILE = path.resolve(process.cwd(), 'data/progress.json');
const SCRAPE_DELAY_MS = 2000;
const BATCH_GAP_MS = 3600000;

function loadMasterList(): string[] {
    if (fs.existsSync(MASTER_FILE)) {
        return JSON.parse(fs.readFileSync(MASTER_FILE, 'utf-8'));
    }
    return [];
}

function writeProgress(data: any) {
    try {
        fs.writeFileSync(PROGRESS_FILE, JSON.stringify(data));
    } catch (e) { }
}

function shouldStop(): boolean {
    try {
        if (fs.existsSync(PROGRESS_FILE)) {
            const p = JSON.parse(fs.readFileSync(PROGRESS_FILE, 'utf-8'));
            if (p.stop_requested) return true;
        }
    } catch (e) { }
    return false;
}

function shouldRun(): boolean {
    if (process.argv.includes('--force')) {
        console.log("Force run detected. Ignoring schedule.");
        return true;
    }

    const now = new Date();
    const day = now.getDay();

    if (day === 0 || day === 6) {
        console.log(`Today is Weekend (Day ${day}). Skipping auto-run.`);
        return false;
    }

    if (fs.existsSync(META_FILE)) {
        try {
            const meta = JSON.parse(fs.readFileSync(META_FILE, 'utf-8'));
            if (meta.lastRun) {
                const lastRun = new Date(meta.lastRun);
                if (lastRun.getDate() === now.getDate() &&
                    lastRun.getMonth() === now.getMonth() &&
                    lastRun.getFullYear() === now.getFullYear()) {
                    console.log("Already ran successfully today. Skipping.");
                    return false;
                }
            }
        } catch (e) { }
    }

    return true;
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) => setTimeout(() => reject(new Error('Timeout')), ms))
    ]);
}

const DEBUG_LOG = path.resolve(process.cwd(), 'scraper_debug.log');
function logToFile(msg: string) {
    try { fs.appendFileSync(DEBUG_LOG, `[${new Date().toISOString()}] ${msg}\n`); } catch (e) { }
}

async function startScrapingLoop() {
    logToFile("Scraper process started.");
    console.log(`Starting Scheduler...`);
    await new Promise(r => setTimeout(r, 1000));

    while (true) {
        if (shouldRun()) {
            const symbols = loadMasterList();

            if (symbols.length === 0) {
                console.log("No symbols in master_symbols.json. Please populate it.");
            } else {
                console.log(`Starting Daily Update for ${symbols.length} symbols...`);
                logToFile(`Starting update for ${symbols.length} symbols`);
                writeProgress({ status: 'running', current: 0, total: symbols.length, percent: 0, currentSymbol: 'Init...', failed: 0 });

                let failCount = 0;
                let stopped = false;

                for (let i = 0; i < symbols.length; i++) {
                    const symbol = symbols[i];
                    const msg = `Processing ${i + 1}/${symbols.length}: ${symbol}`;
                    console.log(msg);
                    logToFile(msg);
                    // Check for stop flag
                    if (shouldStop()) {
                        console.log('Stop requested by user. Halting scrape.');
                        writeProgress({ status: 'stopped', current: i, total: symbols.length, percent: Math.round((i / symbols.length) * 100), currentSymbol: '', failed: failCount });
                        stopped = true;
                        break;
                    }


                    try {
                        let quote: any = null;
                        let source = 'Google';

                        // 1. Google (User preferred primary)
                        try {
                            const gQuote = await withTimeout(google.getQuote(symbol), 10000);
                            if (gQuote) {
                                quote = gQuote;
                                logToFile(`Got Google quote for ${symbol}: ${gQuote.price}`);
                            }
                        } catch (e: any) { logToFile(`Google failed for ${symbol}: ${e.message}`); }

                        // 2. Yahoo Fallback OR Enrichment
                        try {
                            const yQuote = await withTimeout(yahoo.getQuote(symbol), 10000);
                            if (!quote) {
                                // Full Fallback
                                if (yQuote) {
                                    quote = yQuote;
                                    source = 'Yahoo';
                                }
                            } else {
                                // Enrichment: Google gave price, but Yahoo gives better stats
                                if (yQuote) {
                                    // Use Yahoo's real company name
                                    if (yQuote.name && yQuote.name !== symbol) quote.name = yQuote.name;
                                    // Copy change/changePercent from Yahoo if Google returned 0
                                    if (!quote.change && yQuote.change) quote.change = yQuote.change;
                                    if (!quote.changePercent && yQuote.changePercent) quote.changePercent = yQuote.changePercent;
                                    // Core financial ratios
                                    quote.roe = yQuote.roe;
                                    quote.roce = yQuote.roce;
                                    quote.debtToEquity = yQuote.debtToEquity;
                                    quote.bookValue = yQuote.bookValue;
                                    quote.pbRatio = yQuote.pbRatio || quote.pbRatio;
                                    quote.eps = yQuote.eps || quote.eps;
                                    quote.pegRatio = yQuote.pegRatio;
                                    quote.evToEbitda = yQuote.evToEbitda;
                                    // Margins & ratios
                                    quote.netProfitMargin = yQuote.netProfitMargin;
                                    quote.operatingMargin = yQuote.operatingMargin;
                                    quote.currentRatio = yQuote.currentRatio;
                                    // Cash flows
                                    quote.freeCashFlow = yQuote.freeCashFlow;
                                    quote.operatingCashFlow = yQuote.operatingCashFlow;
                                    // Volume
                                    if (!quote.volume && yQuote.volume) quote.volume = yQuote.volume;
                                }
                            }
                        } catch (e) {
                            // Yahoo failed, but if we have Google quote, we proceed with that
                        }

                        if (quote) {
                            const record: StockRecord = {
                                ...quote,
                                marketCap: quote.marketCap ?? 0,
                                peRatio: quote.peRatio ?? 0,
                                roe: quote.roe ?? 0,
                                roce: quote.roce ?? 0,
                                updatedAt: Date.now()
                            } as StockRecord;
                            db.updateStock(record, i);
                            console.log(`[${i + 1}/${symbols.length}] ${symbol}: ₹${quote.price} (${source})`);
                        } else {
                            failCount++;
                            console.error(`[${i + 1}/${symbols.length}] Failed: ${symbol}`);
                        }

                        // Update progress
                        writeProgress({
                            status: 'running',
                            current: i + 1,
                            total: symbols.length,
                            percent: Math.round(((i + 1) / symbols.length) * 100),
                            currentSymbol: symbol,
                            failed: failCount
                        });

                        // Sleep to avoid rate limits
                        await new Promise(r => setTimeout(r, SCRAPE_DELAY_MS));

                    } catch (e) {
                        failCount++;
                        console.error(`Err ${symbol}:`, e);
                    }
                }

                if (!stopped) {
                    // Mark complete
                    fs.writeFileSync(META_FILE, JSON.stringify({ lastRun: Date.now() }));
                    writeProgress({ status: 'done', current: symbols.length, total: symbols.length, percent: 100, currentSymbol: '', failed: failCount });
                    console.log("Daily update complete.");
                }
            }
        } else {
            console.log(`Scheduler sleeping...`);
        }

        await new Promise(r => setTimeout(r, BATCH_GAP_MS));
    }
}

startScrapingLoop().catch(console.error);
