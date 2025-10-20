# SmartSpeak Monorepo

SmartSpeak is a full-stack public speaking coach. The Next.js frontend lets you record or upload a speech, visualise analysis insights, and review your history. The Express backend connects to Azure Speech-to-Text and the OpenAI API, falling back to deterministic sample data during development when credentials are absent.

## Prerequisites

- [Node.js](https://nodejs.org/) 18 or newer
- npm 9 or newer

## Project Structure

```
.
├── backend/   # Express + TypeScript API server + Prisma ORM
└── frontend/  # Next.js App Router client with Tailwind and shadcn/ui
```

## Environment configuration

Create the following files before running the app:

- `frontend/.env.local`

  ```bash
  # Override when the backend runs on a different host/port
  NEXT_PUBLIC_API_URL=http://localhost:5000
  ```

- `backend/.env`

  ```bash
  PORT=5000
  DATABASE_URL="file:./dev.db"
  AZURE_API_KEY=your-azure-speech-key
  AZURE_REGION=your-azure-region
  OPENAI_API_KEY=your-openai-api-key
  ```

> ℹ️ All integrations provide deterministic fallback data when the corresponding API key is not present. This lets you explore the product end-to-end before wiring up external services.

After setting the environment values, create the SQLite database schema:

```bash
npm --workspace backend run prisma:generate
npx prisma migrate deploy --schema backend/prisma/schema.prisma
```

## Installation

Install dependencies for both workspaces from the repository root:

```bash
npm install
```

## Local development

Run the frontend and backend concurrently:

```bash
npm run dev
```

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend API: [http://localhost:5000](http://localhost:5000)

## Production build

```bash
npm run build

# Start the compiled backend
cd backend
npm run start

# Start the Next.js server
cd ../frontend
npm run start
```

## Testing

The backend ships with Jest tests for the speech analysis helpers:

```bash
npm --workspace backend run test
```

You can also lint the frontend project:

```bash
npm --workspace frontend run lint
```

## Key features

- 📼 Upload or live-record audio/video to create transcripts with Azure Speech-to-Text.
- 📊 Analyse pacing, filler words, sentiment, clarity, and organisation using OpenAI (or deterministic fallbacks when offline).
- 🧠 Guided coaching suggestions tailored to each performance.
- 🗂️ History dashboard backed by SQLite/Prisma so returning users can review progress.
