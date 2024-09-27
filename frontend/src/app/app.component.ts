import { Component, OnInit } from '@angular/core';
import { initFlowbite } from 'flowbite';

@Component({
  selector: 'app-root',
  template: `
    <app-header></app-header>

    <router-outlet />
  `,
  styles: []
})
export class AppComponent implements OnInit {
  title = 'my-app';

  ngOnInit() {
    initFlowbite();
  }
}
