import { Routes } from '@angular/router';
import { MarketOverviewComponent } from './pages/market-overview/market-overview.component';
import { StockDetailsComponent } from './pages/stock-details/stock-details.component';

export const routes: Routes = [
    { path: '', component: MarketOverviewComponent },
    { path: 'company/:ticker', component: StockDetailsComponent },
    { path: '**', redirectTo: '' }
];
