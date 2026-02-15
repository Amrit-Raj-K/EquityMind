import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './components/header/header.component';

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, HeaderComponent],
    template: `
    <app-header></app-header>
    <main class="container mx-auto px-4 py-6">
      <router-outlet></router-outlet>
    </main>
  `
})
export class AppComponent {
    title = 'equitymind';
}
