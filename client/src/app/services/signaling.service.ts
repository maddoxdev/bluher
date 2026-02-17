import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject } from 'rxjs';
import { AuthService } from './auth.service';

export interface OnlineUser {
  id: number;
  username: string;
  isOnline: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SignalingService {
  private hubConnection?: signalR.HubConnection;
  private connectionStateSubject = new BehaviorSubject<boolean>(false);
  public connectionState$ = this.connectionStateSubject.asObservable();
  
  private onlineUsersSubject = new BehaviorSubject<OnlineUser[]>([]);
  public onlineUsers$ = this.onlineUsersSubject.asObservable();

  // Event subjects for call signaling
  public incomingCall$ = new BehaviorSubject<any>(null);
  public receivedOffer$ = new BehaviorSubject<any>(null);
  public receivedAnswer$ = new BehaviorSubject<any>(null);
  public receivedIceCandidate$ = new BehaviorSubject<any>(null);
  public callDeclined$ = new BehaviorSubject<any>(null);
  public callEnded$ = new BehaviorSubject<any>(null);
  public userStatusChanged$ = new BehaviorSubject<any>(null);

  constructor(private authService: AuthService) {}

  async connect(): Promise<void> {
    const token = this.authService.token;
    if (!token) {
      throw new Error('No authentication token available');
    }

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl('http://localhost:5000/hubs/signaling', {
        accessTokenFactory: () => token
      })
      .withAutomaticReconnect()
      .build();

    this.setupEventHandlers();

    try {
      await this.hubConnection.start();
      this.connectionStateSubject.next(true);
      await this.loadOnlineUsers();
    } catch (err) {
      console.error('Error connecting to SignalR:', err);
      this.connectionStateSubject.next(false);
    }
  }

  private setupEventHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.on('IncomingCall', (data) => {
      this.incomingCall$.next(data);
    });

    this.hubConnection.on('ReceiveOffer', (data) => {
      this.receivedOffer$.next(data);
    });

    this.hubConnection.on('ReceiveAnswer', (data) => {
      this.receivedAnswer$.next(data);
    });

    this.hubConnection.on('ReceiveIceCandidate', (data) => {
      this.receivedIceCandidate$.next(data);
    });

    this.hubConnection.on('CallDeclined', (data) => {
      this.callDeclined$.next(data);
    });

    this.hubConnection.on('CallEnded', (data) => {
      this.callEnded$.next(data);
    });

    this.hubConnection.on('UserStatusChanged', (data) => {
      this.userStatusChanged$.next(data);
      this.loadOnlineUsers();
    });
  }

  async disconnect(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.connectionStateSubject.next(false);
    }
  }

  async initiateCall(calleeId: number): Promise<void> {
    await this.hubConnection?.invoke('InitiateCall', calleeId);
  }

  async sendOffer(calleeId: number, sdp: string): Promise<void> {
    await this.hubConnection?.invoke('SendOffer', calleeId, sdp);
  }

  async sendAnswer(callerId: number, sdp: string, callId: number): Promise<void> {
    await this.hubConnection?.invoke('SendAnswer', callerId, sdp, callId);
  }

  async sendIceCandidate(targetUserId: number, candidate: any): Promise<void> {
    await this.hubConnection?.invoke('SendIceCandidate', targetUserId, candidate);
  }

  async declineCall(callId: number, callerId: number): Promise<void> {
    await this.hubConnection?.invoke('DeclineCall', callId, callerId);
  }

  async endCall(callId: number, otherUserId: number): Promise<void> {
    await this.hubConnection?.invoke('EndCall', callId, otherUserId);
  }

  private async loadOnlineUsers(): Promise<void> {
    try {
      const users = await this.hubConnection?.invoke<OnlineUser[]>('GetOnlineUsers');
      if (users) {
        this.onlineUsersSubject.next(users);
      }
    } catch (err) {
      console.error('Error loading online users:', err);
    }
  }
}
