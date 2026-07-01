#!/bin/sh

BASE="http://localhost:3000"

echo "Health:"
curl -s "$BASE/health"
echo
echo

echo "Direct card check:"
curl -s -X POST "$BASE/machine/card-check" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "card_uid=11%204A%2047%20A0"
echo
echo

echo "Prepaid card check:"
curl -s -X POST "$BASE/machine/card-check" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "card_uid=17%206C%20EE%20EA"
echo
echo

echo "Direct purchase:"
curl -s -X POST "$BASE/machine/direct-purchase" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  --data "card_uid=11%204A%2047%20A0&q1=1&q2=0&q3=0&q4=0"
echo
echo
