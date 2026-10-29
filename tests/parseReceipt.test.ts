// Run with: npm test
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { amountsIn, parseReceipt, type OcrBox } from '../src/receipt/parseReceipt.ts';

// A text box at (x, y), h tall, optionally tilted by dy across its width
function box(text: string, x: number, y: number, w = text.length * 14, h = 26, dy = 0): OcrBox {
  return { text, confidence: 0.9, quad: [{ x, y }, { x: x + w, y: y + dy }, { x: x + w, y: y + h + dy }, { x, y: y + h }] };
}

// A typical café receipt, split into the boxes the detector returns
const receipt = (totalBoxes: OcrBox[], extra: OcrBox[] = []) => [
  box('COFFEEOCEAN SP. Z O.O.', 120, 20),
  box('ul. Ruska 46, Wrocław', 130, 52),
  box('NIP 899-123-45-67', 150, 84),
  box('2026-10-28', 20, 130), box('nr wydr. 012345', 330, 130),
  box('PARAGON FISKALNY', 140, 170),
  box('Latte duże', 20, 210), box('1 x16,00', 200, 240), box('16,00 B', 400, 240),
  box('Sernik dyniowy', 20, 270), box('1 x18,00', 200, 300), box('18,00 B', 400, 300),
  box('Sp.op.B', 20, 340), box('34,00', 400, 340),
  box('PTU B 8,00%', 20, 370), box('2,52', 410, 370),
  box('SUMA PTU', 20, 400), box('2,52', 410, 400),
  ...totalBoxes,
  box('00123 #Kasa 1 Kasjer 1', 20, 480), box('14:05', 400, 480),
  box('Karta płatnicza', 20, 510), box('34,00 PLN', 360, 510),
  ...extra,
];

test('reads SUMA PLN, not the tax total above it', () => {
  const r = parseReceipt(receipt([box('SUMA PLN', 20, 440, 160, 34), box('34,00', 380, 442, 90, 34)]));
  assert.equal(r.total, 34);
  assert.equal(r.date, '2026-10-28');
  assert.equal(r.time, '14:05');
  assert.equal(r.number, '12345');
  assert.equal(r.nip, '8991234567');
  assert.equal(r.fingerprint, '8991234567|2026-10-28|14:05|12345|34.00');
  assert.ok(r.totalRect && r.totalRect.y >= 430 && r.totalRect.y <= 450);
});

test('label and amount in one box, with a space after the comma', () => {
  assert.equal(parseReceipt(receipt([box('SUMA PLN 84, 20', 20, 440, 400)])).total, 84.2);
});

test('fixes O read for 0 and l read for 1', () => {
  assert.equal(parseReceipt(receipt([box('SUMA PLN', 20, 440), box('l8,5O', 380, 440)])).total, 18.5);
});

test('slightly tilted photo still groups the total line', () => {
  const r = parseReceipt(receipt([box('SUMA PLN', 20, 440, 160, 30, 3), box('56,90', 380, 448, 90, 30, 2)]));
  assert.equal(r.total, 56.9);
});

test('amount detected on its own line just below the label', () => {
  const r = parseReceipt(receipt([box('SUMA PLN', 20, 430), box('71,00', 380, 458)]));
  assert.equal(r.total, 71);
});

test('DO ZAPŁATY and dates written day first', () => {
  const r = parseReceipt([
    box('28.10.2026 17:36', 20, 20), box('DO ZAPŁATY', 20, 80), box('125,40 zł', 300, 80),
  ]);
  assert.equal(r.total, 125.4);
  assert.equal(r.date, '2026-10-28');
  assert.equal(r.time, '17:36');
});

test('falls back to the card payment line when the SUMA line is unreadable', () => {
  const r = parseReceipt(receipt([box('S#M@ P!N', 20, 440)]));
  assert.equal(r.total, 34);
});

test('no total found', () => {
  const r = parseReceipt([box('Hello there', 0, 0), box('just a napkin', 0, 40)]);
  assert.equal(r.total, null);
  assert.equal(r.fingerprint, null);
});

test('amountsIn ignores percentages and quantities', () => {
  assert.deepEqual(amountsIn('PTU B 8,00% 2,52'), [2.52]);
  assert.deepEqual(amountsIn('1 x16,00 16,00 B'), [16, 16]);
  assert.deepEqual(amountsIn('SUMA PLN 1 234,50'), [1234.5]);
});
