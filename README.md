# Gym Quest — MVP v2.0 (PostgreSQL)

Геймификация + предиктивный retention для фитнес-клубов.

## Быстрый старт (Docker)

```bash
cp server/.env.example server/.env
# Отредактировать .env (обязательно: JWT_SECRET)
docker-compose up -d
```

Готово: http://localhost:3000

## Без Docker

```bash
# Установить PostgreSQL 16
createdb gymquest
cp server/.env.example server/.env
# Отредактировать .env
cd server && npm install && node index.js
```

## Деплой на VPS

1. VPS с Ubuntu 22+ → установить Docker и Docker Compose
2. `git clone` → `cp server/.env.example server/.env` → настроить секреты
3. `docker-compose up -d`
4. Nginx reverse proxy (`nginx.conf` из проекта)
5. SSL: `sudo certbot --nginx -d gymquest.ru`

## Мобильное приложение (Expo)

```bash
cd mobile
npm install
npx expo start
```

Сборка: `eas build --platform android` / `eas build --platform ios`

## Структура

```
gymquest/
├── server/
│   ├── index.js             # API (Express + PostgreSQL, 25 эндпоинтов)
│   ├── package.json         # Серверные зависимости
│   └── .env.example         # Шаблон конфигурации
├── client/
│   └── index.html           # SPA-приложение атлета
├── dashboard/
│   └── index.html           # Панель управления клуба
├── mobile/
│   ├── App.js               # Expo-приложение (WebView + натив)
│   ├── app.json             # Конфигурация Expo
│   └── package.json         # Мобильные зависимости
├── Dockerfile
├── docker-compose.yml
├── ecosystem.config.js      # PM2 (cluster mode)
├── nginx.conf               # Reverse proxy + SSL
├── deploy.yml               # GitHub Actions CI/CD
└── README.md
```

## Переменные окружения

| Переменная | Описание | Обязательна |
|---|---|---|
| `PORT` | Порт сервера (по умолчанию 3000) | Нет |
| `NODE_ENV` | `production` / `development` | Да |
| `DATABASE_URL` | PostgreSQL connection string | Да |
| `JWT_SECRET` | Секрет JWT (64+ случайных символа) | Да |
| `SMTP_HOST` | SMTP-сервер для email-алертов | Нет |
| `SMTP_PORT` | Порт SMTP (по умолчанию 587) | Нет |
| `SMTP_USER` | SMTP логин | Нет |
| `SMTP_PASS` | SMTP пароль | Нет |
