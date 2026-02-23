# Small Express server

Minimal Express app with Dockerfile and docker-compose.

## Using docker-compose (recommended)

```bash
cd server
cp .env.example .env   # optional: edit .env to set PORT, NODE_ENV
docker compose up -d
```

Server runs on http://localhost:3000 (or the `PORT` in `.env`). To stop: `docker compose down`.

## Build and run with Docker only

```bash
cd server
docker build -t server .
docker run -p 3000:3000 --env-file .env server
```

## .env file

Copy `.env.example` to `.env` and adjust:

- **PORT** – port the app listens on (default 3000). Compose maps this to the host.
- **NODE_ENV** – e.g. `production` or `development`.

`.env` is gitignored; do not commit it.

## Run locally (no Docker)

```bash
cd server
cp .env.example .env
npm install
npm start
```

## Endpoints

- `GET /` — JSON hello
- `GET /health` — returns 200 OK
- `GET /api-docs` — **Swagger UI** (interactive API docs)
