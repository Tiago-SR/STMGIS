import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

interface ConfirmationData {
  title: string;
  message: string;
  resolve: (value: boolean) => void;
}

@Injectable({
  providedIn: 'root',
})
export class ConfirmationService {
  private confirmationSubject = new Subject<ConfirmationData | null>();

  requestConfirmation(title: string, message: string): Promise<boolean> {
    return new Promise((resolve) => {
      this.confirmationSubject.next({ title, message, resolve });
    });
  }

  getConfirmation() {
    return this.confirmationSubject.asObservable();
  }
}
