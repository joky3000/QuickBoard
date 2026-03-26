import { computed, inject, Injectable, PLATFORM_ID, signal } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { JiraCredentials } from '../models/auth.models';

const STORAGE_KEY = 'quickboard_credentials';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly platformId = inject(PLATFORM_ID);
  private readonly isBrowser = isPlatformBrowser(this.platformId);

  private readonly credentials = signal<JiraCredentials | null>(this.loadFromStorage());

  readonly isLoggedIn = computed(() => this.credentials() !== null);

  getCredentials(): JiraCredentials | null {
    return this.credentials();
  }

  getAuthHeader(): string {
    const creds = this.credentials();
    if (!creds) throw new Error('No credentials available');
    return `Basic ${btoa(`${creds.email}:${creds.apiToken}`)}`;
  }

  save(credentials: JiraCredentials): void {
    if (this.isBrowser) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(credentials));
    }
    this.credentials.set(credentials);
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.credentials.set(null);
  }

  private loadFromStorage(): JiraCredentials | null {
    if (!this.isBrowser) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JiraCredentials) : null;
  }
}
