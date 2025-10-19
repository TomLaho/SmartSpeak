# SmartSpeak Monorepo

This repository contains the initial scaffolding for the SmartSpeak application. It provides a Next.js frontend using the App Router, Tailwind CSS, and shadcn/ui, along with a TypeScript-powered Express backend.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm 9 or newer

## Project Structure

```
.
├── backend/   # Express + TypeScript API server
└── frontend/  # Next.js 14 App Router client
```

## Quickstart

Install dependencies once from the repository root to pull in all workspace packages (frontend, backend, and shared dev tooling).

```bash
npm install
```

Then start both the frontend and backend with a single command:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)

The frontend automatically proxies `/api/*` requests to the backend, so API calls can be made with relative paths like `fetch("/api/health")` without running into CORS issues during development.

## Production Builds

```bash
# Build both workspaces
npm run build

# Start frontend
cd frontend
npm run start

# Start backend (after building)
cd ../backend
npm run start
```

## Testing

Use the available npm scripts within each workspace to validate the project locally.

```bash
# Frontend
npm run lint

# Backend
npm --workspace backend run build
```

## Environment Variables

- `frontend/.env.local`

  ```bash
  NEXT_PUBLIC_API_URL=http://localhost:5000
  ```

- `backend/.env` *(optional)*

  ```bash
  PORT=5000
  ```

Adjust the values as needed for your local setup.
