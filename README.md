# IEP Timeline Calculator

Static site. No server, no database.

- `src/states.js`: one entry per state (rules table, FAQ, example school calendar).
- `src/calc.js`: deadline engine (runs in the browser and in Node).
- `scripts/build.js`: builds `public/`. Run `SITE_URL=https://your-domain node scripts/build.js`.
- `scripts/test.js`: hand-checked cases. Run `node scripts/test.js` before every push.

Vercel serves `public/` as is (see `vercel.json`).
