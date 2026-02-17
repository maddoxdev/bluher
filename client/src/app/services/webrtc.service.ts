import { Injectable } from '@angular/core';
import { SignalingService } from './signaling.service';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebrtcService {
  private peerConnection?: RTCPeerConnection;
  private localStream?: MediaStream;
  private remoteStream = new MediaStream();
  
  public remoteStream$ = new BehaviorSubject<MediaStream | null>(null);
  public localStream$ = new BehaviorSubject<MediaStream | null>(null);

  // STUN/TURN configuration
  private iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // Add TURN server when available
    // { 
    //   urls: 'turn:your-turn-server:3478',
    //   username: 'username',
    //   credential: 'password'
    // }
  ];

  constructor(private signalingService: SignalingService) {
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers(): void {
    this.signalingService.receivedOffer$.subscribe(async (data) => {
      if (data && data.sdp) {
        await this.handleOffer(data.sdp, data.callerId);
      }
    });

    this.signalingService.receivedAnswer$.subscribe(async (data) => {
      if (data && data.sdp) {
        await this.handleAnswer(data.sdp);
      }
    });

    this.signalingService.receivedIceCandidate$.subscribe(async (data) => {
      if (data && data.candidate) {
        await this.handleIceCandidate(data.candidate);
      }
    });
  }

  async initializeLocalStream(): Promise<MediaStream> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false // Set to true if video calling is needed
      });
      this.localStream$.next(this.localStream);
      return this.localStream;
    } catch (error) {
      console.error('Error accessing media devices:', error);
      throw error;
    }
  }

  async createOffer(calleeId: number): Promise<void> {
    this.peerConnection = this.createPeerConnection(calleeId);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    
    await this.signalingService.sendOffer(calleeId, offer.sdp!);
  }

  async handleOffer(sdp: string, callerId: number): Promise<void> {
    this.peerConnection = this.createPeerConnection(callerId);
    
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        this.peerConnection?.addTrack(track, this.localStream!);
      });
    }

    await this.peerConnection.setRemoteDescription({
      type: 'offer',
      sdp: sdp
    });

    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
  }

  async sendAnswer(callerId: number, callId: number): Promise<void> {
    if (this.peerConnection?.localDescription) {
      await this.signalingService.sendAnswer(
        callerId, 
        this.peerConnection.localDescription.sdp!, 
        callId
      );
    }
  }

  async handleAnswer(sdp: string): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.setRemoteDescription({
        type: 'answer',
        sdp: sdp
      });
    }
  }

  async handleIceCandidate(candidate: RTCIceCandidateInit): Promise<void> {
    if (this.peerConnection) {
      await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    }
  }

  private createPeerConnection(otherUserId: number): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers });

    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalingService.sendIceCandidate(otherUserId, event.candidate.toJSON());
      }
    };

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach(track => {
        this.remoteStream.addTrack(track);
      });
      this.remoteStream$.next(this.remoteStream);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('ICE connection state:', pc.iceConnectionState);
    };

    return pc;
  }

  stopCall(): void {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
      this.localStream$.next(null);
    }

    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = undefined;
    }

    this.remoteStream = new MediaStream();
    this.remoteStream$.next(null);
  }
}
