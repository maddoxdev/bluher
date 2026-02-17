# Voip.Api

Минимальный сервер для теста звонка 1-на-1 через WebRTC + SignalR.

## Что есть

- HTML-страница теста: `wwwroot/test-call/index.html`
- endpoint страницы: `/test-call`
- endpoint хаба: `/hubs/signaling`
- health-check: `/test-call/health`

## Запуск

```bash
cd apps/voip-server/src/Voip.Api
dotnet run
```

Откройте в браузере URL, который выведет `dotnet run`, например:

- `http://localhost:5000/test-call`

Для проверки, что endpoint поднялся:

- `http://localhost:5000/test-call/health`
