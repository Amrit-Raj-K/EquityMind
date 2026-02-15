import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { StockService, Stock } from '../../services/stock.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-market-overview',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="screener-page">

      <!-- Page Header -->
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">Stock Screener</h1>
          <p class="page-subtitle">{{ filteredStocks.length | number }} of {{ allStocks.length | number }} stocks</p>
        </div>
        <div class="header-actions">
          <button (click)="forceUpdate()" class="force-update-btn" [disabled]="updating">
            <span class="update-icon" [class.spinning]="updating">↻</span>
            {{ updating ? 'Updating ' + updateProgress?.percent + '%' : 'Clean Update' }}
          </button>
          
          <div class="status-indicator" *ngIf="updating && updateProgress">
             <span class="pulse"></span> 
             Processing: {{ updateProgress.current }}/{{ updateProgress.total }} 
             <span class="symbol-tag" *ngIf="updateProgress.currentSymbol">{{ updateProgress.currentSymbol }}</span>
          </div>
        </div>
      </div>

      <!-- Filters & Search -->
      <div class="controls-bar">
        <div class="search-wrapper">
          <span class="search-icon">🔍</span>
          <input type="text" [(ngModel)]="searchQuery" (input)="filterStocks()" 
                 placeholder="Search by name or symbol..." class="search-input">
        </div>

        <div class="controls-right">
            <div class="exchange-toggle">
                <button *ngFor="let ex of exchanges" 
                        (click)="setExchange(ex.value)"
                        [class.active]="selectedExchange === ex.value">
                    {{ ex.label }}
                </button>
            </div>
            
            <button class="filters-btn" (click)="showFilters = !showFilters" [class.active]="showFilters">
                <span class="filter-icon">⚡</span> Filters
            </button>
        </div>
      </div>

      <!-- Preset Filters -->
      <div class="presets-bar">
        <button *ngFor="let p of presets" 
                (click)="applyPreset(p)" 
                class="preset-chip" 
                [class.active]="activePreset === p.name">
            {{ p.name }}
        </button>
      </div>

      <!-- Advanced Filters Panel -->
      <div class="filters-panel" *ngIf="showFilters">
        <div class="filters-grid">
            <div class="filter-group">
                <label>Market Cap (Cr)</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.marketCapMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.marketCapMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
            <div class="filter-group">
                <label>P/E Ratio</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.peMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.peMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
            <div class="filter-group">
                <label>Price (₹)</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.priceMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.priceMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
            <div class="filter-group">
                <label>Div Yield (%)</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.divYieldMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.divYieldMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
            <div class="filter-group">
                <label>ROE (%)</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.roeMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.roeMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
             <div class="filter-group">
                <label>ROCE (%)</label>
                <div class="range-inputs">
                    <input type="number" [(ngModel)]="filters.roceMin" (ngModelChange)="filterStocks()" placeholder="Min">
                    <input type="number" [(ngModel)]="filters.roceMax" (ngModelChange)="filterStocks()" placeholder="Max">
                </div>
            </div>
        </div>
        <div class="filter-actions">
           <button class="clear-filters-btn" (click)="clearFilters()">Clear All Filters</button>
        </div>
      </div>

      <!-- Top Scrollbar (Synced) -->
      <div class="table-container-wrapper">
          <div #topScroll class="top-scroll" (scroll)="onTopScroll()">
            <div [style.width.px]="tableWidth"></div>
          </div>

          <!-- Data Table -->
          <div class="table-container">
            <div #tableScroll class="table-scroll" 
                 style="cursor: grab;"
                 (scroll)="onTableScroll()" 
                 (mousedown)="onMouseDown($event)"
                 (mouseleave)="onMouseLeave()"
                 (mouseup)="onMouseUp()"
                 (mousemove)="onMouseMove($event)">
              <table #dataTable class="data-table">
                <thead>
                  <tr>
                    <th class="sticky-col" (click)="sortBy('name')">
                      <div class="th-content">Company <span class="sort-icon">{{ getSortIcon('name') }}</span></div>
                    </th>
                    <th (click)="sortBy('price')">
                      <div class="th-content">Price <span class="sort-icon">{{ getSortIcon('price') }}</span></div>
                    </th>
                    <th (click)="sortBy('changePercent')">
                      <div class="th-content">Change <span class="sort-icon">{{ getSortIcon('changePercent') }}</span></div>
                    </th>
                    <th (click)="sortBy('marketCap')">
                      <div class="th-content">Mkt Cap (Cr) <span class="sort-icon">{{ getSortIcon('marketCap') }}</span></div>
                    </th>
                    <th (click)="sortBy('peRatio')">
                      <div class="th-content">P/E <span class="sort-icon">{{ getSortIcon('peRatio') }}</span></div>
                    </th>
                    <th (click)="sortBy('pbRatio')">
                      <div class="th-content">P/B <span class="sort-icon">{{ getSortIcon('pbRatio') }}</span></div>
                    </th>
                    <th (click)="sortBy('pegRatio')">
                      <div class="th-content">PEG <span class="sort-icon">{{ getSortIcon('pegRatio') }}</span></div>
                    </th>
                    <th (click)="sortBy('evToEbitda')">
                      <div class="th-content">EV/EBITDA <span class="sort-icon">{{ getSortIcon('evToEbitda') }}</span></div>
                    </th>
                    <th (click)="sortBy('dividendYield')">
                      <div class="th-content">Div Yield <span class="sort-icon">{{ getSortIcon('dividendYield') }}</span></div>
                    </th>
                    <th (click)="sortBy('eps')">
                      <div class="th-content">EPS <span class="sort-icon">{{ getSortIcon('eps') }}</span></div>
                    </th>
                    <th (click)="sortBy('roe')">
                      <div class="th-content">ROE <span class="sort-icon">{{ getSortIcon('roe') }}</span></div>
                    </th>
                    <th (click)="sortBy('roce')">
                      <div class="th-content">ROCE <span class="sort-icon">{{ getSortIcon('roce') }}</span></div>
                    </th>
                    <th (click)="sortBy('netProfitMargin')">
                      <div class="th-content">Net Margin <span class="sort-icon">{{ getSortIcon('netProfitMargin') }}</span></div>
                    </th>
                    <th (click)="sortBy('operatingMargin')">
                      <div class="th-content">Op Margin <span class="sort-icon">{{ getSortIcon('operatingMargin') }}</span></div>
                    </th>
                    <th (click)="sortBy('debtToEquity')">
                      <div class="th-content">D/E <span class="sort-icon">{{ getSortIcon('debtToEquity') }}</span></div>
                    </th>
                    <th (click)="sortBy('currentRatio')">
                      <div class="th-content">Current R <span class="sort-icon">{{ getSortIcon('currentRatio') }}</span></div>
                    </th>
                    <th (click)="sortBy('freeCashFlow')">
                       <div class="th-content">FCF <span class="sort-icon">{{ getSortIcon('freeCashFlow') }}</span></div>
                    </th>
                    <th (click)="sortBy('operatingCashFlow')">
                       <div class="th-content">OCF <span class="sort-icon">{{ getSortIcon('operatingCashFlow') }}</span></div>
                    </th>
                     <th (click)="sortBy('bookValue')">
                       <div class="th-content">Book Val <span class="sort-icon">{{ getSortIcon('bookValue') }}</span></div>
                    </th>
                    <th (click)="sortBy('high52Week')">
                       <div class="th-content">52W High <span class="sort-icon">{{ getSortIcon('high52Week') }}</span></div>
                    </th>
                    <th (click)="sortBy('low52Week')">
                       <div class="th-content">52W Low <span class="sort-icon">{{ getSortIcon('low52Week') }}</span></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr *ngFor="let stock of paginatedStocks; trackBy: trackStock" class="data-row">
                    <td class="sticky-col company-cell">
                      <a [routerLink]="['/company', stock.symbol]" class="company-link">
                        <span class="company-name">{{ stock.name || cleanSymbol(stock.symbol) }}</span>
                        <span class="company-symbol">{{ cleanSymbol(stock.symbol) }}</span>
                      </a>
                    </td>
                    <td class="price-cell">₹{{ stock.price | number:'1.2-2' }}</td>
                    <td [class]="getChangeClass(stock)">
                      <div class="change-cell">
                        <span class="change-arrow">{{ stock.changePercent > 0 ? '▲' : stock.changePercent < 0 ? '▼' : '' }}</span>
                        {{ stock.changePercent | number:'1.2-2' }}%
                      </div>
                    </td>
                    <td class="num-cell">{{ formatMarketCap(stock.marketCap) }}</td>
                    <td class="num-cell" [class.dim]="!stock.peRatio">{{ stock.peRatio ? (stock.peRatio | number:'1.1-1') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.pbRatio">{{ stock.pbRatio ? (stock.pbRatio | number:'1.2-2') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.pegRatio">{{ stock.pegRatio ? (stock.pegRatio | number:'1.2-2') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.evToEbitda">{{ stock.evToEbitda ? (stock.evToEbitda | number:'1.1-1') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.dividendYield">{{ stock.dividendYield ? (stock.dividendYield | number:'1.2-2') + '%' : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.eps">{{ stock.eps ? (stock.eps | number:'1.1-1') : '—' }}</td>
                    <td class="num-cell" [class.highlight-good]="(stock.roe || 0) > 15" [class.dim]="!stock.roe">{{ stock.roe ? (stock.roe | number:'1.1-1') + '%' : '—' }}</td>
                    <td class="num-cell" [class.highlight-good]="(stock.roce || 0) > 15" [class.dim]="!stock.roce">{{ stock.roce ? (stock.roce | number:'1.1-1') + '%' : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.netProfitMargin">{{ stock.netProfitMargin ? (stock.netProfitMargin | number:'1.1-1') + '%' : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.operatingMargin">{{ stock.operatingMargin ? (stock.operatingMargin | number:'1.1-1') + '%' : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.debtToEquity">{{ stock.debtToEquity ? (stock.debtToEquity | number:'1.2-2') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.currentRatio">{{ stock.currentRatio ? (stock.currentRatio | number:'1.2-2') : '—' }}</td>
                    <td class="num-cell" [class.dim]="!stock.freeCashFlow">{{ formatCompactValue(stock.freeCashFlow || 0) }}</td>
                    <td class="num-cell" [class.dim]="!stock.operatingCashFlow">{{ formatCompactValue(stock.operatingCashFlow || 0) }}</td>
                    <td class="num-cell">{{ stock.bookValue ? '₹' + (stock.bookValue | number:'1.0-0') : '—' }}</td>
                    <td class="num-cell">{{ stock.high52Week ? '₹' + (stock.high52Week | number:'1.0-0') : '—' }}</td>
                    <td class="num-cell">{{ stock.low52Week ? '₹' + (stock.low52Week | number:'1.0-0') : '—' }}</td>
                  </tr>
                  <tr *ngIf="filteredStocks.length === 0 && !loading">
                    <td colspan="25" class="empty-state">
                      <div class="empty-content">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" class="empty-icon">
                          <path d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                        <p>No stocks match your filters</p>
                        <button (click)="clearFilters()" class="clear-filters-btn">Clear Filters</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
      </div>

      <!-- Loading State -->
      <div *ngIf="loading" class="loading-state">
          <div class="spinner"></div>
          <p>Loading stocks...</p>
      </div>

      <!-- Pagination -->
      <div class="pagination" *ngIf="filteredStocks.length > 0">
        <div class="page-size-selector">
          <span class="per-page-label">Rows per page:</span>
          <select (change)="updatePageSize($any($event).target.value)" [value]="pageSize" class="page-size-select">
            <option value="20">20</option>
            <option value="50">50</option>
            <option value="100">100</option>
          </select>
        </div>
        
        <div class="pagination-controls">
          <button (click)="changePage(currentPage - 1)" 
                  [disabled]="currentPage === 1" 
                  class="page-btn">
            Prev
          </button>
          <span class="page-num">Page {{ currentPage }} of {{ totalPages }}</span>
          <button (click)="changePage(currentPage + 1)" 
                  [disabled]="currentPage === totalPages" 
                  class="page-btn">
            Next
          </button>
        </div>
      </div>

    </div>
  `,
  styles: [`
    .screener-page { padding: 24px; max-width: 100vw; overflow-x: hidden; font-family: 'Inter', sans-serif; color: #e2e8f0; }

    /* --- Header --- */
    .page-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; }
    .page-title { font-size: 28px; font-weight: 700; color: #f8fafc; margin: 0; letter-spacing: -0.5px; }
    .page-subtitle { color: #94a3b8; font-size: 14px; margin-top: 4px; }
    
    .header-actions { display: flex; gap: 12px; align-items: center; }
    .force-update-btn {
        background: #1e293b; border: 1px solid #334155; color: #94a3b8;
        padding: 8px 16px; border-radius: 8px; font-size: 13px; font-weight: 500;
        cursor: pointer; display: flex; align-items: center; gap: 8px; transition: all 0.2s;
    }
    .force-update-btn:hover:not(:disabled) { background: #334155; color: #fff; border-color: #475569; }
    .force-update-btn:disabled { opacity: 0.6; cursor: not-allowed; }
    .update-icon { display: inline-block; font-size: 16px; }
    .spinning { animation: spin 1s linear infinite; }
    @keyframes spin { 100% { transform: rotate(360deg); } }
    
    .status-indicator {
        display: flex; align-items: center; gap: 8px; font-size: 12px; color: #38bdf8;
        background: rgba(56, 189, 248, 0.1); padding: 6px 12px; border-radius: 20px; border: 1px solid rgba(56, 189, 248, 0.2);
    }
    .pulse { width: 8px; height: 8px; background: #38bdf8; border-radius: 50%; animation: pulse 1.5s infinite; }
    @keyframes pulse { 0% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0.4); } 70% { box-shadow: 0 0 0 6px rgba(56, 189, 248, 0); } 100% { box-shadow: 0 0 0 0 rgba(56, 189, 248, 0); } }
    .symbol-tag { background: #0f172a; padding: 2px 6px; border-radius: 4px; font-family: monospace; }

    /* --- Controls Bar --- */
    .controls-bar {
        display: flex; justify-content: space-between; align-items: center; gap: 16px; margin-bottom: 20px;
        background: #1e293b; padding: 12px 16px; border-radius: 12px; border: 1px solid #334155;
    }
    .search-wrapper { position: relative; flex: 1; max-width: 400px; }
    .search-icon { position: absolute; left: 12px; top: 50%; transform: translateY(-50%); color: #64748b; font-size: 16px; }
    .search-input {
        width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff;
        padding: 10px 12px 10px 36px; border-radius: 8px; font-size: 14px; outline: none; transition: border-color 0.2s;
    }
    .search-input:focus { border-color: #3b82f6; }

    .controls-right { display: flex; gap: 12px; align-items: center; }
    
    .exchange-toggle {
        display: flex; background: #0f172a; border-radius: 8px; padding: 2px; border: 1px solid #334155;
    }
    .exchange-toggle button {
        background: transparent; border: none; color: #64748b; padding: 6px 12px;
        font-size: 13px; font-weight: 500; cursor: pointer; border-radius: 6px; transition: all 0.2s;
    }
    .exchange-toggle button.active { background: #3b82f6; color: #fff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); }
    
    .filters-btn {
        background: #3b82f6; color: #fff; border: none; padding: 8px 16px; border-radius: 8px;
        font-size: 14px; font-weight: 500; cursor: pointer; display: flex; align-items: center; gap: 6px;
        transition: background 0.2s;
    }
    .filters-btn:hover { background: #2563eb; }
    .filters-btn.active { background: #2563eb; box-shadow: inset 0 2px 4px rgba(0,0,0,0.2); }

    /* --- Presets --- */
    .presets-bar { display: flex; gap: 8px; margin-bottom: 20px; overflow-x: auto; padding-bottom: 4px; }
    .preset-chip {
        background: #1e293b; border: 1px solid #334155; color: #94a3b8; padding: 5px 12px;
        border-radius: 20px; font-size: 12px; font-weight: 500; cursor: pointer; white-space: nowrap; transition: all 0.2s;
    }
    .preset-chip:hover { border-color: #64748b; color: #cbd5e1; }
    .preset-chip.active { background: rgba(59, 130, 246, 0.1); border-color: #3b82f6; color: #3b82f6; }

    /* --- Filters Panel --- */
    .filters-panel {
        background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 20px; margin-bottom: 24px;
        animation: slideDown 0.2s ease-out;
    }
    @keyframes slideDown { from { opacity: 0; transform: translateY(-10px); } to { opacity: 1; transform: translateY(0); } }
    .filters-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin-bottom: 16px; }
    .filter-group label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; font-weight: 500; }
    .range-inputs { display: flex; gap: 8px; }
    .range-inputs input {
        width: 100%; background: #0f172a; border: 1px solid #334155; color: #fff;
        padding: 8px; border-radius: 6px; font-size: 13px; outline: none;
    }
    .range-inputs input:focus { border-color: #3b82f6; }
    .filter-actions { display: flex; justify-content: flex-end; }
    .clear-filters-btn { background: transparent; border: none; color: #ef4444; font-size: 13px; cursor: pointer; font-weight: 500; }
    .clear-filters-btn:hover { text-decoration: underline; }

    /* --- Table Layout --- */
    .table-container-wrapper {
        position: relative;
        background: #1e293b;
        border: 1px solid #334155;
        border-radius: 12px;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }

    .top-scroll {
        overflow-x: auto;
        overflow-y: hidden;
        height: 14px; 
        background: #0f172a; 
        border-bottom: 1px solid #334155; flex-shrink: 0;
        scrollbar-width: auto; /* Ensure it's visible */
        scrollbar-color: #475569 #0f172a;
    }
    .top-scroll::-webkit-scrollbar { height: 14px; }
    .top-scroll::-webkit-scrollbar-track { background: #0f172a; }
    .top-scroll::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 7px; border: 3px solid #0f172a; }
    .top-scroll::-webkit-scrollbar-thumb:hover { background-color: #64748b; }

    .table-container {
        position: relative;
        overflow: hidden; /* Hide default scroll here? No, we need it */
        border: none;
        background: #1e293b;
    }
    
    .table-scroll {
        overflow-x: auto;
        width: 100%;
        scrollbar-width: thin;
        scrollbar-color: #475569 #1e293b;
    }
    .table-scroll::-webkit-scrollbar { height: 10px; }
    .table-scroll::-webkit-scrollbar-track { background: #1e293b; }
    .table-scroll::-webkit-scrollbar-thumb { background-color: #475569; border-radius: 10px; border: 2px solid #1e293b; }
    .table-scroll::-webkit-scrollbar-thumb:hover { background-color: #64748b; }
    
    .data-table {
        width: max-content; 
        border-collapse: collapse; min-width: 100%;
        text-align: left;
    }
    
    th, td { padding: 10px 14px; border-bottom: 1px solid #334155; font-size: 13px; white-space: nowrap; }
    th {
        background: #0f172a; color: #94a3b8; font-weight: 600; cursor: pointer;
        position: sticky; top: 0; z-index: 10; user-select: none;
    }
    th:hover { color: #f8fafc; background: #1e293b; }
    .th-content { display: flex; align-items: center; gap: 6px; }
    .sort-icon { font-size: 10px; color: #64748b; }
    
    tr:hover td { background: #1e293b; }
    
    /* Sticky Columns */
    .sticky-col { position: sticky; left: 0; background: #1e293b; z-index: 20; border-right: 1px solid #334155; box-shadow: 2px 0 5px rgba(0,0,0,0.1); }
    th.sticky-col { z-index: 30; background: #0f172a; }
    
    .company-cell { min-width: 180px; max-width: 220px; }
    .company-link { text-decoration: none; display: flex; flex-direction: column; }
    .company-name { color: #38bdf8; font-weight: 600; overflow: hidden; text-overflow: ellipsis; }
    .company-symbol { color: #64748b; font-size: 11px; margin-top: 2px; }
    
    .price-cell { font-family: monospace; font-weight: 600; color: #f1f5f9; text-align: right; }
    
    .change-cell { display: flex; align-items: center; justify-content: flex-end; gap: 4px; font-weight: 600; font-family: monospace; }
    .change-positive { color: #4ade80; }
    .change-negative { color: #ef4444; }
    .change-neutral { color: #94a3b8; }
    .change-arrow { font-size: 10px; }
    
    .num-cell { text-align: right; font-family: monospace; color: #cbd5e1; }
    .dim { color: #64748b; }
    .highlight-good { color: #4ade80; font-weight: 500; }
    
    tr:last-child td { border-bottom: none; }
    
    .empty-state { text-align: center; padding: 48px; color: #64748b; }
    .empty-icon { width: 48px; height: 48px; margin-bottom: 16px; opacity: 0.5; }
    .empty-content { display: flex; flex-direction: column; align-items: center; gap: 12px; }

    .loading-state { text-align: center; padding: 40px; color: #94a3b8; }
    .spinner {
        width: 24px; height: 24px; border: 3px solid rgba(255,255,255,0.1); border-top-color: #3b82f6;
        border-radius: 50%; animation: spin 1s linear infinite; margin: 0 auto 12px;
    }
    
    /* --- Pagination --- */
    .pagination {
        display: flex; justify-content: space-between; align-items: center;
        background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 12px 16px;
    }
    .pagination-controls { display: flex; align-items: center; gap: 12px; }
    .page-btn {
        background: transparent; border: 1px solid #334155; border-radius: 6px;
        color: #94a3b8; cursor: pointer; font-size: 14px; padding: 6px 12px; transition: all 0.2s;
    }
    .page-btn:hover:not(:disabled) { border-color: #3b82f6; color: #3b82f6; }
    .page-btn:disabled { opacity: 0.3; cursor: not-allowed; }
    .page-num { color: #e2e8f0; font-size: 13px; font-weight: 600; padding: 0 8px; }
    
    .page-size-selector { display: flex; align-items: center; gap: 8px; }
    .page-size-select {
        background: #0f172a; border: 1px solid #334155; border-radius: 6px;
        padding: 6px 8px; color: #e2e8f0; font-size: 13px; outline: none; cursor: pointer;
    }
    .per-page-label { color: #64748b; font-size: 13px; }
    
    @media(max-width: 768px) {
        .page-header { flex-direction: column; align-items: flex-start; gap: 12px; }
        .controls-bar { flex-direction: column; align-items: stretch; }
        .search-wrapper { max-width: none; }
        .filters-grid { grid-template-columns: 1fr 1fr; }
        .pagination { flex-direction: column; gap: 12px; }
    }
  `]
})
export class MarketOverviewComponent implements OnInit, AfterViewInit {
  allStocks: Stock[] = [];
  filteredStocks: Stock[] = [];
  paginatedStocks: Stock[] = [];
  searchQuery = '';
  loading = true;
  selectedExchange = '';
  showFilters = false;
  activePreset = '';

  // Sorting
  sortColumn = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  // Pagination
  currentPage = 1;
  pageSize = 50;
  totalPages = 1;

  // Filter values
  filters: any = {
    marketCapMin: null, marketCapMax: null,
    peMin: null, peMax: null,
    priceMin: null, priceMax: null,
    divYieldMin: null, divYieldMax: null,
    roeMin: null, roeMax: null,
    roceMin: null, roceMax: null
  };

  exchanges = [
    { label: 'All', value: '' },
    { label: 'NSE', value: 'NSE' },
    { label: 'BSE', value: 'BSE' }
  ];

  presets = [
    { name: 'Large Cap', filters: { marketCapMin: 20000 } },
    { name: 'Mid Cap', filters: { marketCapMin: 5000, marketCapMax: 20000 } },
    { name: 'Small Cap', filters: { marketCapMax: 5000 } },
    { name: 'High Dividend', filters: { divYieldMin: 2 } },
    { name: 'Low PE', filters: { peMin: 0, peMax: 15 } },
    { name: 'High ROE', filters: { roeMin: 15 } },
    { name: 'Penny Stocks', filters: { priceMax: 50 } }
  ];

  @ViewChild('topScroll') topScroll?: ElementRef;
  @ViewChild('tableScroll') tableScroll?: ElementRef;
  @ViewChild('dataTable') dataTable?: ElementRef;

  tableWidth = 0;
  private isSyncingLeft = false;
  private isSyncingTop = false;

  // Updating logic
  updating = false;
  updateProgress: any = null;

  constructor(private stockService: StockService) { }

  ngOnInit() {
    this.loadStocks();
    this.stockService.dataUpdated$.subscribe(() => {
      console.log('Data updated — auto-refreshing...');
      this.loadStocks();
    });
  }

  ngAfterViewInit() {
    this.checkScroll();
  }

  @HostListener('window:resize')
  onResize() {
    this.checkScroll();
  }

  checkScroll() {
    setTimeout(() => {
      if (this.dataTable && this.dataTable.nativeElement) {
        this.tableWidth = this.dataTable.nativeElement.scrollWidth;
      }
    }, 0);
  }

  onTopScroll() {
    if (this.isSyncingLeft) {
      this.isSyncingLeft = false;
      return;
    }
    if (this.topScroll && this.tableScroll) {
      this.isSyncingTop = true;
      this.tableScroll.nativeElement.scrollLeft = this.topScroll.nativeElement.scrollLeft;
    }
  }

  onTableScroll() {
    if (this.isSyncingTop) {
      this.isSyncingTop = false;
      return;
    }
    if (this.topScroll && this.tableScroll) {
      this.isSyncingLeft = true;
      this.topScroll.nativeElement.scrollLeft = this.tableScroll.nativeElement.scrollLeft;
    }
  }

  loadStocks() {
    this.loading = true;
    const exchange = this.selectedExchange || undefined;
    this.stockService.getStocks(undefined, exchange).subscribe({
      next: (data) => {
        this.allStocks = data;
        // Re-apply current preset if any, else default filters
        if (this.activePreset) {
          const p = this.presets.find(p => p.name === this.activePreset);
          if (p) Object.assign(this.filters, p.filters);
        }
        this.applyFilters();
        this.loading = false;
        this.checkScroll();
      },
      error: (err) => {
        console.error(err);
        this.loading = false;
      }
    });
  }

  setExchange(value: string) {
    this.selectedExchange = value;
    this.currentPage = 1;
    this.loadStocks();
  }

  filterStocks() {
    this.applyFilters();
  }

  applyFilters() {
    let stocks = [...this.allStocks];

    // Text search
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      stocks = stocks.filter(s =>
        s.symbol.toLowerCase().includes(q) ||
        (s.name || '').toLowerCase().includes(q)
      );
    }

    // Range filters
    const f = this.filters;
    stocks = stocks.filter(s => {
      const mcapCr = (s.marketCap || 0) / 10000000;
      if (f.marketCapMin != null && mcapCr < f.marketCapMin) return false;
      if (f.marketCapMax != null && mcapCr > f.marketCapMax) return false;
      if (f.peMin != null && (s.peRatio || 0) < f.peMin) return false;
      if (f.peMax != null && (s.peRatio || 0) > f.peMax) return false;
      if (f.priceMin != null && s.price < f.priceMin) return false;
      if (f.priceMax != null && s.price > f.priceMax) return false;
      if (f.divYieldMin != null && (s.dividendYield || 0) < f.divYieldMin) return false;
      if (f.divYieldMax != null && (s.dividendYield || 0) > f.divYieldMax) return false;
      if (f.roeMin != null && (s.roe || 0) < f.roeMin) return false;
      if (f.roeMax != null && (s.roe || 0) > f.roeMax) return false;
      if (f.roceMin != null && (s.roce || 0) < f.roceMin) return false;
      if (f.roceMax != null && (s.roce || 0) > f.roceMax) return false;
      return true;
    });

    // Sort
    if (this.sortColumn) {
      stocks.sort((a: any, b: any) => {
        const valA = a[this.sortColumn] || 0;
        const valB = b[this.sortColumn] || 0;
        if (typeof valA === 'string') return this.sortDirection === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        return this.sortDirection === 'asc' ? valA - valB : valB - valA;
      });
    }

    this.filteredStocks = stocks;
    const size = Number(this.pageSize) || 50;
    this.totalPages = Math.ceil(stocks.length / size) || 1;
    if (this.currentPage > this.totalPages) this.currentPage = 1;
    this.updatePagination();
  }

  updatePagination() {
    const size = Number(this.pageSize) || 50;
    const start = (this.currentPage - 1) * size;
    const end = start + size;
    this.paginatedStocks = this.filteredStocks.slice(start, end);
    this.checkScroll();
  }

  changePage(page: number) {
    if (page >= 1 && page <= this.totalPages) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  updatePageSize(size: string) {
    this.pageSize = Number(size);
    this.currentPage = 1;
    this.updatePagination();
  }

  sortBy(column: string) {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.applyFilters();
  }

  getSortIcon(column: string) {
    if (this.sortColumn !== column) return '';
    return this.sortDirection === 'asc' ? '▲' : '▼';
  }

  applyPreset(preset: any) {
    this.activePreset = preset.name;
    // Reset filters
    this.filters = {
      marketCapMin: null, marketCapMax: null,
      peMin: null, peMax: null,
      priceMin: null, priceMax: null,
      divYieldMin: null, divYieldMax: null,
      roeMin: null, roeMax: null,
      roceMin: null, roceMax: null
    };
    Object.assign(this.filters, preset.filters);
    this.applyFilters();
  }

  clearFilters() {
    this.activePreset = '';
    this.searchQuery = '';
    this.filters = {
      marketCapMin: null, marketCapMax: null,
      peMin: null, peMax: null,
      priceMin: null, priceMax: null,
      divYieldMin: null, divYieldMax: null,
      roeMin: null, roeMax: null,
      roceMin: null, roceMax: null
    };
    this.applyFilters();
  }

  forceUpdate() {
    if (confirm('Force update all stocks? This may take 30-60 minutes.')) {
      this.updating = true;
      this.stockService.forceUpdate().subscribe({
        next: () => this.pollStatus(),
        error: () => this.updating = false
      });
    }
  }

  pollStatus() {
    this.stockService.getUpdateStatus().subscribe(status => {
      this.updateProgress = status;
      if (status.status === 'running' || status.status === 'starting') {
        setTimeout(() => this.pollStatus(), 2000);
      } else {
        this.updating = false;
        this.loadStocks();
      }
    });
  }

  // View Helpers
  cleanSymbol(s: string) { return s.replace('.NS', '').replace('.BO', ''); }

  getChangeClass(stock: Stock) {
    if (stock.changePercent > 0) return 'change-positive';
    if (stock.changePercent < 0) return 'change-negative';
    return 'change-neutral';
  }

  formatMarketCap(val: number) {
    if (!val) return '—';
    return '₹' + (val / 10000000).toLocaleString('en-IN', { maximumFractionDigits: 0 }) + 'Cr';
  }

  formatCompactValue(val: number) {
    if (!val) return '—';
    const abs = Math.abs(val);
    if (abs >= 10000000) return '₹' + (val / 10000000).toFixed(0) + 'Cr';
    if (abs >= 100000) return '₹' + (val / 100000).toFixed(1) + 'L';
    return '₹' + val.toLocaleString();
  }

  // Drag to scroll
  isDragging = false;
  startX = 0;
  scrollLeft = 0;

  onMouseDown(event: MouseEvent) {
    if (!this.tableScroll) return;
    this.isDragging = true;
    this.startX = event.pageX - this.tableScroll.nativeElement.offsetLeft;
    this.scrollLeft = this.tableScroll.nativeElement.scrollLeft;
    this.tableScroll.nativeElement.style.cursor = 'grabbing';
  }

  onMouseLeave() {
    this.isDragging = false;
    if (this.tableScroll) this.tableScroll.nativeElement.style.cursor = 'grab';
  }

  onMouseUp() {
    this.isDragging = false;
    if (this.tableScroll) this.tableScroll.nativeElement.style.cursor = 'grab';
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isDragging || !this.tableScroll) return;
    event.preventDefault();
    const x = event.pageX - this.tableScroll.nativeElement.offsetLeft;
    const walk = (x - this.startX) * 1.5; // Scroll-fast
    this.tableScroll.nativeElement.scrollLeft = this.scrollLeft - walk;
  }



  trackStock(index: number, stock: Stock) { return stock.symbol; }
}
