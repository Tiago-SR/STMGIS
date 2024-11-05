import { Component, OnInit } from '@angular/core';
import { ConfirmationService } from '../../services/confirmation.service';

@Component({
  selector: 'app-confirmation-dialog',
  template: `
    <div *ngIf="visible" class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div class="bg-white rounded-lg p-6 w-11/12 max-w-md shadow-lg">
        <h3 class="text-xl font-semibold mb-4">{{ title }}</h3>
        <p class="mb-6">{{ message }}</p>
        <div class="flex justify-end">
          <button
            (click)="onCancel()"
            class="bg-gray-300 text-gray-700 px-4 py-2 rounded mr-2 hover:bg-gray-400 focus:outline-none"
          >
            No
          </button>
          <button
            (click)="onConfirm()"
            class="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 focus:outline-none"
          >
            Sí
          </button>
        </div>
      </div>
    </div>
  `,
})
export class ConfirmationDialogComponent implements OnInit {
  visible = false;
  title = '';
  message = '';

  private resolve!: (value: boolean) => void;

  constructor(private confirmationService: ConfirmationService) {}

  ngOnInit() {
    this.confirmationService.getConfirmation().subscribe((data) => {
      if (data) {
        this.title = data.title;
        this.message = data.message;
        this.resolve = data.resolve;
        this.visible = true;
      } else {
        this.visible = false;
      }
    });
  }

  onConfirm() {
    this.visible = false;
    this.resolve(true);
  }

  onCancel() {
    this.visible = false;
    this.resolve(false);
  }
}
