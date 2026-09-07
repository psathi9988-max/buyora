# Buyora - AI Shopping Assistant

Buyora is a responsive React + Vite shopping comparison platform with 24 curated products across Smartphones and Fashion, saved items, price alerts, order tracking, settings, multi-store price comparisons, and automated Amazon India affiliate link generation.

## Amazon Affiliate Automation

- **Store / Tracking ID**: `buyora210b-21` (configurable via `AMAZON_ASSOCIATE_TAG`).
- **Exact ASIN Mapping**: Map product IDs (e.g., `phone-1`) in `backend/amazon_products.json` to verified 10-character ASINs or standard HTTPS `amazon.in` product URLs.
- **Search Amazon Fallback**: When an exact ASIN mapping is absent, store comparisons automatically generate a compliant search query link tagged with `tag=buyora210b-21` and clearly labeled **"Search Amazon"**.
- **Transparency & Honesty**: Real Amazon prices and inventory require official Product Advertising API access; prices and delivery are accurately displayed as *"Check on Amazon"*. Other store offers remain simulation comparisons.
- **Associate Disclosure**: Includes the required Amazon Associate disclosure.

## Backend & API

The project supports both a standalone Python FastAPI backend and Netlify serverless functions:
- **FastAPI Backend**: Located in `backend/main.py` with SQLite database, duplicate cleanup, and CORS support.
- **Netlify Functions**: Located in `netlify/functions/api.js` for zero-configuration serverless API execution on Netlify.

### Run Locally

#### Frontend:
```powershell
cd D:\sathishai
npm install
npm run dev
```

#### FastAPI Backend:
```powershell
cd D:\sathishai\backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

### Run Tests

```powershell
$env:PYTHONPATH="D:\sathishai\backend"; python -m unittest discover -s D:\sathishai\backend -p "test_*.py"
npm --prefix D:\sathishai run build
```
