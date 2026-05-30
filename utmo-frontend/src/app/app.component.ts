import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs/operators';
import { NavbarComponent } from './layout/navbar/navbar.component';
import { FooterComponent } from './layout/footer/footer.component';
import { MobileNavbarComponent } from './layout/mobile-navbar/mobile-navbar.component';

@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
  imports: [CommonModule, RouterOutlet, NavbarComponent, FooterComponent, MobileNavbarComponent],
})
export class AppComponent {
  hideLayout = false;

  constructor(private router: Router) {
    this.hideLayout = this.shouldHideLayout(this.router.url);
    this.router.events.pipe(filter((event) => event instanceof NavigationEnd)).subscribe((event) => {
      this.hideLayout = this.shouldHideLayout((event as NavigationEnd).urlAfterRedirects);
    });
  }

  private shouldHideLayout(url: string): boolean {
    return url.startsWith('/register') || url.startsWith('/login') || url.startsWith('/admin');
  }
}
