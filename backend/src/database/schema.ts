import mongoose from 'mongoose';

const stockSchema = new mongoose.Schema({
    symbol: { type: String, required: true, unique: true, index: true },
    name: { type: String },
    price: { type: Number },
    currency: { type: String },
    exchange: { type: String },
    change: { type: Number },
    changePercent: { type: Number },
    marketCap: { type: Number },
    peRatio: { type: Number },
    week52High: { type: Number },
    week52Low: { type: Number },
    volume: { type: Number },
    eps: { type: Number },
    sector: { type: String },
    industry: { type: String },
    description: { type: String },
    website: { type: String },

    // Financials
    roe: { type: Number },
    roce: { type: Number },
    debtToEquity: { type: Number },
    bookValue: { type: Number },
    pbRatio: { type: Number },
    dividendYield: { type: Number },
    faceValue: { type: Number },

    // Valuation
    pegRatio: { type: Number },
    evToEbitda: { type: Number },

    // Margins
    netProfitMargin: { type: Number },
    operatingMargin: { type: Number },
    currentRatio: { type: Number },

    // Cash Flow
    operatingCashFlow: { type: Number },
    freeCashFlow: { type: Number },

    updatedAt: { type: Number, default: Date.now }
});

export const StockModel = mongoose.model('Stock', stockSchema);
