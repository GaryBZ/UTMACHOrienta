import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';

interface StoredUser {
  nombre?: string;
  apellido?: string;
  id_rol?: number;
}

@Component({
  selector: 'app-navbar',
  templateUrl: './navbar.component.html',
  styleUrls: ['./navbar.component.scss'],
  imports: [CommonModule, RouterModule],
})
export class NavbarComponent  implements OnInit {
  isLoggedIn = false;
  displayName = '';
  isAdmin = false;
  isProfileOpen = false;

  private readonly storageKey = 'utmo_user';

  constructor(private router: Router) { }

  ngOnInit() {
    this.loadUser();
  }

  private loadUser(): void {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) {
      this.isLoggedIn = false;
      this.displayName = '';
      this.isProfileOpen = false;
      return;
    }

    try {
      const user = JSON.parse(stored) as StoredUser;
      const nombre = user?.nombre?.trim() || '';
      const apellido = user?.apellido?.trim() || '';
      this.displayName = [nombre, apellido].filter(Boolean).join(' ').trim();
      this.isLoggedIn = true;
      this.isAdmin = user?.id_rol === 3;
    } catch (error) {
      this.isLoggedIn = false;
      this.displayName = '';
      this.isAdmin = false;
      this.isProfileOpen = false;
    }
  }

  toggleProfile(): void {
    this.isProfileOpen = !this.isProfileOpen;
  }

  closeProfile(): void {
    this.isProfileOpen = false;
  }

  logout(): void {
    localStorage.removeItem(this.storageKey);
    this.isLoggedIn = false;
    this.displayName = '';
    this.isAdmin = false;
    this.isProfileOpen = false;
    this.router.navigate(['/login']);
  }

  toggleMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
      mobileMenu.classList.toggle('open');
    }
  }

  closeMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    if (mobileMenu) {
      mobileMenu.classList.remove('open');
    }
  }

}
