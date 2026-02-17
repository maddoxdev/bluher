# Bluher — VoIP monorepo

Базовый каркас монорепозитория для приложения звонков:

- **Клиент**: Angular + Capacitor.
- **Сервер**: ASP.NET Core + EF Core + PostgreSQL + JWT + SignalR + Redis + Firebase/APNS.
- **Медиа**: WebRTC P2P через STUN/TURN (coturn).

## Структура

```text
apps/
  voip-client/
    angular/
    capacitor/
  voip-server/
    src/
      Voip.Api/
      Voip.Application/
      Voip.Domain/
      Voip.Infrastructure/
    tests/
infra/
  docker-compose.yml
docs/
  architecture.md
```

## Где test-call страница и endpoint

Они находятся **в серверном проекте**:

- HTML: `apps/voip-server/src/Voip.Api/wwwroot/test-call/index.html`
- Страница: `/test-call`
- SignalR Hub: `/hubs/signaling`
- Health check: `/test-call/health`

Запуск:

```bash
cd apps/voip-server/src/Voip.Api
dotnet run
```

Открыть в браузере:

- `http://localhost:5000/test-call` (или ваш порт из логов `dotnet run`)

## Следующие шаги

1. Поднять окружение: PostgreSQL, Redis, coturn.
2. Инициализировать Angular приложение в `apps/voip-client/angular`.
3. Добавить ASP.NET Core solution и проекты в `apps/voip-server/src`.
4. Реализовать JWT auth, SignalR signaling и push-каналы.
