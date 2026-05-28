import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

@Component({
  selector: 'app-side-navbar',
  templateUrl: './side-navbar.component.html',
  styleUrls: ['./side-navbar.component.scss'],
  standalone: true,
  imports: [CommonModule, RouterModule],
})
export class SideNavbarComponent  implements OnInit {
  displayName = '';
  private readonly storageKey = 'utmo_user';

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadUser();
  }

  goBackToPublic(): void {
    this.router.navigate(['/inicio']);
  }

  private loadUser(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      this.displayName = 'Administrador';
      return;
    }

    try {
      const user = JSON.parse(stored) as { nombre?: string; apellido?: string };
      const nombre = user?.nombre?.trim() || '';
      const apellido = user?.apellido?.trim() || '';
      const fullName = [nombre, apellido].filter(Boolean).join(' ').trim();
      this.displayName = this.truncateName(fullName || 'Administrador');
    } catch (error) {
      this.displayName = 'Administrador';
    }
  }

  private truncateName(value: string): string {
    const maxLength = 22;
    if (value.length <= maxLength) return value;
    return `${value.slice(0, maxLength - 3)}...`;
  }

}
