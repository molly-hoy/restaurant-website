/* ==========================================================================
   SALTMARSH — main.js
   --------------------------------------------------------------------------
   Code shared by EVERY page:
     1. Opening hours data (also used by booking.js)
     2. Mobile navigation menu
     3. Header shadow on scroll
     4. "Open now / Closed" status + highlighting today's hours
     5. Photo placeholders for missing images
     6. Scroll-reveal animation
     7. Footer year

   This file is loaded at the end of each page's <body>, so all the HTML
   already exists by the time this code runs.
   ========================================================================== */

/* Tell the CSS that JavaScript is running. Styles such as `.js .reveal`
   only apply when this class is present, so the site still looks right
   with JavaScript switched off ("progressive enhancement"). */
document.documentElement.classList.add("js");


/* --------------------------------------------------------------------------
   1. OPENING HOURS
   One source of truth for the hours. Times are 24-hour "HH:MM" strings.
   Each day holds a list of "sittings" (e.g. lunch and dinner).
   Index 0 is Sunday, because that's how JavaScript's Date.getDay() counts.

   Because this is a top-level `const` in a normal <script>, other scripts
   loaded AFTER this one (like booking.js) can use it too.
   -------------------------------------------------------------------------- */
const OPENING_HOURS = [
  /* 0 Sun */ [{ open: "12:00", close: "16:00" }],
  /* 1 Mon */ [],                                    // closed
  /* 2 Tue */ [],                                    // closed
  /* 3 Wed */ [{ open: "17:30", close: "22:00" }],
  /* 4 Thu */ [{ open: "17:30", close: "22:00" }],
  /* 5 Fri */ [{ open: "12:00", close: "15:00" }, { open: "17:30", close: "22:30" }],
  /* 6 Sat */ [{ open: "12:00", close: "15:00" }, { open: "17:30", close: "22:30" }],
];

/* Converts "17:30" into minutes since midnight (1050), which makes
   comparing times simple arithmetic. */
function toMinutes(time) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/* The restaurant is in the UK, so we always work in UK time — even if the
   visitor is browsing from another time zone. Intl.DateTimeFormat can tell
   us the weekday and time in "Europe/London" right now. */
function getLondonNow() {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/London",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());

  // formatToParts gives an array like [{type:"weekday", value:"Mon"}, ...].
  // We turn it into a simple object: { weekday: "Mon", hour: "18", ... }
  const get = (type) => parts.find((p) => p.type === type).value;
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return {
    day: dayNames.indexOf(get("weekday")),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}


/* --------------------------------------------------------------------------
   2. MOBILE NAVIGATION
   On small screens the links are hidden behind a "hamburger" button.
   Clicking it toggles the .is-open class (CSS handles the animation) and
   updates aria-expanded so screen readers know whether it's open.
   -------------------------------------------------------------------------- */
const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");

function setNavOpen(isOpen) {
  navToggle.setAttribute("aria-expanded", String(isOpen));
  navToggle.setAttribute("aria-label", isOpen ? "Close menu" : "Open menu");
  siteNav.classList.toggle("is-open", isOpen);
  document.body.classList.toggle("no-scroll", isOpen);
}

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = navToggle.getAttribute("aria-expanded") === "true";
    setNavOpen(!isOpen);
  });

  // Close the menu when a link inside it is clicked.
  siteNav.addEventListener("click", (event) => {
    if (event.target.closest("a")) setNavOpen(false);
  });

  // Close the menu with the Escape key, and return focus to the button.
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && siteNav.classList.contains("is-open")) {
      setNavOpen(false);
      navToggle.focus();
    }
  });

  // If the window is resized to desktop width, make sure the menu resets.
  window.matchMedia("(min-width: 821px)").addEventListener("change", (e) => {
    if (e.matches) setNavOpen(false);
  });
}


/* --------------------------------------------------------------------------
   3. HEADER SHADOW ON SCROLL
   Adds a subtle border/shadow under the sticky header once you've
   scrolled, so it separates from the content beneath it.
   -------------------------------------------------------------------------- */
