// Café settings. Everything the café may want to change lives here.

export type Lang = 'en' | 'pl';

export const CONFIG = {
  cafeName: 'CoffeeOcean',

  /** Language the kiosk returns to after each customer. 'device' follows the iPad's language. */
  defaultLanguage: 'device' as Lang | 'device',

  /** Lower bound of each prize tier in zł. A total wins the highest tier it reaches. */
  tiers: { wish: 0, syrup: 26, candies: 41, voucher: 71 },
  voucherValidDays: 14,

  /** Reject receipts printed on another day (only when the date could be read). */
  requireSameDayReceipt: true,
  /** The café's NIP, digits only. When set, receipts showing a different NIP are rejected. */
  cafeNip: null as string | null,

  /** PIN staff enter before typing a total by hand. */
  staffPin: '2610',

  /** Which iPad camera reads receipts. The front camera faces the customer at the counter. */
  cameraFacing: 'front' as 'front' | 'back',
  /** Photos the scanner reads before it gives up and asks to try again or call staff. */
  maxReadAttempts: 3,

  /** Seconds without a touch before the kiosk goes back to the start. */
  idleSeconds: 120,
  /** Seconds the result stays on screen. */
  resultSeconds: 60,

  /** Filled into the rules screen. Empty values show as highlighted placeholders. */
  legal: {
    organiser: '',
    address: '',
    nip: '',
    startDate: '',
    endDate: '',
    email: '',
    altTreat: '',
  },
};
