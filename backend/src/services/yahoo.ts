import yahooFinance from 'yahoo-finance2';
import { StockQuote, FinancialQuarter, AnnualFinancials, BalanceSheet, HistoricalPrice } from '../types.js';

// @ts-ignore
const YFExport = yahooFinance.default || yahooFinance;
let yf: any;

try {
    // The library prompt says "Call new YahooFinance() first"
    const opts = { suppressNotices: ['yahooSurvey'] };

    if (typeof YFExport === 'function') {
        yf = new (YFExport as any)(opts);
    } else {
        yf = YFExport;
        // Attempt to suppress generally if possible, though 'new' is preferred
    }
} catch (e) {
    console.error("Yahoo Finance Init Error:", e);
    yf = YFExport; // Fallback
}

export class YahooService {

    private async withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
        let timer: any;
        const timeout = new Promise<T>((_, reject) => {
            timer = setTimeout(() => reject(new Error(`Timeout: ${label}`)), ms);
        });
        try {
            const res = await Promise.race([promise, timeout]);
            clearTimeout(timer);
            return res;
        } catch (e) {
            clearTimeout(timer);
            throw e;
        }
    }

    async getQuote(symbol: string): Promise<StockQuote> {
        try {
            // Use timeout to prevent infinite hang
            const [quote, summary] = await this.withTimeout(Promise.all([
                yf.quote(symbol),
                yf.quoteSummary(symbol, {
                    modules: ['summaryDetail', 'defaultKeyStatistics', 'financialData']
                })
            ]), 10000, `getQuote(${symbol})`);

            // ... (rest is same)

            const sd = summary?.summaryDetail || {};
            const ks = summary?.defaultKeyStatistics || {};
            const fd = summary?.financialData || {};

            return {
                symbol: quote.symbol,
                name: quote.longName || quote.shortName || symbol,
                price: quote.regularMarketPrice || 0,
                currency: quote.currency || 'INR',
                change: quote.regularMarketChange || 0,
                changePercent: quote.regularMarketChangePercent || 0,
                marketCap: sd.marketCap || quote.marketCap,
                peRatio: sd.trailingPE || ks.trailingPE || quote.trailingPE,
                pbRatio: sd.priceToBook || ks.priceToBook,
                pegRatio: ks.pegRatio,
                evToEbitda: ks.enterpriseToEbitda,
                eps: ks.trailingEps,
                roe: (fd.returnOnEquity || ks.returnOnEquity || 0) * 100,
                roce: (fd.returnOnAssets || 0) * 100, // Approximate ROCE with ROA
                dividendYield: sd.dividendYield || quote.dividendYield,
                netProfitMargin: (fd.profitMargins || 0) * 100,
                operatingMargin: (fd.operatingMargins || 0) * 100,
                debtToEquity: fd.debtToEquity,
                currentRatio: fd.currentRatio,
                freeCashFlow: fd.freeCashflow,
                operatingCashFlow: fd.operatingCashflow,
                bookValue: ks.bookValue,
                high52Week: sd.fiftyTwoWeekHigh || quote.fiftyTwoWeekHigh,
                low52Week: sd.fiftyTwoWeekLow || quote.fiftyTwoWeekLow,
                // Extended Metrics
                volume: quote.regularMarketVolume,
                previousClose: quote.regularMarketPreviousClose,
                dayHigh: quote.regularMarketDayHigh,
                dayLow: quote.regularMarketDayLow,
            };
        } catch (error) {
            console.error(`Error fetching quote for ${symbol}:`, error);
            throw error;
        }
    }

    private _parseDate(d: any): string {
        if (d instanceof Date) return d.toISOString().split('T')[0];
        if (typeof d === 'number') return new Date(d * 1000).toISOString().split('T')[0];
        return String(d);
    }

    async getQuarterlyResults(symbol: string): Promise<FinancialQuarter[]> {
        try {
            if (!yf.fundamentalsTimeSeries) return [];

            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 2);

            const data = await yf.fundamentalsTimeSeries(symbol, {
                period1: startDate.toISOString().split('T')[0],
                type: 'quarterly',
                module: 'financials'
            }, { validateResult: false });

            return (data || []).filter((q: any) => q.totalRevenue || q.netIncome || q.operatingIncome).map((q: any) => ({
                period: this._parseDate(q.date),
                revenue: q.totalRevenue || 0,
                expenses: q.operatingExpense || q.totalExpenses || 0,
                operatingProfit: q.operatingIncome || 0,
                otherIncome: q.otherIncomeExpense || 0,
                interest: q.interestExpense || 0,
                depreciation: q.reconciledDepreciation || q.depreciationAmortizationDepletionIncomeStatement || 0,
                tax: q.taxProvision || 0,
                netProfit: q.netIncome || 0,
                eps: q.basicEPS || q.dilutedEPS || 0
            }));
        } catch (e) {
            console.error('Error fetching quarterly results', e);
            return [];
        }
    }

    async getAnnualFinancials(symbol: string): Promise<AnnualFinancials[]> {
        try {
            if (!yf.fundamentalsTimeSeries) return [];

            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 5);

            const data = await yf.fundamentalsTimeSeries(symbol, {
                period1: startDate.toISOString().split('T')[0],
                type: 'annual',
                module: 'financials'
            }, { validateResult: false });

            return (data || []).filter((q: any) => q.totalRevenue || q.netIncome || q.operatingIncome).map((q: any) => ({
                year: this._parseDate(q.date).substring(0, 4),
                revenue: q.totalRevenue || 0,
                expenses: q.operatingExpense || q.totalExpenses || 0,
                operatingProfit: q.operatingIncome || 0,
                otherIncome: q.otherIncomeExpense || 0,
                interest: q.interestExpense || 0,
                depreciation: q.reconciledDepreciation || q.depreciationAmortizationDepletionIncomeStatement || 0,
                tax: q.taxProvision || 0,
                netProfit: q.netIncome || 0,
                eps: q.basicEPS || q.dilutedEPS || 0
            }));
        } catch (e) {
            console.error('Error fetching annual financials', e);
            return [];
        }
    }

    async getBalanceSheet(symbol: string): Promise<BalanceSheet[]> {
        try {
            if (!yf.fundamentalsTimeSeries) return [];

            const startDate = new Date();
            startDate.setFullYear(startDate.getFullYear() - 5);

            const data = await yf.fundamentalsTimeSeries(symbol, {
                period1: startDate.toISOString().split('T')[0],
                type: 'annual',
                module: 'balance-sheet'
            }, { validateResult: false });

            return (data || []).filter((q: any) => q.totalAssets || q.stockholdersEquity).map((q: any) => ({
                year: this._parseDate(q.date).substring(0, 4),
                shareCapital: q.capitalStock || q.commonStock || 0,
                reserves: q.retainedEarnings || 0,
                borrowings: q.longTermDebt || q.totalDebt || 0,
                otherLiabilities: (q.totalLiabilitiesNetMinorityInterest || 0) - (q.longTermDebt || 0),
                totalLiabilities: q.totalLiabilitiesNetMinorityInterest || 0,
                fixedAssets: q.netPPE || 0,
                cwip: q.constructionInProgress || 0,
                investments: q.investmentsAndAdvances || 0,
                otherAssets: (q.totalAssets || 0) - (q.netPPE || 0) - (q.investmentsAndAdvances || 0),
                totalAssets: q.totalAssets || 0
            }));
        } catch (e) {
            console.error('Error fetching balance sheet', e);
            return [];
        }
    }

    async getHistoricalPrices(symbol: string, range: string = '1y'): Promise<HistoricalPrice[]> {
        const today = new Date();
        const startDate = new Date();
        if (range === '1mo') startDate.setMonth(today.getMonth() - 1);
        else if (range === '1y') startDate.setFullYear(today.getFullYear() - 1);
        else if (range === '3y') startDate.setFullYear(today.getFullYear() - 3);
        else if (range === '5y') startDate.setFullYear(today.getFullYear() - 5);
        else startDate.setFullYear(today.getFullYear() - 10);

        try {
            const result = await yf.historical(symbol, {
                period1: startDate.toISOString().split('T')[0],
                interval: '1d'
            });

            return result.map((r: any) => ({
                date: r.date.toISOString().split('T')[0],
                open: r.open,
                high: r.high,
                low: r.low,
                close: r.close,
                volume: r.volume
            }));
        } catch (e) {
            console.error(`Failed to fetch historical data for ${symbol}`, e);
            return [];
        }
    }

    async searchParams(query: string): Promise<{ symbol: string; name: string }[]> {
        // Simple search directly via API if needed, or we can use our CacheService for local search
        // For "searchParams" usually implies searching the universe
        return [];
    }

    async searchLive(query: string) {
        const results = await yf.search(query);
        return results.quotes
            .filter((q: any) => q.isYahooFinance === true && (q.exchange === 'NSI' || q.exchange === 'BSE'))
            .map((q: any) => ({
                symbol: q.symbol,
                name: q.longname || q.shortname || q.symbol
            }));
    }
}
