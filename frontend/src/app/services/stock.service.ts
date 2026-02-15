import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface Stock {
    symbol: string;
    name: string;
    price: number;
    change: number;
    changePercent: number;
    marketCap: number;
    peRatio: number;
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
    high52Week?: number;
    low52Week?: number;
    exchange?: string;
    updatedAt?: number;
    currency?: string;
}

@Injectable({
    providedIn: 'root'
})
export class StockService {
    private apiUrl = 'http://localhost:3000/api';

    /** Emits when backend data has been refreshed (scraper finished) */
    dataUpdated$ = new Subject<void>();

    constructor(private http: HttpClient) { }

    getStocks(query?: string, exchange?: string): Observable<Stock[]> {
        let params = new HttpParams();
        if (query) params = params.set('q', query);
        if (exchange) params = params.set('exchange', exchange);
        return this.http.get<Stock[]>(`${this.apiUrl}/stocks`, { params });
    }

    getStockDetails(symbol: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stocks/${symbol}`);
    }

    getFinancials(symbol: string): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/stocks/${symbol}/financials`);
    }

    getHistory(symbol: string, range: string = '1y'): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/stocks/${symbol}/history?range=${range}`);
    }

    search(query: string): Observable<any[]> {
        return this.http.get<any[]>(`${this.apiUrl}/search?q=${query}`);
    }

    forceUpdate(): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/force-update`, {});
    }

    getUpdateStatus(): Observable<any> {
        return this.http.get(`${this.apiUrl}/admin/update-status`);
    }

    stopUpdate(): Observable<any> {
        return this.http.post(`${this.apiUrl}/admin/stop-update`, {});
    }
}
