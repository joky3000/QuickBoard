import { Component, input } from '@angular/core';

@Component({
  selector: 'app-cyber-button',
  standalone: true,
  templateUrl: './cyber-button.html',
})
export class CyberButtonComponent {
  type = input<'button' | 'submit' | 'reset'>('button');
  disabled = input(false);
}