const header = document.querySelector(".site-header");

function updateHeader() {
  header.classList.toggle("is-scrolled", window.scrollY > 8);
}

if (header) {
  updateHeader();
  // { passive: true } tells the browser we won't block scrolling — smoother.
  window.addEventListener("scroll", updateHeader, { passive: true });
}


/* --------------------------------------------------------------------------
   4. OPEN / CLOSED STATUS
   Finds every element with [data-open-status] and writes a message such
   as "Open now · until 22:00" or "Closed · opens Wed 17:30".
   -------------------------------------------------------------------------- */
function getOpenStatus() {
  const now = getLondonNow();
  const today = OPENING_HOURS[now.day];

  // Are we inside one of today's sittings?
  const current = today.find(
    (s) => now.minutes >= toMinutes(s.open) && now.minutes < toMinutes(s.close)
  );
  if (current) {
    return { isOpen: true, text: `Open now · until ${current.close}` };
  }

  // Is there another sitting later today?
  const laterToday = today.find((s) => toMinutes(s.open) > now.minutes);
  if (laterToday) {
    return { isOpen: false, text: `Closed · opens today ${laterToday.open}` };
  }

  // Otherwise look ahead day by day for the next opening.
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (let i = 1; i <= 7; i++) {
    const dayIndex = (now.day + i) % 7;          // % 7 wraps Saturday → Sunday
    const sittings = OPENING_HOURS[dayIndex];
    if (sittings.length) {
      const label = i === 1 ? "tomorrow" : dayNames[dayIndex];
      return { isOpen: false, text: `Closed · opens ${label} ${sittings[0].open}` };
    }
  }
  return { isOpen: false, text: "Closed" };
}

const status = getOpenStatus();

document.querySelectorAll("[data-open-status]").forEach((pill) => {
  pill.classList.toggle("is-open", status.isOpen);
  pill.querySelector(".status-pill__text").textContent = status.text;
});

// Highlight today's row in any opening-hours list.
// Each <dt>/<dd> pair has data-day="0"…"6" in the HTML.
const todayIndex = getLondonNow().day;
document.querySelectorAll(`.hours-list [data-day="${todayIndex}"]`).forEach((el) => {
  el.classList.add("is-today");
});


/* --------------------------------------------------------------------------
   5. PHOTO PLACEHOLDERS
   If an image file can't be found (for example, before you add your own
   photos to /images), we add .is-missing to its <figure class="photo">.
   The CSS then hides the broken image and shows a designed placeholder
   with the photo's description instead.
   -------------------------------------------------------------------------- */
function markMissing(img) {
  img.closest(".photo")?.classList.add("is-missing");
}

document.querySelectorAll(".photo img").forEach((img) => {
  // The image may have already failed before this script ran...
  if (img.complete && img.naturalWidth === 0) {
    markMissing(img);
  }
  // ...or it may fail later (lazy-loaded images load as you scroll).
  img.addEventListener("error", () => markMissing(img));
});


/* --------------------------------------------------------------------------
   6. SCROLL-REVEAL
   IntersectionObserver tells us when an element scrolls into view — much
   more efficient than checking positions on every scroll event.
   -------------------------------------------------------------------------- */
const revealItems = document.querySelectorAll(".reveal");

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);   // animate once, then stop watching
        }
      });
    },
    { threshold: 0.12 }   // trigger when 12% of the element is visible
  );
  revealItems.forEach((item) => observer.observe(item));
} else {
  // Very old browsers: just show everything in place.
  revealItems.forEach((item) => item.classList.add("is-visible"));
}


/* --------------------------------------------------------------------------
   7. FOOTER YEAR
   Keeps the copyright year up to date automatically.
   -------------------------------------------------------------------------- */
document.querySelectorAll("[data-year]").forEach((el) => {
  el.textContent = new Date().getFullYear();
});
