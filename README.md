# SathishAI

SathishAI is a responsive React + Vite shopping comparison workspace with 24 local demonstration products, saved products, comparisons, price alerts, order tracking, theme preferences, and an Express Gemini proxy with a clearly labeled fallback mode.

## Requirements

Node.js 18+ and npm. The project lives at `D:\sathishai`.

## Run locally

```powershell
cd D:\sathishai
npm install
Copy-Item .env.example .env
npm run start
```

Open `http://localhost:5173`. The API health endpoint is `http://localhost:5050/api/health`.

Add your own Gemini key to `D:\sathishai\.env` as `GEMINI_API_KEY=...`. It is read only by the backend and excluded from Git. Without it, the useful catalogue assistant runs in fallback mode.

## Commands

`npm run dev` starts Vite, `npm run server` starts Express, `npm run start` starts both, `npm run lint` checks source, and `npm run build` creates the production frontend build.

## Structure and data

`src/App.jsx` contains reusable workspace views and the local product catalogue. `src/App.css` contains the responsive design. `server.js` owns the API and Gemini proxy. Affiliate links currently point to `example.com/affiliate`; replace them in `src/App.jsx` or move them into an API feed adapter when approved retailer feeds are available.

Amazon, Flipkart, and Meesho content is explicitly demonstration data and is not scraped or live. Orders and price alerts are also demonstration features.

## Connecting retailers

Replace the local catalogue with licensed retailer or affiliate feed adapters in Express. Keep retailer credentials in `.env`, normalize offers into the existing product shape, and add retailer-specific order and price-alert integrations. No retailer account or payment flow is implemented.

## Privacy

Saved products, alerts, theme, and chat history are local browser demonstration state. Affiliate URLs are placeholders. Never commit `.env` or API keys.
