import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private messagesSubject = new Subject<any>();
  private openSubject = new Subject<void>();  // Nuevo Subject para el evento onopen
  private cultivoId!: string;

  constructor() {}

  connect(cultivoId: string): void {
    this.cultivoId = cultivoId;
    const url = `ws://api.proyecto.local/ws/rendimiento/${cultivoId}/`;
    console.log('Intentando conectar al WebSocket:', url);
    this.socket = new WebSocket(url);

    this.socket.onopen = (event) => {
      console.log('WebSocket abierto:', event);
      this.openSubject.next();  // Notificar que la conexión está abierta
    };

    this.socket.onmessage = (event) => {
      console.log('Mensaje recibido:', event.data);
      const data = JSON.parse(event.data);
      this.messagesSubject.next(data);
    };

    this.socket.onerror = (error) => {
      console.error('Error en el WebSocket:', error);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket cerrado:', event);
    };
  }

  sendMessage(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      console.log('Mensaje enviado por WebSocket:', data);
    } else {
      console.error('WebSocket no está conectado.');
    }
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.close();
    }
  }

  getMessages(): Observable<any> {
    return this.messagesSubject.asObservable();
  }

  // Nuevo método para obtener el Observable del evento onopen
  onOpen(): Observable<void> {
    return this.openSubject.asObservable();
  }
}