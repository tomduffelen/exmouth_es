# Adding a space

Every space on the site is one small file in `data/spaces/`. Adding a space
means creating one of those files and adding its name to a list. You do not
need to touch the HTML, the CSS or the JavaScript.

You can do the whole thing in the browser on github.com if you would rather
not use the command line.

---

## Before you start

Two things to sort out first, because they are the ones that cause problems
later:

**Ask the venue.** Send them a short note saying you would like to list them
for free and asking whether they are happy for their contact address to be
shown. Most say yes and are pleased to be asked. Keep the reply.

**Ask about the photograph.** Do not take a picture from a venue's website or
from Facebook. Either ask them to send you one you can use, or take one
yourself. If you have neither, leave the photo field empty — the site shows
the name on a deep navy panel instead, which looks deliberate rather than
broken.

---

## Step 1 — Make the file

Copy `data/spaces/_template.json` and rename it. The filename becomes the
web address of the page, so use lower case with hyphens and no spaces:

```
data/spaces/beach-gardens-pavilion.json
```

Fill it in. Here is a real one to work from:

```json
{
  "id": "gorfin-hall",
  "name": "Gorfin Hall",
  "org": "Exmouth Town Council",
  "area": "Town centre",

  "setting": "Indoor",
  "capacity": 60,
  "capacityApprox": true,

  "occasions": ["Meeting", "Community event", "Class or workshop", "Party"],
  "features": ["Kitchenette", "Step-free access", "Central location"],

  "priceTier": 1,
  "priceFrom": "Council rate on request",

  "summary": "A modern community hall in a quiet corner of town.",
  "description": "Run by Exmouth Town Council, Gorfin Hall is a modern, adaptable community centre a short walk from the town centre...",

  "image": "assets/img/spaces/gorfin-hall.jpg",
  "imageCredit": "Exmouth Town Council",

  "contact": { "type": "email", "value": "reception@exmouth.gov.uk", "name": "Exmouth Town Council, 01395 276167" },

  "source": "https://exmouth.gov.uk/gorfin-hall/",
  "checked": "2026-09"
}
```

### What each field means

| Field | What to put |
|---|---|
| `id` | Must match the filename exactly, without `.json` |
| `name` | The name of the space itself, not the organisation |
| `org` | Who runs it |
| `area` | Roughly where in Exmouth. Shown after the org |
| `setting` | Exactly `Indoor` or `Outdoor` |
| `lat`, `lng` | The coordinates of the space. See below |
| `capacity` | A plain number, no quote marks, no "approx" |
| `capacityApprox` | `true` if the number is your best guess |
| `occasions` | Pick from the list below. Spelling must match |
| `features` | Free text. Three or four is plenty |
| `priceTier` | `1` modest, `2` mid-range, `3` premium. Drives the budget filter |
| `priceFrom` | Free text shown to people, e.g. `From about £90` |
| `summary` | One sentence for the browse list |
| `description` | A paragraph for the space's own page |
| `image` | Path to the photo, or `""` if you have none |
| `imageCredit` | Who took it, if they asked to be credited |
| `contact` | See below |
| `source` | Where you got the details, so they can be rechecked |
| `checked` | Year and month you verified it, as `2026-09` |

### Occasions

Use these exact words, or the filter will silently miss the space:

`Wedding` · `Party` · `Meeting` · `Community event` · `Wake` ·
`Class or workshop` · `Performance`

To add a new occasion to the whole site, add it to `OCCASIONS` near the top of
`assets/js/app.js` and to the same list in `tools/validate.mjs`.

### Finding the coordinates

Open [Google Maps](https://maps.google.com), search for the venue, then
right-click (or long-press on a phone) exactly on the spot. The coordinates
appear at the top of the menu, ready to copy — something like
`50.6178, -3.4128`. The first number is `lat`, the second is `lng`.

```json
"lat": 50.6178,
"lng": -3.4128,
```

No quote marks around the numbers, and no account or sign-up needed — you're
just using Maps in a browser. `node tools/validate.mjs` will flag a
coordinate that lands outside Exmouth, which usually means a missing minus
sign on the longitude or the two numbers swapped.

The site draws the actual maps using
[Leaflet](https://leafletjs.com) and [OpenStreetMap](https://www.openstreetmap.org)
rather than Google Maps — both entirely free, with no API key and no account
for this project to maintain. Google Maps is just the easiest place to look
a location up.

### Contact

Three kinds, depending on what the venue prefers:

```json
"contact": { "type": "email",  "value": "hello@venue.co.uk", "name": "Who to ask for" }
"contact": { "type": "phone",  "value": "01395 272239",      "name": "Parish Office" }
"contact": { "type": "link",   "value": "https://venue.co.uk/hire", "name": "Their booking page" }
```

`email` gives an enquiry form that opens the visitor's own email app.
`phone` gives a tap-to-call button. `link` sends them to the venue's own page.

---

## Step 2 — Add the photograph

Save it into `assets/img/spaces/` using the same name as the file:

```
assets/img/spaces/beach-gardens-pavilion.jpg
```

Before you commit it, resize it to about **1600px on the long edge** and save
at around 80% quality. A photo straight off a phone is often 5MB, which is
slow on mobile data and will make the site feel cheap. Aim for under 400KB.
[Squoosh](https://squoosh.app) does this in the browser for free.

Landscape shots work best. The browse list crops to a tall portrait shape and
the space page crops wide, so keep the subject roughly central.

---

## Step 3 — Add it to the list

Open `data/spaces/index.json` and add the id. Order in this file is the order
on the site.

```json
[
  "ocean-suite",
  "estuary-suite",
  "beach-gardens-pavilion"
]
```

Watch the commas: every line needs one except the last.

If you have Node installed, you can skip the hand-editing:

```bash
node tools/build-index.mjs
```

---

## Step 4 — Check it

```bash
node tools/validate.mjs
```

This catches the things that are easy to get wrong — a missing comma, an
occasion that does not match, a photo path pointing at nothing, a file you
forgot to add to the index. Fix anything it reports.

If you opened a pull request, this runs automatically and will comment on
your change, so you can rely on that instead.

### Look at it

Open it in a browser through a small local server. Opening `index.html` by
double-clicking will **not** work — browsers block pages loaded that way from
reading the data files.

```bash
python3 -m http.server 8000
```

Then go to `http://localhost:8000`.

---

## Removing or updating a space

To update, edit the file and set `checked` to the month you confirmed it.

To remove, delete the file and take the id out of `index.json`, or run
`node tools/build-index.mjs`. If a venue asks to be removed, do it promptly
and without argument.
