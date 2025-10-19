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

## Setup

Install dependencies once from the repository root to pull in all workspace packages (frontend, backend, and shared dev tooling).

```bash
npm install
```

## Development

Run both the Next.js frontend and Express backend together with a single command from the repository root.

```bash
npm run dev
```

This starts the frontend on [http://localhost:3000](http://localhost:3000) and the backend API on [http://localhost:5001](http://localhost:5001). The frontend automatically proxies `/api/*` requests to the backend, so API calls can be made with relative paths like `fetch("/api/health")` without running into CORS issues during development.

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
  NEXT_PUBLIC_API_URL=http://localhost:5001
  ```

- `backend/.env`

  ```bash
  PORT=5001
  ```

Adjust the values as needed for your local setup.
