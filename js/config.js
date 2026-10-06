/* ==========================================================================
   INVITATION CONFIGURATION
   --------------------------------------------------------------------------
   Every name, date, address, link and media path used on the site comes
   from this file. Edit the values below — nothing else needs to change.
   ========================================================================== */

window.invitationConfig = {
  /* ---- The couple ---------------------------------------------------- */
  groom: "Yogathipan Shanmugam",
  bride: "Selvarani Chelvakumaran",

  /* ---- When ---------------------------------------------------------- */
  // Write the date as "DD Month YYYY" and the time as "H:MM AM/PM".
  date: "24 October 2026",
  time: "7:00 PM",
  // Time zone of the venue (used for the calendar invite).
  utcOffset: "+08:00",
  durationHours: 3,

  /* ---- Where --------------------------------------------------------- */
  venue: "No. 5, Lorong 1A/71E, Off Jalan Carey, Petaling Jaya, Selangor",
  // How the address is broken into lines on the invitation.
  venueLines: ["No. 5, Lorong 1A/71E", "Off Jalan Carey", "Petaling Jaya, Selangor"],

  /* ---- Links --------------------------------------------------------- */
  // WhatsApp numbers for RSVP, international format, digits only.
  // Each gets its own button. Add a label (e.g. "Yogathipan") to show a name
  // instead of the number.
  whatsappContacts: [
    { number: "60146155770", label: "" },
    { number: "60173833995", label: "" },
  ],
  rsvpMessage:
    "Hi Yogathipan & Selvarani, I would like to confirm my attendance for your engagement on 24 October 2026.",
  // Directions. Any link left empty falls back to a Google Maps search of the venue.
  maps: {
    venue: {
      google: "https://maps.app.goo.gl/RoiJ7EkbLGjSAZCAA",
      waze: "https://waze.com/ul/hw283938s0",
    },
    parking: {
      google: "https://maps.app.goo.gl/wsvasnfvvSDyhgAi8",
      waze: "https://waze.com/ul/hw283938s0",
    },
  },

  /* ---- Media --------------------------------------------------------- */
  // "auto"   – scrub videos with scroll, falls back to normal playback on slow devices
  // "scrub"  – always scrub with scroll
  // "play"   – always play normally when the scene is on screen
  videoMode: "auto",
  // Add "webm" in front ( ["webm", "mp4"] ) if you also provide .webm copies
  // of each video with the same file name.
  videoFormats: ["mp4"],

  // position / positionMobile → CSS object-position used to frame each video.
  videos: {
    doors: {
      src: "assets/video/scene01_doors.mp4",
      poster: ["assets/images/posters/scene01_doors.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
    mandapam: {
      src: "assets/video/scene02_mandapam.mp4",
      poster: ["assets/images/posters/scene02_mandapam.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
    vinayagar: {
      src: "assets/video/scene03_vinayagar.mp4",
      poster: ["assets/images/posters/scene03_vinayagar.jpg"],
      position: "center center",
      positionMobile: "center center",
      // Where the sealed invitation sits in the frame (zoom target).
      focus: "50% 55%",
    },
    invitation: {
      src: "assets/video/scene04_invitation.mp4",
      poster: ["assets/images/posters/scene04_invitation.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
    cardOpen: {
      src: "assets/video/scene05_card_open.mp4",
      poster: ["assets/images/posters/scene05_card_open.jpg", "assets/images/posters/invitation-card.png"],
      position: "center center",
      positionMobile: "center center",
    },
    groom: {
      src: "assets/video/scene06_groom.mp4",
      poster: ["assets/images/posters/scene06_groom.jpg", "assets/images/posters/groom.png"],
      position: "center center",
      positionMobile: "center center",
    },
    bride: {
      src: "assets/video/scene07_bride.mp4",
      poster: ["assets/images/posters/scene07_bride.jpg", "assets/images/posters/Bride.png"],
      position: "center center",
      positionMobile: "center center",
    },
    meeting: {
      src: "assets/video/scene08_meeting.mp4",
      poster: ["assets/images/posters/scene08_meeting.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
    stairs: {
      src: "assets/video/scene09_stairs.mp4",
      poster: ["assets/images/posters/scene09_stairs.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
    hero: {
      src: "assets/video/scene10_hero.mp4",
      poster: ["assets/images/posters/scene10_hero.jpg"],
      position: "center center",
      positionMobile: "center center",
    },
  },

  images: {
    // Cut from assets/images/posters/ornamental-elements.png
    thoranam: "assets/images/ornament-thoranam.png",
    lamps: "assets/images/ornament-lamps.png",
  },

  /* ---- Sound --------------------------------------------------------- */
  music: "assets/audio/background-music.mp3",
  musicVolume: 0.55,
  // Optional soft sound effects. Leave a value empty ("") to disable it.
  sounds: {
    doorOpen: "",        // e.g. "assets/audio/door-open.mp3"
    templeAmbience: "",  // loops quietly while music is on
    bell: "",
    cardOpen: "",
    atmosphere: "",
  },
  soundVolume: 0.35,
};
