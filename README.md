# Yogathipan & Selvarani · Engagement Invitation

A cinematic, scroll-driven South Indian engagement invitation for:

- **Groom:** Yogathipan Shanmugam
- **Bride:** Selvarani Chelvakumaran
- **When:** Saturday, 24 October 2026 · 7:00 PM
- **Where:** No. 5, Lorong 1A/71E, Off Jalan Carey, Petaling Jaya, Selangor

It's a plain static website: HTML, CSS and vanilla JavaScript, with GSAP + ScrollTrigger and Lenis loaded from a CDN. There is no build step.

```
/
├── index.html            structure & ornaments (inline SVG)
├── css/style.css         design system & layout
├── js/config.js          ← EVERYTHING you normally edit lives here
├── js/main.js            scroll engine, video manager, animations, music, RSVP/calendar
├── google-apps-script/
│   └── Code.gs           saves RSVP form replies into your Google Sheet
└── assets/
    ├── video/            scene videos
    ├── images/           card, groom, bride, ornaments
    │   └── posters/      one still image per video (first frame recommended)
    └── audio/            background music & optional sound effects
```

---

## 1. Run it

Open `index.html` directly in a browser, or (recommended, so videos stream correctly) start a basic local server in this folder:

```bash
npx serve .            # or
python3 -m http.server 8080
```

Then visit `http://localhost:8080` (or the address `serve` prints).

The site also works before you add any media. Each missing video falls back to its poster image, and if there's no poster it shows designed maroon-and-gold artwork (temple arch, lamp, lotus or kolam). Visitors never see a broken video icon.

---

## 2. Where to put your files

### Videos → `assets/video/`

| Scene | File name |
|---|---|
| Palace doors open | `scene01_doors.mp4` |
| Mandapam | `scene02_mandapam.mp4` |
| Vinayagar with the invitation | `scene03_vinayagar.mp4` |
| FPV hand reaches for the invitation | `scene04_invitation.mp4` |
| The card opens | `scene05_card_open.mp4` |
| Groom walks in | `scene06_groom.mp4` |
| Bride walks in | `scene07_bride.mp4` |
| They meet | `scene08_meeting.mp4` |
| Walk to the staircase | `scene09_stairs.mp4` |
| Seated together (final hero) | `scene10_hero.mp4` |

**Recommended encoding.** Scroll-scrubbing needs frequent keyframes. Encode each video like this (720×1280 portrait, or 1080 wide for landscape sources), no audio:

```bash
ffmpeg -i input.mov -an -vf "scale=720:-2" -c:v libx264 -preset slow -crf 26 \
  -pix_fmt yuv420p -g 6 -keyint_min 6 -movflags +faststart scene01_doors.mp4
```

Keep each clip short (4–8 s) and under about 6 MB where possible.

> The videos currently in `assets/video/` have already been re-encoded this way (keyframe every 6 frames, audio removed). Posters are the first frame of each video (the hero poster is its last frame, the couple seated).

**Optional WebM.** Put a `.webm` copy next to each `.mp4` (same name) and set `videoFormats: ["webm", "mp4"]` in `js/config.js`:

```bash
ffmpeg -i scene01_doors.mp4 -an -c:v libvpx-vp9 -b:v 1.4M -g 6 scene01_doors.webm
```

**Framing on phones.** Each video has `position` (desktop) and `positionMobile` values in `js/config.js`. The groom is `center right` and the bride is `center left`. Adjust these if a face is cropped. For the Vinayagar scene, `focus` is the point the camera zooms toward (the sealed invitation).

### Poster images → `assets/images/posters/`

Use the same name as each video with `.jpg`, e.g. `scene01_doors.jpg`. The best poster is the video's first frame:

```bash
ffmpeg -i assets/video/scene01_doors.mp4 -frames:v 1 -q:v 4 assets/images/posters/scene01_doors.jpg
```

Posters show while a video loads, if a video fails, and for visitors who prefer reduced motion.

### Images → `assets/images/posters/`

| File | Used for |
|---|---|
| `invitation-card.png` | Fallback poster for the card-opening scene |
| `groom.png` | Fallback still for the groom scene |
| `Bride.png` | Fallback still for the bride scene (file names are case-sensitive on most hosts) |
| `ornamental-elements.png` | Source sheet. The thoranam (`assets/images/ornament-thoranam.png`, hung over the details frame) and the brass lamps (`assets/images/ornament-lamps.png`, above the RSVP) are cut from it with a transparent background. |

All are optional. If one is missing, it's simply skipped.

### Music → `assets/audio/background-music.mp3`

When loading finishes, the opening screen asks **Open with music** or **Open without sound**. Browsers (especially iPhone Safari) never allow a page to start sound on its own, and that tap is what lets the music play. A small gold note button in the corner plays or pauses it at any time. If the music file is missing, the opening screen skips the question and the button hides itself.

**Optional sound effects.** Put the files in `assets/audio/` and list them under `sounds` in `js/config.js`:

```js
sounds: {
  doorOpen: "assets/audio/door-open.mp3",       // as the doors begin to open
  templeAmbience: "assets/audio/ambience.mp3",  // quiet loop while music is on
  bell: "assets/audio/bell.mp3",                // as Vinayagar appears
  cardOpen: "assets/audio/paper.mp3",           // as the card opens
  atmosphere: "assets/audio/shimmer.mp3",       // the moment the couple meet
},
```

Effects play only while the visitor has sound on.

