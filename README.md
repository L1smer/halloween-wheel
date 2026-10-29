# CoffeeOcean Halloween Wheel

An iPad kiosk app for the Halloween promotion. A customer scans their receipt, spins the wheel and gets a prize. The prize comes from the receipt total, never from chance:

| Receipt total | Prize |
| --- | --- |
| 0 – 25,99 zł | A Halloween wish, written on screen |
| 26 – 40,99 zł | Free syrup in a drink |
| 41 – 70,99 zł | A handful of candies |
| 71 zł and more | 50% off one large drink, valid 14 days |

The app runs in portrait on any iPad with iPadOS 17 or later, in English and Polish. Receipts are read on the iPad itself with [React Native ExecuTorch](https://docs.swmansion.com/react-native-executorch/docs/extensions/optical-character-recognition) OCR (PP-OCRv6 on Core ML). No photo ever leaves the device, and each photo is deleted as soon as it has been read.

## Screens

1. **Welcome**: the title, a slowly turning wheel, **Scan receipt** and a link to the rules.
2. **Scanner**: the front camera reads the receipt about once a second. When it finds the total it freezes the photo, highlights the total and counts it up. Staff can type the total instead (PIN first).
3. **Wheel**: one tap spins it. It always stops on the prize the total has earned.
4. **Result**: the prize with a code to show at the counter, or the wish written out letter by letter. It goes back to the start after 60 seconds.
5. **Rules**: the prize table and the terms, reached from the welcome screen.

Every screen has the EN/PL switch, a sound toggle and a home button. After each customer, and after 2 minutes without a touch, the app returns to the welcome screen in the café's default language.

## Put it on the iPad

The app uses native code (camera, ExecuTorch, Skia), so it needs its own build. Expo Go cannot run it. There are two ways to build.

### A. On a Mac with Xcode

1. Install [Node.js](https://nodejs.org) 22 or later and the latest Xcode, then in this folder run:
   ```sh
   npm install
   ```
   React Native ExecuTorch downloads its native libraries in an install script. If your npm skips install scripts (npm 12 does this by default), run `npm approve-scripts react-native-executorch` and then `npm rebuild react-native-executorch`.
2. Connect the iPad with a cable, turn on Developer Mode on the iPad (Settings → Privacy & Security), and run:
   ```sh
   npx expo run:ios --device --configuration Release
   ```
   Xcode asks you to pick a signing team the first time. A free Apple ID works for testing, but the app then expires after 7 days. A paid Apple Developer account keeps it working for a year.

### B. In the cloud with EAS (no Mac needed)

1. Create a free account at [expo.dev](https://expo.dev). You need a paid Apple Developer account.
2. Run:
   ```sh
   npm install
   npx eas-cli login
   npx eas-cli device:create        # register the café iPad, open the link on the iPad
   npx eas-cli build --profile preview --platform ios
   ```
3. Open the link EAS gives you on the iPad to install the app.

### First launch

The iPad needs internet the first time the app opens. It downloads the OCR model once (up to about 25 MB) and keeps it. The scanner shows the download progress. Allow camera access when the iPad asks.

## Set it up as a kiosk

- **Guided Access** locks the iPad to this app: Settings → Accessibility → Guided Access → On, then open the app and triple-click the top (or home) button.
- The app keeps the screen awake by itself while it is open.
- Put the iPad on a stand in portrait, with the front camera at the top, where customers can hold a receipt up to it.
- Turn the volume up a little: the wheel ticks, and the win has its own sound. Customers can mute it with the speaker button.

## Café settings

Everything the café may want to change is in [`src/config.ts`](src/config.ts). After a change, build the app again.

| Setting | Default | What it does |
| --- | --- | --- |
| `tiers` | 0 / 26 / 41 / 71 | Lowest total, in zł, for each prize |
| `voucherValidDays` | 14 | How long the 50% voucher is valid |
| `staffPin` | `2610` | PIN staff enter before typing a total by hand. **Change it.** |
| `cafeNip` | not set | The café's NIP. When set, receipts with a different NIP are refused |
| `requireSameDayReceipt` | on | Refuses receipts printed on another day |
| `defaultLanguage` | `device` | `en`, `pl`, or the iPad's language |
| `cameraFacing` | `front` | Use `back` if the iPad lies flat and reads receipts from above |
| `idleSeconds` | 120 | Back to the start after this long without a touch |
| `resultSeconds` | 60 | How long the prize stays on screen |
| `legal` | empty | Organiser, address, NIP, dates, email and the alternative treat. Empty fields show as highlighted placeholders in the rules |

All text is in [`src/i18n/en.ts`](src/i18n/en.ts) and [`src/i18n/pl.ts`](src/i18n/pl.ts), including the rules and the seven Halloween wishes.

## How a receipt is checked

- The OCR finds the text lines on the photo and the app looks for the total on a Polish fiscal receipt: `SUMA PLN`, then `DO ZAPŁATY`, `RAZEM` or `SUMA`. It ignores the VAT lines (`SUMA PTU`). If no label is found, it uses the card or BLIK payment amount.
- It also reads the date, time, receipt number and NIP. A receipt from another day is refused.
- Each receipt is remembered on the iPad by its NIP, date, time, number and total, so the same receipt cannot spin twice.
- If the camera cannot find a total after 3 tries, the customer can try again or ask staff, who type the total after the PIN.
- Every prize is logged on the iPad (code, prize, total, time, typed by staff or not).

## Brand

Colours and fonts are in [`src/theme.ts`](src/theme.ts): deep navy, ocean blue, foam white and one pumpkin orange for Halloween. The headings use Unbounded, the text uses Onest and the codes use IBM Plex Mono. The CoffeeOcean name in the top bar is set in type for now. Replace it in [`src/components/TopBar.tsx`](src/components/TopBar.tsx) once the logo file is ready, and swap `assets/icon.png` for a branded icon.

## For developers

```sh
npm test            # receipt reader tests
npm run typecheck   # TypeScript
npx expo start --web
```

The web preview fakes the camera and OCR with sample receipts so the screens can be checked in a browser. Open a screen directly with `?screen=result&total=84.2&lang=pl` (screens: `welcome`, `scan`, `wheel`, `result`, `rules`; add `&wish=0`–`6` to pick a wish).

| Folder | What is inside |
| --- | --- |
| `src/screens` | The five screens |
| `src/components` | Wheel, buttons, viewfinder, keypad, reveal animations, waves |
| `src/ocr` | ExecuTorch OCR on iOS (`engine.ts`) and the web stand-in (`engine.web.ts`) |
| `src/receipt` | Finding the total on a receipt, and remembering used receipts |
| `src/i18n` | English and Polish text |
| `scripts/make-sounds.mjs` | Makes the sound effects (`npm run sounds`) |

Built with Expo SDK 58, React Native 0.88, Reanimated 4, react-native-svg and React Native ExecuTorch 0.11.
