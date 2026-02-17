import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { SignalingService, OnlineUser } from '../../services/signaling.service';
import { WebrtcService } from '../../services/webrtc.service';
import { CallState } from '../../models/models';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-call',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="call-container">
      <header>
        <h1>VoIP Application</h1>
        <div class="user-info">
          <span>{{ currentUsername }}</span>
          <button (click)="logout()" class="btn-logout">Logout</button>
        </div>
      </header>

      <div class="main-content">
        <!-- Online Users List -->
        <div class="users-panel" *ngIf="callState.callState === 'idle'">
          <h2>Online Users</h2>
          <div class="user-list">
            <div 
              *ngFor="let user of onlineUsers" 
              class="user-item"
              (click)="initiateCall(user)">
              <div class="user-avatar">{{ user.username[0].toUpperCase() }}</div>
              <div class="user-name">{{ user.username }}</div>
              <div class="user-status online"></div>
            </div>
            <div *ngIf="onlineUsers.length === 0" class="no-users">
              No users online
            </div>
          </div>
        </div>

        <!-- Incoming Call -->
        <div class="call-screen" *ngIf="callState.callState === 'ringing' && !callState.isCaller">
          <div class="call-info">
            <div class="caller-avatar">{{ (callState.otherUsername || 'U')[0].toUpperCase() }}</div>
            <h2>{{ callState.otherUsername }}</h2>
            <p>Incoming call...</p>
          </div>
          <div class="call-actions">
            <button (click)="answerCall()" class="btn-answer">Answer</button>
            <button (click)="declineCall()" class="btn-decline">Decline</button>
          </div>
        </div>

        <!-- Outgoing Call -->
        <div class="call-screen" *ngIf="callState.callState === 'initiating' || (callState.callState === 'ringing' && callState.isCaller)">
          <div class="call-info">
            <div class="caller-avatar">{{ (callState.otherUsername || 'U')[0].toUpperCase() }}</div>
            <h2>{{ callState.otherUsername }}</h2>
            <p>Calling...</p>
          </div>
          <div class="call-actions">
            <button (click)="endCall()" class="btn-decline">Cancel</button>
          </div>
        </div>

        <!-- Active Call -->
        <div class="call-screen active" *ngIf="callState.callState === 'answered'">
          <div class="call-info">
            <div class="caller-avatar">{{ (callState.otherUsername || 'U')[0].toUpperCase() }}</div>
            <h2>{{ callState.otherUsername }}</h2>
            <p class="call-duration">{{ callDuration }}</p>
          </div>
          <div class="call-actions">
            <button (click)="endCall()" class="btn-end-call">End Call</button>
          </div>
          <audio #remoteAudio autoplay></audio>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .call-container {
      min-height: 100vh;
      background: #f5f5f5;
    }

    header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h1 {
      margin: 0;
      font-size: 1.5rem;
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .btn-logout {
      padding: 0.5rem 1rem;
      background: rgba(255,255,255,0.2);
      color: white;
      border: 1px solid white;
      border-radius: 5px;
      cursor: pointer;
      transition: background 0.3s;
    }

    .btn-logout:hover {
      background: rgba(255,255,255,0.3);
    }

    .main-content {
      max-width: 800px;
      margin: 2rem auto;
      padding: 0 1rem;
    }

    .users-panel {
      background: white;
      border-radius: 10px;
      padding: 1.5rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    h2 {
      margin-top: 0;
      color: #333;
    }

    .user-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .user-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.2s;
    }

    .user-item:hover {
      background: #f8f8f8;
    }

    .user-avatar {
      width: 40px;
      height: 40px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: bold;
    }

    .user-name {
      flex: 1;
      font-weight: 500;
    }

    .user-status {
      width: 10px;
      height: 10px;
      border-radius: 50%;
    }

    .user-status.online {
      background: #2ecc71;
    }

    .no-users {
      text-align: center;
      color: #999;
      padding: 2rem;
    }

    .call-screen {
      background: white;
      border-radius: 10px;
      padding: 3rem;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      text-align: center;
    }

    .call-screen.active {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .call-info {
      margin-bottom: 2rem;
    }

    .caller-avatar {
      width: 100px;
      height: 100px;
      border-radius: 50%;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 3rem;
      font-weight: bold;
      margin: 0 auto 1rem;
    }

    .call-screen.active .caller-avatar {
      background: rgba(255,255,255,0.3);
    }

    .call-duration {
      font-size: 1.5rem;
      margin-top: 1rem;
    }

    .call-actions {
      display: flex;
      gap: 1rem;
      justify-content: center;
    }

    .btn-answer, .btn-decline, .btn-end-call {
      padding: 1rem 2rem;
      border: none;
      border-radius: 50px;
      font-size: 1rem;
      cursor: pointer;
      transition: transform 0.2s;
    }

    .btn-answer {
      background: #2ecc71;
      color: white;
    }

    .btn-decline, .btn-end-call {
      background: #e74c3c;
      color: white;
    }

    .btn-answer:hover, .btn-decline:hover, .btn-end-call:hover {
      transform: scale(1.05);
    }
  `]
})
export class CallComponent implements OnInit, OnDestroy {
  currentUsername = '';
  onlineUsers: OnlineUser[] = [];
  callState: CallState = {
    isInCall: false,
    isCaller: false,
    callState: 'idle'
  };
  callDuration = '00:00';
  
  private subscriptions: Subscription[] = [];
  private callStartTime?: Date;
  private durationInterval?: any;

  constructor(
    private authService: AuthService,
    private signalingService: SignalingService,
    private webrtcService: WebrtcService,
    private router: Router
  ) {
    const user = this.authService.currentUserValue;
    if (user) {
      this.currentUsername = user.username;
    }
  }

  async ngOnInit(): Promise<void> {
    try {
      await this.signalingService.connect();
      this.setupSubscriptions();
    } catch (error) {
      console.error('Failed to connect to signaling server:', error);
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    this.signalingService.disconnect();
    this.webrtcService.stopCall();
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
    }
  }

  private setupSubscriptions(): void {
    this.subscriptions.push(
      this.signalingService.onlineUsers$.subscribe(users => {
        this.onlineUsers = users;
      }),

      this.signalingService.incomingCall$.subscribe(async (data) => {
        if (data) {
          this.callState = {
            callId: data.callId,
            isInCall: true,
            isCaller: false,
            otherUserId: data.callerId,
            otherUsername: data.callerUsername,
            callState: 'ringing'
          };
          await this.webrtcService.initializeLocalStream();
        }
      }),

      this.signalingService.receivedAnswer$.subscribe(() => {
        this.callState.callState = 'answered';
        this.startCallDuration();
      }),

      this.signalingService.callDeclined$.subscribe((data) => {
        if (data) {
          this.resetCallState();
        }
      }),

      this.signalingService.callEnded$.subscribe((data) => {
        if (data) {
          this.resetCallState();
        }
      })
    );
  }

  async initiateCall(user: OnlineUser): Promise<void> {
    try {
      await this.webrtcService.initializeLocalStream();
      await this.signalingService.initiateCall(user.id);
      
      this.callState = {
        isInCall: true,
        isCaller: true,
        otherUserId: user.id,
        otherUsername: user.username,
        callState: 'initiating'
      };

      await this.webrtcService.createOffer(user.id);
      this.callState.callState = 'ringing';
    } catch (error) {
      console.error('Failed to initiate call:', error);
    }
  }

  async answerCall(): Promise<void> {
    if (this.callState.otherUserId && this.callState.callId) {
      await this.webrtcService.sendAnswer(this.callState.otherUserId, this.callState.callId);
      this.callState.callState = 'answered';
      this.startCallDuration();
    }
  }

  async declineCall(): Promise<void> {
    if (this.callState.callId && this.callState.otherUserId) {
      await this.signalingService.declineCall(this.callState.callId, this.callState.otherUserId);
      this.resetCallState();
    }
  }

  async endCall(): Promise<void> {
    if (this.callState.callId && this.callState.otherUserId) {
      await this.signalingService.endCall(this.callState.callId, this.callState.otherUserId);
      this.resetCallState();
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/auth']);
  }

  private resetCallState(): void {
    this.webrtcService.stopCall();
    this.callState = {
      isInCall: false,
      isCaller: false,
      callState: 'idle'
    };
    if (this.durationInterval) {
      clearInterval(this.durationInterval);
      this.callDuration = '00:00';
    }
  }

  private startCallDuration(): void {
    this.callStartTime = new Date();
    this.durationInterval = setInterval(() => {
      if (this.callStartTime) {
        const duration = Math.floor((new Date().getTime() - this.callStartTime.getTime()) / 1000);
        const minutes = Math.floor(duration / 60);
        const seconds = duration % 60;
        this.callDuration = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      }
    }, 1000);
  }
}