---

## 3. Change the details

All content comes from **`js/config.js`**, and every page section reads from it.

| To change… | Edit in `js/config.js` |
|---|---|
| Names | `groom`, `bride` (the first word is used as the first name, e.g. "Yogathipan") |
| Date | `date: "24 October 2026"` (format **DD Month YYYY**). The weekday, the big "24", "OCTOBER", "2026", "24 • 10 • 2026" and the calendar invite are all derived from it. |
| Time | `time: "7:00 PM"`. `utcOffset` is the venue's time zone (`"+08:00"` for Malaysia), and `durationHours` sets the calendar event length. |
| Venue | `venue` (one line, used for maps, calendar and RSVP) and `venueLines` (how it breaks onto lines on the invitation) |
| RSVP deadline | `rsvpBy: "18 October 2026"`, shown on the details card and above the RSVP form. Leave it empty to hide both lines. |
| RSVP form | `rsvpSheetUrl`: the Google Apps Script Web app URL. See **RSVP form → Google Sheet** below. |
| Hosts | `rsvpContacts` (name + WhatsApp number for each host, international format, digits only) and `defaultRsvp`. See **Two invitation links** below. |
| Maps | `maps.venue.google`, `maps.venue.waze`, `maps.parking.google`, `maps.parking.waze`. Each Directions button opens a small menu with Google Maps and Waze. Any empty link falls back to a Google Maps search of the venue address. |
| Video / poster paths | the `videos` object |
| Video behaviour | `videoMode`: `"auto"` (scrub with scroll, and switch to normal playback on devices that seek slowly), `"scrub"` or `"play"` |
| Music | `music`, `musicVolume` |

### RSVP form → Google Sheet

Guests fill in their name, phone (optional), number of adults and children, and vegetarian or non-vegetarian. Each reply becomes a row in your Google Sheet:

| Submitted at | Name | Phone | Adults | Children | Total pax | Meal | Invited by |
|---|---|---|---|---|---|---|---|

One-time setup (about 5 minutes):

1. Create a new Google Sheet (e.g. "Engagement RSVP").
2. In the sheet, open **Extensions → Apps Script**. Delete the sample code and paste in everything from `google-apps-script/Code.gs`. Click **Save**.
3. Click **Deploy → New deployment**. Under "Select type" (gear icon) choose **Web app**. Set:
   - **Execute as:** Me
   - **Who has access:** Anyone
4. Click **Deploy** and allow access when Google asks. Google warns that the app isn't verified; choose **Advanced → Go to (project name)**. It's your own script.
5. Copy the **Web app URL** (it ends in `/exec`) into `rsvpSheetUrl` in `js/config.js`, then commit and redeploy the site.
6. Test: send one RSVP from the site. A tab named **RSVP** appears in the sheet with the headers and your row. Delete the test row afterwards.

If you edit `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the same URL keeps working.

If `rsvpSheetUrl` is ever emptied, the form opens WhatsApp with the guest's answers typed in, sent to the host whose link they opened.

### Two invitation links

There is one website, and the link decides which host it belongs to. The form records that host in the sheet's **Invited by** column, and the "Questions? Message … on WhatsApp" link goes to them:

| Share with | Link | Host |
|---|---|---|
| Yogathipan's guests | `https://YOUR-SITE/?rsvp=yogathipan` | Yogathipan · +60 14-615 5770 |
| Selvarani's guests | `https://YOUR-SITE/?rsvp=selvarani` | Selvarani · +60 17-383 3995 |

A link without `?rsvp=` belongs to `defaultRsvp` (Yogathipan). `#selvarani` at the end of the link works too.

---

## 4. Deploy to a static host

Upload the whole folder as-is. No build is needed.

- **Netlify:** drag the folder onto <https://app.netlify.com/drop>.
- **Vercel:** `npx vercel` in the folder (framework: "Other", no build command).
- **GitHub Pages:** push to a repository → Settings → Pages → deploy from the branch, root folder.
- **Cloudflare Pages:** create a project, set no build command and output directory `/`.
- **Any web hosting / cPanel:** upload everything into `public_html`.

Before sharing the link:

1. Check `whatsappContacts` and the `maps` links.
2. Add the videos and posters, and check on a real phone.
3. Large videos load best from a host with a CDN (all of the above).

---

## 5. How it works

- **Scroll engine.** Each video scene is a tall section. Its full-screen stage is pinned, and scroll position drives the video's `currentTime` with smoothing. Scenes crossfade through a warm golden glow, darkness or ivory paper, so the transitions feel continuous.
- **Memory.** Only the visible scene and the next one are loaded. Videos you've scrolled past are unloaded after a moment.
- **Fallbacks.** In order: video → poster → designed artwork. If seeking is slow on a device, that video switches to normal playback.
- **Reduced motion.** If the visitor's device asks for reduced motion, the site skips smooth scrolling, scrubbing and parallax. It shows posters with gentle fades, and all the invitation text stays visible.
- **The invitation card.** GSAP + ScrollTrigger reveal the card line by line as the visitor scrolls: the blessing, names, "&", the invitation line, then the date.
- **Smooth scrolling.** Lenis adds inertia and works with ScrollTrigger. If the CDN is unreachable, the site still works with native scrolling.
- **Accessibility.** Semantic sections, real headings, a skip link, labelled buttons, keyboard-operable menus and chapter navigation. Videos and ornaments are hidden from screen readers.
