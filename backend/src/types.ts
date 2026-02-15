export interface StockQuote {
    symbol: string;
    name: string;
    price: number;
    currency: string;
    change: number;
    changePercent: number;
    marketCap?: number;
    peRatio?: number;
    pbRatio?: number;
    pegRatio?: number;
    evToEbitda?: number;
    eps?: number;
    roe?: number;
    roce?: number;
    dividendYield?: number;
    netProfitMargin?: number;
    operatingMargin?: number;
    debtToEquity?: number;
    currentRatio?: number;
    interestCoverage?: number;
    inventoryTurnover?: number;
    assetTurnover?: number;
    freeCashFlow?: number;
    operatingCashFlow?: number;
    bookValue?: number;
    faceValue?: number;
    high52Week?: number;
    low52Week?: number;
    // New Fields
    volume?: number;
    previousClose?: number;
    dayHigh?: number;
    dayLow?: number;
}

export interface FinancialQuarter {
    period: string;
    revenue: number;
    expenses: number;
    operatingProfit: number;
    otherIncome: number;
    interest: number;
    depreciation: number;
    tax: number;
    netProfit: number;
    eps: number;
}

export interface AnnualFinancials {
    year: string;
    revenue: number;
    expenses: number;
    operatingProfit: number;
    otherIncome: number;
    interest: number;
    depreciation: number;
    tax: number;
    netProfit: number;
    eps: number;
    dividendPayout?: number;
}

export interface BalanceSheet {
    year: string;
    shareCapital: number;
    reserves: number;
    borrowings: number;
    otherLiabilities: number;
    totalLiabilities: number;
    fixedAssets: number;
    cwip: number;
    investments: number;
    otherAssets: number;
    totalAssets: number;
}

export interface HistoricalPrice {
    date: string;
    open: number;
    high: number;
    low: number;
    close: number;
    volume: number;
}

export interface StockRecord {
    symbol: string;
    name: string;
    price: number;
    marketCap: number;
    peRatio: number;
    pbRatio?: number;
    pegRatio?: number;
    evToEbitda?: number;
    eps?: number;
    roe: number;
    roce: number;
    dividendYield?: number;
    netProfitMargin?: number;
    operatingMargin?: number;
    debtToEquity?: number;
    currentRatio?: number;
    interestCoverage?: number;
    inventoryTurnover?: number;
    assetTurnover?: number;
    freeCashFlow?: number;
    operatingCashFlow?: number;
    bookValue?: number;
    high52Week?: number;
    low52Week?: number;
    // New Fields
    volume?: number;
    previousClose?: number;
    dayHigh?: number;
    dayLow?: number;

    sector?: string;
    updatedAt: number;
}
