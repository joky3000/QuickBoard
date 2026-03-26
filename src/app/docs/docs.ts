import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CyberButtonComponent } from '../shared/cyber-button/cyber-button';

@Component({
  selector: 'app-docs',
  standalone: true,
  imports: [RouterLink, CyberButtonComponent],
  templateUrl: './docs.html',
})
export class DocsComponent {}
