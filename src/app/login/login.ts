import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { APP_PATHS } from '../app.routes.paths';
import { AuthService } from '../services/auth.service';
import { JiraService } from '../services/jira.service';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, CyberButtonComponent],
  templateUrl: './login.html',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private jira = inject(JiraService);
  private router = inject(Router);

  loading = signal(false);
  error = signal<string | null>(null);

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    apiToken: ['', Validators.required],
    baseUrl: ['', Validators.required],
  });

  async save(): Promise<void> {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, apiToken, baseUrl } = this.form.getRawValue();
    const base = baseUrl!.replace(/\/$/, '');

    this.loading.set(true);
    this.error.set(null);

    try {
      await this.jira.validateCredentials(email!, apiToken!, base);
      this.auth.save({ email: email!, apiToken: apiToken!, baseUrl: base });
      this.router.navigate([APP_PATHS.DASHBOARD]);
    } catch (e) {
      this.error.set(e instanceof Error ? e.message : 'Could not reach Jira. Check your base URL.');
    } finally {
      this.loading.set(false);
    }
  }
}
