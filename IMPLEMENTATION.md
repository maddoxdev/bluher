# VoIP Application - Implementation Summary

## Overview

This repository contains a complete VoIP (Voice over IP) application built with modern technologies and designed for scalability.

## Technology Stack

### Backend
- **Framework**: ASP.NET Core 10.0
- **Database**: PostgreSQL with Entity Framework Core
- **Authentication**: JWT Bearer tokens
- **Real-time Communication**: SignalR
- **Caching/Scaling**: Redis (optional for development, required for production)
- **Push Notifications**: Firebase Cloud Messaging (Android) and APNS (iOS)

### Frontend
- **Framework**: Angular 21 (standalone components)
- **Mobile Support**: Capacitor
- **Real-time Client**: @microsoft/signalr
- **Media**: WebRTC for peer-to-peer audio/video

### Infrastructure
- **Containerization**: Docker
- **Orchestration**: Kubernetes with Horizontal Pod Autoscaling
- **TURN Server**: coturn for NAT traversal
- **Reverse Proxy**: nginx (for client static files)

## Key Features

### 1. User Management
- User registration with email and password
- JWT-based authentication
- Secure password storage (with production guidelines)
- Device token management for push notifications

### 2. Real-time Presence
- Online/offline status tracking
- Distributed presence management via Redis
- Real-time status updates via SignalR

### 3. Voice Calling
- WebRTC-based peer-to-peer audio calls
- STUN server integration for NAT traversal
- TURN server support for relay when P2P fails
- Call state management (initiating, ringing, answered, ended)

### 4. Signaling
- SignalR hub for WebRTC signaling
- SDP offer/answer exchange
- ICE candidate exchange
- Call control (initiate, answer, decline, end)

### 5. Push Notifications
- Firebase Cloud Messaging for Android
- Apple Push Notification Service for iOS
- Automatic notification for incoming calls when offline

### 6. Scalability
- Stateless server architecture
- Redis backplane for SignalR (enables multiple server instances)
- Distributed cache for connection tracking
- Kubernetes Horizontal Pod Autoscaler
- PostgreSQL for persistent storage

## Architecture Highlights

### Stateless Design
The server is designed to be completely stateless:
- No in-memory session state
- All connections tracked in Redis (distributed cache)
- Database for persistent data
- Can scale horizontally without session affinity

### WebRTC Flow
1. **Initiate Call**: Caller sends initiate request via SignalR
2. **Offer**: Caller creates WebRTC offer (SDP) and sends via SignalR
3. **Answer**: Callee receives offer, creates answer, sends back via SignalR
4. **ICE Exchange**: Both peers exchange ICE candidates
5. **P2P Connection**: Direct peer-to-peer audio stream established
6. **Fallback**: If P2P fails, media relayed through TURN server

### Kubernetes Deployment
- **3+ server replicas** for high availability
- **Redis** for SignalR backplane and distributed cache
- **PostgreSQL** with persistent volume for data
- **Load balancer** for distributing traffic
- **Health checks** for automatic pod recovery
- **HPA** for automatic scaling based on CPU/memory

## Project Structure

```
bluher/
├── server/                      # ASP.NET Core backend
│   ├── Controllers/            # REST API endpoints
│   │   ├── AuthController.cs  # Authentication endpoints
│   │   └── HealthController.cs # Health check for K8s
│   ├── Hubs/                   # SignalR hubs
│   │   └── SignalingHub.cs    # WebRTC signaling hub
│   ├── Services/               # Business logic
│   │   ├── AuthService.cs     # Authentication service
│   │   └── PushNotificationService.cs # FCM/APNS
│   ├── Models/                 # Domain models
│   │   ├── User.cs            # User entity
│   │   ├── Call.cs            # Call entity
│   │   └── AuthModels.cs      # DTOs
│   ├── Data/                   # Database context
│   │   ├── VoipDbContext.cs   # EF Core context
│   │   └── VoipDbContextFactory.cs # Design-time factory
│   └── Migrations/             # EF Core migrations
├── client/                      # Angular frontend
│   └── src/app/
│       ├── components/         # UI components
│       │   ├── auth/          # Login/Register
│       │   └── call/          # Call interface
│       ├── services/          # Angular services
│       │   ├── auth.service.ts        # Authentication
│       │   ├── signaling.service.ts   # SignalR client
│       │   └── webrtc.service.ts      # WebRTC logic
│       └── models/            # TypeScript models
├── k8s/                        # Kubernetes manifests
│   ├── namespace.yaml         # Namespace definition
│   ├── postgres.yaml          # PostgreSQL deployment
│   ├── redis.yaml             # Redis deployment
│   ├── server-deployment.yaml # Server deployment + HPA
│   └── client-deployment.yaml # Client deployment
├── docker-compose.yml          # Local development setup
├── Dockerfile.server           # Server container image
├── Dockerfile.client           # Client container image
├── start-dev.sh               # Development startup script
├── deploy-k8s.sh              # Kubernetes deployment script
├── README.md                  # User documentation
├── SECURITY.md                # Security guidelines
└── IMPLEMENTATION.md          # This file
```

