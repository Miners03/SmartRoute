# SmartRoute - Phase 1 (Backend)

This is Phase 1 only: project setup, PostgreSQL schema, JWT auth with roles, delivery CRUD, CSV import with geocoding. No OSRM/optimization/maps/frontend.

## Prerequisites
- Node.js 20+
- Docker (for Postgres)

## Quick Start

### 1) Start Postgres
```bash
docker compose up -d
```

### 2) Install dependencies (from server/)
```bash
cd server
npm install
```

### 3) Configure env
Copy `.env.example` to `.env` and set values:
```bash
cp .env.example .env
```

### 4) Run migrations
```bash
npm run migrate
```

### 5) Seed users (manager + rider)
```bash
npm run seed
```

### 6) Run server
```bash
npm run dev
```
Health check: GET http://localhost:8080/health

### 7) Run tests
```bash
npm test
```
