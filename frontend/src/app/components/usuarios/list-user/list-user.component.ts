import { Component } from '@angular/core';

@Component({
  selector: 'app-list-user',
  templateUrl: './list-user.component.html',
  styleUrl: './list-user.component.scss'
})
export class ListUserComponent {
  users = Array(10).fill(0);
  isModalActive = false;
  toggleInviteModal(to: boolean) {
    this.isModalActive = to;
  }
}
