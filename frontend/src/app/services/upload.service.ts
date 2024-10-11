import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class UploadService {
  private uploadIdSource = new BehaviorSubject<string | null>(null);
  currentUploadId = this.uploadIdSource.asObservable();

  constructor() {}

  setUploadId(uploadId: string) {
    this.uploadIdSource.next(uploadId);
  }
}
