import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';

@Component({
  selector: 'app-mobile-navbar',
  templateUrl: './mobile-navbar.component.html',
  styleUrls: ['./mobile-navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class MobileNavbarComponent implements OnInit {
  isVisible = false;

  constructor(private router: Router) {}

  ngOnInit() {
    this.checkVisibility();
    this.router.events.subscribe(() => {
      this.checkVisibility();
    });
  }

  private checkVisibility(): void {
    const url = this.router.url;
    // Show navbar only on these routes
    this.isVisible = ['/inicio', '/test', '/carreras', '/campus'].some(route => 
      url.startsWith(route)
    );
  }
}
