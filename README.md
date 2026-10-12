# One Day Closer — Exam Week 🩺

A small bilingual (English / French) gift website for my brother's exam week, **October 12–15, 2026**.
Each day unlocks a quote, a letter, a "prescription" tip, a secret envelope, and a little celebration.
The final day unlocks a last surprise.

Plain HTML, CSS and JavaScript: no database, no account, no tracking.

## Files

```
index.html        the page
css/style.css     all the styling
js/content.js     ✏️ ALL THE TEXT: edit messages here
js/app.js         how the site works (dates, language, surprises, confetti)
sw.js             keeps it working offline once opened
assets/           icon
```

## Changing the messages

Open `js/content.js`. Every text has an `en` and an `fr` version. Change the words inside the quotes and keep the rest as it is.
- `name`: his name in "Hey …," (empty = "Doc")
- `signature`: how the letters are signed
- `days`: the four days (quote, letter, tip, secret note, joke, "done" message)
- `final.note`: the most personal message, shown on the last screen

Anyone can read this file, so don't put anything private in it.

## Preview on your computer

```bash
npx serve .
```

Then open the address it prints. To see another day, add `?date=` to the address, for example
`http://localhost:3000/?date=2026-10-15`.

## Publish (free)

**Vercel:** vercel.com → Add New → Project → import this repo → Deploy. Every push to `main` updates the site.
**GitHub Pages** also works: repo Settings → Pages → deploy from branch `main`, folder `/ (root)`.
