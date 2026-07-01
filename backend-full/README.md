# Wio CSV Backend

This backend is designed to match the working Wio Terminal code that posts form data and expects simple text responses.

## Files

- `data/cards.csv`: card UID, user name, mode, and direct balance
- `data/orders.csv`: prepaid orders linked to card UID
- `data/inventory.csv`: stock and price for 4 servo products
- `data/transactions.csv`: backend action log

## Install

```bash
npm install
```

## Run

```bash
npm start
```

The backend runs on:

```text
http://localhost:3000
```

## Find your laptop IP

On Windows:

```bash
ipconfig
```

Use the IPv4 address on the same WiFi as the Wio Terminal.

On macOS:

```bash
ifconfig | grep "inet "
```

## Wio code setting

In the working Wio code, change:

```cpp
const char* BACKEND_BASE_URL = "http://192.168.1.100:3000";
```

to your laptop IP, for example:

```cpp
const char* BACKEND_BASE_URL = "http://192.168.1.23:3000";
```

Do not add a trailing slash.

## API

### POST /machine/card-check

Input:

```text
card_uid=11%204A%2047%20A0
```

Response examples:

```text
DIRECT|20.00
PREPAID|ORD-001|1,0,0,0
ERROR|UNKNOWN_CARD
```

### POST /machine/redeem-order

Input:

```text
card_uid=17%206C%20EE%20EA&order_number=ORD-001
```

Response examples:

```text
APPROVED|1,0,0,0
DENIED|ALREADY_USED
DENIED|OUT_OF_STOCK
```

### POST /machine/direct-purchase

Input:

```text
card_uid=11%204A%2047%20A0&q1=1&q2=0&q3=0&q4=0
```

Response examples:

```text
APPROVED|15.00|1,0,0,0
DENIED|INSUFFICIENT_BALANCE
DENIED|OUT_OF_STOCK
```

## Browser check

Open:

```text
http://localhost:3000/admin/data
```

This shows the CSV data as JSON for quick checking.
