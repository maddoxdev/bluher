# VoIP Application

A full-stack VoIP (Voice over IP) application with Angular + Capacitor client and ASP.NET Core server.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Client Applications                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │   Web App    │  │  iOS App     │  │ Android App  │              │
│  │  (Angular)   │  │ (Capacitor)  │  │ (Capacitor)  │              │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘              │
└─────────┼──────────────────┼──────────────────┼────────────────────┘
          │                  │                  │
          │   HTTPS/WSS      │   HTTPS/WSS      │   HTTPS/WSS
          │                  │                  │
    ┌─────┴──────────────────┴──────────────────┴────────┐
    │              Load Balancer (K8s)                    │
    └─────┬──────────────────┬──────────────────┬────────┘
          │                  │                  │
    ┌─────▼────┐      ┌──────▼─────┐    ┌──────▼─────┐
    │ Server 1 │      │ Server 2   │    │ Server 3   │
    │ (ASP.NET)│      │ (ASP.NET)  │    │ (ASP.NET)  │
    └─────┬────┘      └──────┬─────┘    └──────┬─────┘
          │                  │                  │
          └──────────┬───────┴─────────┬────────┘
                     │                 │
          ┌──────────▼────────┐  ┌─────▼────────────┐
          │   PostgreSQL      │  │   Redis          │
          │   (User Data)     │  │   (SignalR +     │
          │                   │  │    Cache)        │
          └───────────────────┘  └──────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                      Media Path (WebRTC P2P)                         │
│                                                                       │
│  Client A ◄──────── Direct P2P Audio ────────► Client B             │
│            (via STUN for NAT traversal)                              │
│                                                                       │
│  If P2P fails:                                                       │
│  Client A ◄────► TURN Server (coturn) ◄────► Client B              │
│                    (Media Relay)                                     │
└─────────────────────────────────────────────────────────────────────┘

Push Notifications:
  Firebase (Android) ◄─── Server ───► APNS (iOS)
```

## Architecture

### Server (ASP.NET Core)
- **Account Management**: EF Core + PostgreSQL for user data
- **Authentication**: JWT-based authentication
- **Signaling**: SignalR for WebRTC signaling (SDP/ICE exchange)
- **Scaling**: Redis backplane for SignalR to support horizontal scaling
- **Push Notifications**: Firebase (Android) and APNS (iOS) support
- **Stateless Design**: Enables easy scaling through Kubernetes

### Client (Angular + Capacitor)
- **Framework**: Angular 21 with standalone components
- **Mobile Support**: Capacitor for iOS and Android deployment
- **Real-time Communication**: SignalR client for signaling
- **WebRTC**: Peer-to-peer audio/video calls
- **STUN/TURN**: Configured for NAT traversal

### Media Transmission
- **WebRTC P2P**: Direct peer-to-peer media transmission
- **STUN Server**: Google STUN servers for public IP discovery
- **TURN Server**: coturn for relay when P2P fails

## Features

- User registration and authentication
- Real-time presence management
- Voice calling between users
- Call state management (initiating, ringing, answered, ended)
- Push notifications for incoming calls
- Scalable architecture with Kubernetes
- Redis-backed SignalR for multi-instance deployment

## Prerequisites

- **.NET 10 SDK**: For building the server
- **Node.js 24+**: For building the client
- **Docker**: For containerized deployment
- **PostgreSQL**: Database for user accounts
- **Redis**: For SignalR backplane
- **coturn**: TURN server for WebRTC relay

## Quick Start

### Local Development

#### 1. Start Infrastructure Services
```bash
docker-compose up -d postgres redis coturn
```

#### 2. Run Server
```bash
cd server
dotnet ef database update
dotnet run
```

#### 3. Run Client
```bash
cd client
npm install
npm start
```

Access the application at `http://localhost:4200`

### Docker Deployment

Build and run all services:
```bash
docker-compose up --build
```

Services:
- Client: `http://localhost:4200`
- Server: `http://localhost:5000`
- PostgreSQL: `localhost:5432`
- Redis: `localhost:6379`

### Kubernetes Deployment

1. Build Docker images:
```bash
docker build -t voip-server:latest -f Dockerfile.server .
docker build -t voip-client:latest -f Dockerfile.client .
```

2. Apply Kubernetes manifests:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/configmap.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/server-deployment.yaml
kubectl apply -f k8s/client-deployment.yaml
```

3. Check deployment status:
```bash
kubectl get pods -n voip
kubectl get services -n voip
```

## Configuration

### Server Configuration (appsettings.json)

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Host=localhost;Database=voipdb;Username=postgres;Password=postgres",
    "Redis": "localhost:6379"
  },
  "Jwt": {
    "Key": "Your-Secret-Key-Min-32-Characters",
    "Issuer": "VoipServer",
    "Audience": "VoipClient"
  }
}
```

### Firebase Configuration (Push Notifications)

Set the environment variable:
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/firebase-credentials.json
```

### TURN Server Configuration

Edit `coturn.conf` to configure your TURN server. Update the client's `webrtc.service.ts` with your TURN credentials.

## Mobile Deployment

### iOS
```bash
cd client
npx cap add ios
npx cap sync ios
npx cap open ios
```

### Android
```bash
cd client
npx cap add android
npx cap sync android
npx cap open android
```

## Project Structure

```
bluher/
├── server/                 # ASP.NET Core Server
│   ├── Controllers/       # API Controllers
│   ├── Data/             # EF Core DbContext
│   ├── Hubs/             # SignalR Hubs
│   ├── Models/           # Domain Models
│   ├── Services/         # Business Logic
│   └── Migrations/       # Database Migrations
├── client/               # Angular Client
│   └── src/
│       └── app/
│           ├── components/  # UI Components
│           ├── services/    # Angular Services
│           └── models/      # TypeScript Models
├── k8s/                  # Kubernetes Manifests
├── docker-compose.yml    # Docker Compose Configuration
└── README.md
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `POST /api/auth/device-token` - Update push notification token

### SignalR Hub (/hubs/signaling)
- `InitiateCall(calleeId)` - Start a call
- `SendOffer(calleeId, sdp)` - Send WebRTC offer
- `SendAnswer(callerId, sdp, callId)` - Send WebRTC answer
- `SendIceCandidate(targetUserId, candidate)` - Exchange ICE candidates
- `DeclineCall(callId, callerId)` - Decline incoming call
- `EndCall(callId, otherUserId)` - End active call
- `GetOnlineUsers()` - Get list of online users

## Scaling

The application is designed to be stateless and can be scaled horizontally:

1. **Server Scaling**: Add more server instances behind a load balancer
2. **Redis Backplane**: Ensures SignalR messages are distributed across all instances
3. **Database**: Use PostgreSQL read replicas for read scaling
4. **Kubernetes HPA**: Automatically scales based on CPU/memory usage

## Security

- JWT tokens for API authentication
- SHA-256 password hashing (use BCrypt in production)
- HTTPS/WSS in production
- CORS configuration for allowed origins
- Firebase/APNS for secure push notifications

## Future Enhancements

- [ ] Video calling support
- [ ] Group calls
- [ ] Call history
- [ ] User contacts/friends list
- [ ] Text messaging
- [ ] Screen sharing
- [ ] Call recording
- [ ] Better password hashing (BCrypt)
- [ ] Rate limiting
- [ ] Metrics and monitoring

## License

MIT