## Development Workflow

### Local Development
```bash
# Start infrastructure (PostgreSQL, Redis, TURN)
docker-compose up -d postgres redis coturn

# Run server
cd server
dotnet build
dotnet ef database update
dotnet run

# Run client (in another terminal)
cd client
npm install
npm start
```

Or use the convenience script:
```bash
./start-dev.sh
```

### Building Docker Images
```bash
docker build -t voip-server:latest -f Dockerfile.server .
docker build -t voip-client:latest -f Dockerfile.client .
```

### Deploying to Kubernetes
```bash
./deploy-k8s.sh
```

Or manually:
```bash
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/postgres.yaml
kubectl apply -f k8s/redis.yaml
kubectl apply -f k8s/server-deployment.yaml
kubectl apply -f k8s/client-deployment.yaml
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login and receive JWT token
- `POST /api/auth/device-token` - Update push notification token

### Health Check
- `GET /health` - Health status (for Kubernetes probes)

### SignalR Hub (/hubs/signaling)
- `InitiateCall(calleeId)` - Start a call
- `SendOffer(calleeId, sdp)` - Send WebRTC offer
- `SendAnswer(callerId, sdp, callId)` - Send WebRTC answer
- `SendIceCandidate(targetUserId, candidate)` - Exchange ICE candidates
- `DeclineCall(callId, callerId)` - Decline incoming call
- `EndCall(callId, otherUserId)` - End active call
- `GetOnlineUsers()` - Get list of online users

## Configuration

### Server Configuration
Key configuration in `appsettings.json`:
- **Database**: PostgreSQL connection string
- **Redis**: Connection string for SignalR backplane and distributed cache
- **JWT**: Secret key, issuer, and audience

### Client Configuration
- **API URL**: Set in `auth.service.ts` and `signaling.service.ts`
- **SignalR Hub**: WebSocket endpoint for real-time communication
- **STUN/TURN**: Configured in `webrtc.service.ts`

### Environment-specific Settings
Use environment variables for production:
```bash
export ConnectionStrings__DefaultConnection="Host=prod-db;Database=voipdb;..."
export ConnectionStrings__Redis="prod-redis:6379,password=..."
export Jwt__Key="your-production-secret-key"
```

## Security Considerations

⚠️ **IMPORTANT**: See [SECURITY.md](SECURITY.md) for detailed security requirements.

Key points:
1. **Password Hashing**: Current SHA-256 is for development only. Use BCrypt/Argon2 in production.
2. **JWT Secrets**: Never commit secrets. Use environment variables or key vaults.
3. **Database Credentials**: Use Kubernetes Secrets, not plain text.
4. **HTTPS/WSS**: Always use TLS in production.
5. **TURN Server**: Enable authentication and TLS.
6. **CORS**: Restrict to production domains only.

## Testing

### Manual Testing
1. Register two users
2. Log in with both users (use different browsers/devices)
3. Initiate a call from one user to another
4. Accept the call
5. Verify audio connection
6. End the call

### Load Testing
The architecture supports horizontal scaling. Test with:
- Multiple server replicas
- Redis backplane enabled
- Kubernetes HPA configured

## Monitoring and Observability

Recommended additions for production:
- Application Insights or Prometheus for metrics
- Structured logging with Serilog
- Distributed tracing with OpenTelemetry
- Alert configuration for critical errors

## Known Limitations

1. **Audio Only**: Current implementation supports audio calls only (video can be added)
2. **1-to-1 Calls**: No group calling support yet
3. **Call History**: Not persisted in database (calls are tracked but not historical)
4. **Password Hashing**: Uses SHA-256 for simplicity (needs BCrypt for production)
5. **No Rate Limiting**: Should add rate limiting for production

## Future Enhancements

- [ ] Video calling support
- [ ] Group calls (multi-party conferencing)
- [ ] Call history and recording
- [ ] Text messaging
- [ ] Screen sharing
- [ ] User contacts/friends list
- [ ] Better password hashing (BCrypt/Argon2)
- [ ] Rate limiting and DDoS protection
- [ ] Metrics and monitoring dashboard
- [ ] Mobile app builds (iOS/Android)

## License

MIT License

## Contributors

Built as a complete VoIP solution demonstrating:
- Modern .NET architecture
- Real-time communication with SignalR
- WebRTC peer-to-peer media
- Cloud-native deployment patterns
- Kubernetes scalability best practices
