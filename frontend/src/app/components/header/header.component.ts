import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="app-header">
      <div class="header-inner">
        <div class="header-left">
          <a routerLink="/" class="logo">
            <span class="logo-icon">📊</span>
            <span class="logo-text">EquityMind</span>
          </a>
        </div>
        <div class="header-right">
             <!-- Actions are now in Market Overview page -->
        </div>
      </div>
    </header>
  `,
  styles: [`
    .app-header {
      background: rgba(15, 23, 42, 0.85);
      backdrop-filter: blur(12px);
      border-bottom: 1px solid #1e293b;
      position: sticky; top: 0; z-index: 50;
    }
    .header-inner {
      max-width: 1400px; margin: 0 auto;
      display: flex; justify-content: space-between; align-items: center;
      padding: 12px 16px;
    }
    .header-left { display: flex; align-items: center; gap: 32px; }
    .logo { display: flex; align-items: center; gap: 8px; text-decoration: none; }
    .logo-icon { font-size: 24px; }
    .logo-text { font-size: 18px; font-weight: 700; color: #e2e8f0; letter-spacing: -0.5px; }
    .header-right { display: flex; align-items: center; gap: 8px; }
  `]
})
export class HeaderComponent { }
