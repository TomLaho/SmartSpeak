# SmartSpeak Dev Verification

1) From repo root:
   npm install
   npm run dev
2) Backend logs show: [backend] Listening on http://0.0.0.0:5000
3) Open http://localhost:5000/api/health → returns JSON { status: "ok", backend: "online", ... }
4) Open http://localhost:3000 and click "Re-check" in the UI → it should report backend online.
