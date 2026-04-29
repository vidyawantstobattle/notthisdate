# Not This Date 🏖️

A reverse-availability trip planner for coordinating group trips. Instead of marking when you're available, everyone marks when they're **NOT** available!

## Features

- **Submit Unavailability**: Select dates you can't make it using a calendar picker
- **Visual Calendar**: See a color-coded view of July/August 2026
  - 🟢 Green = Everyone available
  - ⬜ Gray gradient = Some people unavailable (progressively darker)
  - ⬛ Dark gray = All 12 people unavailable
- **Click for Details**: Click any date to see exactly who's available/unavailable

## Tech Stack

- Frontend: Vanilla HTML/CSS/JS with Flatpickr for date selection
- Backend: Netlify Functions (serverless)
- Database: Netlify Blobs (built-in key-value storage)

## Local Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Install Netlify CLI globally (if not already):
   ```bash
   npm install -g netlify-cli
   ```

3. Run locally:
   ```bash
   npm run dev
   ```
   or
   ```bash
   netlify dev
   ```

4. Open http://localhost:8888

## Deploy to Netlify

### Option 1: Via Netlify CLI

1. Login to Netlify:
   ```bash
   netlify login
   ```

2. Initialize the site:
   ```bash
   netlify init
   ```

3. Deploy:
   ```bash
   netlify deploy --prod
   ```

### Option 2: Via GitHub

1. Push this repo to GitHub
2. Connect the repo to Netlify at https://app.netlify.com
3. Netlify will auto-deploy on every push

## Customization

### Change the friends list

Edit the `FRIENDS` array in `public/app.js` and the `<select>` options in `public/index.html`:

```javascript
const FRIENDS = ['Alex', 'Ben', 'Chris', ...];
```

### Change the total count

Update `TOTAL_PEOPLE` in `public/app.js`:

```javascript
const TOTAL_PEOPLE = 12;
```

### Change the year/months

Update `YEAR` in `public/app.js` and the min/max dates in `initDatePicker()`.

## License

MIT

