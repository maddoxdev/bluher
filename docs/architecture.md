# Архитектура (черновик)

## Клиент (Angular + Capacitor)

- `core/services` — API, auth, signaling, webrtc.
- `features/auth` — login/register/refresh token.
- `features/calls` — call UI, incoming/outgoing, call state.
- `features/contacts` — контакты и история.
- Capacitor-слой для push-уведомлений и native интеграций.

## Сервер (ASP.NET Core)

- `Voip.Api` — REST API + SignalR Hub.
- `Voip.Application` — use-cases/сервисы.
- `Voip.Domain` — сущности домена.
- `Voip.Infrastructure` — EF Core, Redis, JWT, Push providers.

## Поток звонка

1. Пользователь аутентифицируется по JWT.
2. Клиент подключается к SignalR hub.
3. Инициатор отправляет offer (SDP) через hub.
4. Получатель отправляет answer + ICE candidates.
5. Медиа устанавливается напрямую WebRTC (P2P) через STUN/TURN.
