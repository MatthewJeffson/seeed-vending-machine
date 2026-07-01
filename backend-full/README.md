# Backend Full

This folder contains the full **backend-center** implementation:

- Node.js + Express server
- CSV-based storage
- product image assets
- friendly dashboard with clickable product cards
- RFID payload generation flow
- frontend-1 verification APIs
- inventory refill, reserve, and release logic

## Features added

1. Product images included locally under `public/assets/products/`
2. Product feature bullets shown in the dashboard
3. Clickable product cards for product selection
4. More user-friendly dashboard layout
5. Tables for orders, customers, inventory logs, and devices
6. Refill actions directly in the inventory table
7. Copy-to-clipboard for RFID payload

## Run

```bash
npm install
npm start
```

Open:

```text
http://localhost:3000
```

## Main API endpoints

- `GET /api/dashboard`
- `POST /api/orders/create-and-prepare-card`
- `POST /api/products/:productId/refill`
- `POST /api/orders/:orderNumber/cancel`
- `POST /api/frontend/verify-card`
- `POST /api/frontend/dispense-complete`

## RFID payload written to card

```json
{
  "user_name": "alice",
  "order_number": "ORD-...",
  "v": 1
}
```

## Notes

- Inventory is checked and reserved **before card writing**, which matches your intended process.
- The order can only be used one time.
- If an order is cancelled before dispensing, inventory is returned automatically.

## CSV header mismatch fix

If you previously ran the first updated package and saw `column header mismatch expected: 15 columns got: 17`, replace `data/products.csv` with the version in this ZIP. The issue was caused by unescaped commas in product feature text.

## Wio Terminal RFID writer

See `wio-rfid-writer/README.md`. The dashboard creates a writer job whenever an order is created. The Wio Terminal polls for the job, writes the RFID card, and reports success or failure to the backend.
