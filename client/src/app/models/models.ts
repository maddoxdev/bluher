export interface User {
  id: number;
  username: string;
  email: string;
  isOnline: boolean;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  userId: number;
  username: string;
}

export interface CallState {
  callId?: number;
  isInCall: boolean;
  isCaller: boolean;
  otherUserId?: number;
  otherUsername?: string;
  callState: 'idle' | 'initiating' | 'ringing' | 'answered' | 'ended';
}
