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

Install dependencies for each workspace.

```bash
cd frontend
npm install

cd ../backend
npm install
```

## Development

Run the frontend and backend in separate terminals.

```bash
# Frontend
cd frontend
npm run dev

# Backend
cd backend
npm run dev
```

The frontend dev server defaults to [http://localhost:3000](http://localhost:3000) and the backend API to [http://localhost:5000](http://localhost:5000).

## Production Builds

```bash
# Frontend
cd frontend
npm run build
npm run start

# Backend
cd backend
npm run build
node dist/index.js
```

## Environment Variables

Create `.env` files in `frontend/` and `backend/` as needed. Environment examples:

```bash
# backend/.env
PORT=5000
```

Refer to the framework documentation for more configuration options.
