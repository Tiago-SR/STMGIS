import { Component, Input } from '@angular/core';
import { Responsable } from '../../../../models/responsable.model';

@Component({
  selector: 'app-user-card',
  templateUrl: './user-card.component.html',
  styleUrl: './user-card.component.scss'
})
export class UserCardComponent {
  @Input() user!: Responsable;
}
