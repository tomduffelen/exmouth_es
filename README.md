# Exmouth Spaces

A free, volunteer-run directory of halls, rooms and outdoor spaces to hire in
Exmouth, Devon. Someone can filter to what they need, look at the space, and
contact the venue directly. No accounts, no booking fees, no commission.

**Adding a space?** → [`docs/adding-a-space.md`](docs/adding-a-space.md)

---

## How it is built

A plain static site. No framework, no build step, no database, no server code.
Three files do the work and the rest is content. It will run on GitHub Pages
for nothing, indefinitely, and it will still run in ten years.

```
├── index.html                  the page shell — structure only
│
├── assets/
│   ├── css/site.css            all styling. Colours and type are variables at the top
│   ├── js/app.js               the whole application, about 400 lines
│   └── img/spaces/             one photograph per space
│
├── data/
│   └── spaces/
│       ├── index.json          which spaces to show, and in what order
│       ├── _template.json      copy this to add a space
│       └── <space-id>.json     one file per space
│
├── tools/
│   ├── build-index.mjs         regenerates index.json from the files present
│   └── validate.mjs            checks every space file before it goes live
│
├── docs/adding-a-space.md      the contributor guide
└── .github/                    issue template and the check that runs on PRs
```

The split matters: **adding a space never means touching code.** It is one
new file in `data/spaces/` and one line in `index.json`. Content and code stay
apart, so a volunteer who has never written HTML can add a venue, and a broken
entry can only break itself.

---

## Running it locally

You need a small web server. Opening `index.html` by double-clicking will not
work, because browsers block pages loaded from the filesystem from reading the
data files.

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`. Any equivalent works — `npx serve`, the
Live Server extension in VS Code, whatever you already have.

## Checking your changes

```bash
node tools/validate.mjs      # catches typos, missing files, bad values
node tools/build-index.mjs   # rebuilds index.json from the folder
```

Neither installs anything. Node 18 or newer.

---

## Publishing

Settings → Pages → deploy from the `main` branch, root folder. That is the
whole deployment. Pushing to `main` updates the live site within a minute.

For a custom domain, add a file called `CNAME` at the root containing the
domain, and point a CNAME record at `<your-org>.github.io`.

---

## House rules

**Ask before listing.** Contact the venue, tell them what this is, and check
they are happy for their address to be shown. Keep the reply.

**Never take a photograph from someone's website or Facebook.** Ask the venue
for one, or take your own. A space with no photo looks fine — the name shows
on a navy panel — so an empty `image` field is always better than one you do
not have permission for.

**Date everything.** The `checked` field is what keeps this trustworthy. If
you cannot verify a detail, leave it out rather than guessing.

**Remove on request, without argument.** If a venue asks to come off, do it.

---

## Design

Set once in `assets/css/site.css`, in the variables at the top. Marcellus for
names, Jost for everything else. The palette is warm paper, ink navy
(`#0F2440`, a deepened form of the Exmouth blue `#1C4F97`) and a sand accent.
The blue is deliberately rare — the contact bar and the back button only.
Photographs carry the colour, which is why they are given so much room.

## Licence

Code is MIT — reuse it for your own town, that is the point. The content
about each venue belongs to the venues. Photographs belong to whoever took
them.
