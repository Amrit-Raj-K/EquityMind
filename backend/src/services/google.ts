
import { StockQuote } from '../types.js';

export class GoogleService {

    constructor() {
        // No config needed for scraper
    }

    /**
     * Scrape a single symbol from Google Finance.
     * @param symbol Symbol in format "TCS.NS" (Yahoo) -> "TCS:NSE" (Google)
     */
    async getQuote(symbol: string): Promise<StockQuote | null> {
        const googleSymbol = symbol.replace('.NS', ':NSE').replace('.BO', ':BOM');
        const url = `https://www.google.com/finance/quote/${googleSymbol}?hl=en`;

        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                }
            });

            if (!response.ok) {
                console.error(`Google Finance scrape failed for ${symbol}: ${response.status}`);
                return null;
            }

            const html = await response.text();
            return this.parseHTML(symbol, html);

        } catch (error) {
            console.error(`Error scraping ${symbol}:`, error);
            return null;
        }
    }

    private parseHTML(symbol: string, html: string): StockQuote | null {
        // 1. Price
        const priceMatch = html.match(/<div class="YMlKec fxKbKc">([^<]+)<\/div>/);
        let price = 0;
        if (priceMatch && priceMatch[1]) {
            price = this.parseNumber(priceMatch[1]);
        } else {
            const looseMatch = html.match(/<div class="YMlKec">([^<]+)<\/div>/);
            if (looseMatch && looseMatch[1]) price = this.parseNumber(looseMatch[1]);
        }
        if (price === 0) return null;

        // 2. Name
        const nameMatch = html.match(/<div class="zzDege">([^<]+)<\/div>/);
        const name = (nameMatch && nameMatch[1]) ? nameMatch[1] : symbol;

        // 3. Stats Extraction (Market Cap, P/E, etc.)
        // Robust Regex: Matches Label (mfs7Fc) -> anything (spans, newlines) -> Value (P6K39c)
        const stats: any = {};

        // Find all label-value pairs. 
        // mfs7Fc = Label class (e.g. "Market cap")
        // P6K39c = Value class (e.g. "19.21T INR")
        const statPairs = html.matchAll(/class="[^"]*mfs7Fc[^"]*"[^>]*>([^<]+)<\/div>[\s\S]*?class="[^"]*P6K39c[^"]*"[^>]*>([^<]+)<\/div>/g);

        for (const match of statPairs) {
            const label = match[1].trim();
            const value = match[2].trim();
            stats[label] = value;
        }

        // 4. Secondary/Fallback Stats Extraction
        // Sometimes values are just in the next div without P6K39c, or different structure.
        if (Object.keys(stats).length === 0) {
            const secondaryRows = html.matchAll(/<div class="mfs7Fc">([^<]+)<\/div>[\s\S]*?<div class="[^"]+">([^<]+)<\/div>/g);
            for (const row of secondaryRows) {
                const label = row[1].trim();
                const value = row[2].trim();
                if (!stats[label]) stats[label] = value;
            }
        }

        if (stats['Year range']) stats['52-week range'] = stats['Year range'];
        if (stats['Day range']) stats['Day Low/High'] = stats['Day range'];
        if (stats['Previous close']) stats['Previous Close'] = stats['Previous close'];
        if (stats['Avg Volume']) stats['Avg volume'] = stats['Avg Volume'];

        return {
            symbol: symbol,
            name: name,
            price: price,
            currency: 'INR',
            change: this.parseNumber(stats['Change'] || '0'),
            changePercent: this.parseNumber(stats['Change %'] || '0'),
            marketCap: this.parseMarketCap(stats['Market cap'] || '0'),
            peRatio: this.parseNumber(stats['P/E ratio'] || '0'),
            dividendYield: this.parseNumber(stats['Dividend yield'] || '0'),
            high52Week: this.parseHighLow(stats['52-week range'], true),
            low52Week: this.parseHighLow(stats['52-week range'], false),
            // New Fields
            previousClose: this.parseNumber(stats['Previous Close'] || '0'),
            volume: this.parseMarketCap(stats['Avg volume'] || '0'), // Reuse Market Map logic for K/M/B suffixes
            dayHigh: this.parseHighLow(stats['Day Low/High'], true),
            dayLow: this.parseHighLow(stats['Day Low/High'], false),
            eps: this.parseNumber(stats['Earnings per share'] || '0'),
        };
    }

    private parseNumber(val: string): number {
        if (!val || val === '-') return 0;
        const clean = val.replace(/[^0-9.-]/g, '');
        const num = parseFloat(clean);
        return isNaN(num) ? 0 : num;
    }

    private parseMarketCap(val: string): number {
        if (!val || val === '-') return 0;
        let num = this.parseNumber(val);
        if (val.toUpperCase().includes('T')) num *= 1000000000000;
        else if (val.toUpperCase().includes('B')) num *= 1000000000;
        else if (val.toUpperCase().includes('M')) num *= 1000000;
        else if (val.toUpperCase().includes('L')) num *= 100000;
        else if (val.toUpperCase().includes('CR')) num *= 10000000;
        return num;
    }

    private parseHighLow(val: string | undefined, isHigh: boolean): number {
        if (!val) return 0;
        // Format: "₹1,234.56–₹2,345.67"
        const parts = val.split(/[–-]/); // Handles both en-dash and hyphen
        if (parts.length === 2) {
            return this.parseNumber(isHigh ? parts[1] : parts[0]);
        }
        return 0;
    }
}
