import { Injectable } from '@angular/core';
import { Subject, Observable, BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class WebSocketService {
  private socket!: WebSocket;
  private messagesSubject = new Subject<any>();
  private openSubject = new Subject<void>();
  private connectionStatusSubject = new BehaviorSubject<boolean>(false);
  private cultivoId!: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectTimeout: any;
  private messageQueue: any[] = [];

  constructor() {}

  connect(cultivoId: string): void {
    this.cultivoId = cultivoId;
    this.establishConnection();
  }

  private establishConnection(): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      return;
    }

    const url = `ws://api.proyecto.local/ws/rendimiento/${this.cultivoId}/`;
    console.log('Intentando conectar al WebSocket:', url);
    
    this.socket = new WebSocket(url);

    this.socket.onopen = (event) => {
      console.log('WebSocket abierto:', event);
      this.openSubject.next();
      this.connectionStatusSubject.next(true);
      this.reconnectAttempts = 0;
      this.processMessageQueue();
    };

    this.socket.onmessage = (event) => {
      console.log('Mensaje recibido:', event.data);
      try {
        const data = JSON.parse(event.data);
        this.messagesSubject.next(data);
      } catch (error) {
        console.error('Error al procesar mensaje:', error);
      }
    };

    this.socket.onerror = (error) => {
      console.error('Error en el WebSocket:', error);
      this.connectionStatusSubject.next(false);
    };

    this.socket.onclose = (event) => {
      console.log('WebSocket cerrado:', event);
      this.connectionStatusSubject.next(false);
      
      if (!event.wasClean && this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++;
        console.log(`Intento de reconexión ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
        
        const timeout = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        this.reconnectTimeout = setTimeout(() => {
          this.establishConnection();
        }, timeout);
      }
    };
  }

  sendMessage(data: any): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
      console.log('Mensaje enviado por WebSocket:', data);
    } else {
      console.log('WebSocket no conectado, encolando mensaje');
      this.messageQueue.push(data);
      this.attemptReconnection();
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.socket?.readyState === WebSocket.OPEN) {
      const message = this.messageQueue.shift();
      this.sendMessage(message);
    }
  }

  private attemptReconnection(): void {
    if (this.socket?.readyState !== WebSocket.OPEN && !this.reconnectTimeout) {
      this.establishConnection();
    }
  }

  disconnect(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }
    
    this.reconnectAttempts = 0;
    this.messageQueue = [];
    
    if (this.socket) {
      this.socket.close();
      this.connectionStatusSubject.next(false);
    }
  }

  getMessages(): Observable<any> {
    return this.messagesSubject.asObservable();
  }

  onOpen(): Observable<void> {
    return this.openSubject.asObservable();
  }

  getConnectionStatus(): Observable<boolean> {
    return this.connectionStatusSubject.asObservable();
  }

  isConnected(): boolean {
    return this.socket?.readyState === WebSocket.OPEN;
  }
}