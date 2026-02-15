import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { StockService } from '../../services/stock.service';
import { switchMap } from 'rxjs/operators';

@Component({
    selector: 'app-stock-details',
    standalone: true,
    imports: [CommonModule, RouterModule],
    template: `
    <div *ngIf="stock" class="detail-page">
        <!-- Back link -->
        <a routerLink="/" class="back-link">← Back to Screener</a>

        <!-- Header -->
        <div class="detail-header">
            <div class="header-left">
                <h1 class="company-name">{{ stock.name }}</h1>
                <p class="company-meta">{{ stock.symbol }} • NSE</p>
            </div>
            <div class="header-right">
                <div class="price">₹{{ stock.price | number:'1.2-2' }}</div>
                <div class="change" [class.positive]="stock.change >= 0" [class.negative]="stock.change < 0">
                    {{ stock.change > 0 ? '+' : ''}}{{ stock.change | number:'1.2-2' }}
                    ({{ stock.changePercent | number:'1.2-2' }}%)
                </div>
            </div>
        </div>

        <!-- Key Metrics Grid -->
        <div class="metrics-grid">
            <div class="metric-card">
                <span class="metric-label">Market Cap</span>
                <span class="metric-value">₹{{ (stock.marketCap / 10000000) | number:'1.0-0' }}Cr</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">P/E Ratio</span>
                <span class="metric-value">{{ stock.peRatio | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">EPS</span>
                <span class="metric-value">₹{{ stock.eps | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">P/B Ratio</span>
                <span class="metric-value">{{ stock.pbRatio | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">ROE</span>
                <span class="metric-value">{{ stock.roe | number:'1.2-2' }}%</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">ROCE</span>
                <span class="metric-value">{{ stock.roce | number:'1.2-2' }}%</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">52W High</span>
                <span class="metric-value">₹{{ stock.high52Week | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">52W Low</span>
                <span class="metric-value">₹{{ stock.low52Week | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Div Yield</span>
                <span class="metric-value">{{ stock.dividendYield | number:'1.2-2' }}%</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Debt/Equity</span>
                <span class="metric-value">{{ stock.debtToEquity | number:'1.2-2' }}</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Net Margin</span>
                <span class="metric-value">{{ stock.netProfitMargin | number:'1.2-2' }}%</span>
            </div>
            <div class="metric-card">
                <span class="metric-label">Op Margin</span>
                <span class="metric-value">{{ stock.operatingMargin | number:'1.2-2' }}%</span>
            </div>
        </div>

        <!-- Quarterly Results -->
        <div class="fin-section" *ngIf="financials?.quarterly?.length">
            <h2 class="section-title">📊 Quarterly Results</h2>
            <div class="fin-table-scroll">
                <table class="fin-table">
                    <thead>
                        <tr>
                            <th class="row-label">Metric</th>
                            <th *ngFor="let q of financials.quarterly.slice(0,5)">{{ q.period | date:'MMM yyyy' }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="row-label">Revenue (Cr)</td>
                            <td *ngFor="let q of financials.quarterly.slice(0,5)">{{ (q.revenue / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Operating Profit</td>
                            <td *ngFor="let q of financials.quarterly.slice(0,5)">{{ (q.operatingProfit / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Net Profit</td>
                            <td *ngFor="let q of financials.quarterly.slice(0,5)">{{ (q.netProfit / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">EPS</td>
                            <td *ngFor="let q of financials.quarterly.slice(0,5)">{{ q.eps | number:'1.2-2' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Annual Financials -->
        <div class="fin-section" *ngIf="financials?.annual?.length">
            <h2 class="section-title">📈 Annual Financials</h2>
            <div class="fin-table-scroll">
                <table class="fin-table">
                    <thead>
                        <tr>
                            <th class="row-label">Metric</th>
                            <th *ngFor="let a of financials.annual">FY {{ a.year }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="row-label">Revenue (Cr)</td>
                            <td *ngFor="let a of financials.annual">{{ (a.revenue / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Op Profit (Cr)</td>
                            <td *ngFor="let a of financials.annual">{{ (a.operatingProfit / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Net Profit (Cr)</td>
                            <td *ngFor="let a of financials.annual">{{ (a.netProfit / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">EPS</td>
                            <td *ngFor="let a of financials.annual">{{ a.eps | number:'1.2-2' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Balance Sheet -->
        <div class="fin-section" *ngIf="financials?.balanceSheet?.length">
            <h2 class="section-title">🏦 Balance Sheet</h2>
            <div class="fin-table-scroll">
                <table class="fin-table">
                    <thead>
                        <tr>
                            <th class="row-label">Metric</th>
                            <th *ngFor="let b of financials.balanceSheet">FY {{ b.year }}</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="row-label">Total Assets (Cr)</td>
                            <td *ngFor="let b of financials.balanceSheet">{{ (b.totalAssets / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Total Liabilities</td>
                            <td *ngFor="let b of financials.balanceSheet">{{ (b.totalLiabilities / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Fixed Assets</td>
                            <td *ngFor="let b of financials.balanceSheet">{{ (b.fixedAssets / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Borrowings</td>
                            <td *ngFor="let b of financials.balanceSheet">{{ (b.borrowings / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                        <tr>
                            <td class="row-label">Reserves</td>
                            <td *ngFor="let b of financials.balanceSheet">{{ (b.reserves / 10000000) | number:'1.0-0' }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="fin-section" *ngIf="!financials?.quarterly?.length && !financials?.annual?.length && !financials?.balanceSheet?.length">
            <p class="no-data">Financial data not yet available for this stock.</p>
        </div>
    </div>

    <div *ngIf="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Loading stock details...</p>
    </div>
    <div *ngIf="error" class="error-state">{{ error }}</div>
  `,
    styles: [`
    .detail-page {
      max-width: 1100px; margin: 0 auto; padding: 24px 20px;
      font-family: 'Inter', 'Segoe UI', sans-serif; color: #e2e8f0;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }

    .back-link {
      display: inline-block; color: #60a5fa; text-decoration: none; font-size: 14px;
      margin-bottom: 20px; transition: color 0.2s;
    }
    .back-link:hover { color: #93bbfc; }

    /* Header */
    .detail-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      flex-wrap: wrap; gap: 16px; margin-bottom: 28px;
      padding-bottom: 20px; border-bottom: 1px solid #334155;
    }
    .company-name { margin: 0; font-size: 28px; font-weight: 800; color: #f1f5f9; }
    .company-meta { margin: 4px 0 0; font-size: 15px; color: #64748b; }
    .header-right { text-align: right; }
    .price { font-size: 32px; font-weight: 700; font-variant-numeric: tabular-nums; color: #f8fafc; }
    .change { font-size: 16px; font-weight: 600; margin-top: 2px; }
    .change.positive { color: #34d399; }
    .change.negative { color: #f87171; }

    /* Metrics Grid */
    .metrics-grid {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 28px;
    }
    @media (max-width: 768px) { .metrics-grid { grid-template-columns: repeat(2, 1fr); } }
    .metric-card {
      background: #1e293b; border: 1px solid #334155; border-radius: 10px;
      padding: 14px 16px; display: flex; flex-direction: column; gap: 6px;
      transition: border-color 0.2s;
    }
    .metric-card:hover { border-color: #475569; }
    .metric-label { font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .metric-value { font-size: 18px; font-weight: 700; color: #e2e8f0; font-variant-numeric: tabular-nums; }

    /* Financial Sections */
    .fin-section {
      background: #1e293b; border: 1px solid #334155; border-radius: 12px;
      padding: 20px; margin-bottom: 20px;
    }
    .section-title { font-size: 18px; font-weight: 700; color: #f1f5f9; margin: 0 0 16px; }

    .fin-table-scroll {
      overflow-x: auto;
      scrollbar-width: thin; scrollbar-color: #475569 #1e293b;
    }
    .fin-table-scroll::-webkit-scrollbar { height: 8px; }
    .fin-table-scroll::-webkit-scrollbar-track { background: #0f172a; border-radius: 4px; }
    .fin-table-scroll::-webkit-scrollbar-thumb { background: #475569; border-radius: 4px; }
    .fin-table-scroll::-webkit-scrollbar-thumb:hover { background: #64748b; }

    .fin-table { width: 100%; border-collapse: collapse; font-size: 14px; }
    .fin-table thead tr { background: #0f172a; }
    .fin-table th {
      padding: 10px 16px; font-size: 12px; font-weight: 700; color: #64748b;
      text-transform: uppercase; letter-spacing: 0.5px; white-space: nowrap;
      text-align: right; border-bottom: 2px solid #334155;
    }
    .fin-table th.row-label, .fin-table td.row-label { text-align: left; color: #94a3b8; font-weight: 600; }
    .fin-table td {
      padding: 10px 16px; white-space: nowrap; text-align: right;
      color: #cbd5e1; font-variant-numeric: tabular-nums;
      border-bottom: 1px solid rgba(51, 65, 85, 0.5);
    }
    .fin-table tbody tr:hover { background: rgba(59, 130, 246, 0.05); }

    .no-data { color: #475569; text-align: center; font-size: 15px; padding: 32px 0; }

    /* Loading / Error */
    .loading-state { text-align: center; padding: 80px 20px; color: #64748b; font-size: 16px; }
    .spinner {
      width: 36px; height: 36px; margin: 0 auto 16px; border-radius: 50%;
      border: 3px solid #334155; border-top-color: #3b82f6;
      animation: spin 0.8s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }
    .error-state { text-align: center; padding: 80px 20px; color: #f87171; font-size: 16px; }
  `]
})
export class StockDetailsComponent implements OnInit {
    stock: any;
    financials: any;
    loading = true;
    error = '';

    constructor(
        private route: ActivatedRoute,
        private stockService: StockService
    ) { }

    ngOnInit() {
        this.route.params.pipe(
            switchMap(params => {
                const ticker = params['ticker'];
                this.loading = true;
                return this.stockService.getStockDetails(ticker);
            })
        ).subscribe({
            next: (data) => {
                this.stock = data;
                this.loadFinancials(data.symbol);
                this.loading = false;
            },
            error: (err) => {
                this.error = 'Failed to load stock details';
                this.loading = false;
            }
        });
    }

    loadFinancials(symbol: string) {
        this.stockService.getFinancials(symbol).subscribe({
            next: (data) => this.financials = data
        });
    }
}
