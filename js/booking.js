/* ==========================================================================
   SALTMARSH — booking.js
   --------------------------------------------------------------------------
   Handles the booking form:
     1. Limits the date picker to the next 60 days
     2. Fills the "Time" dropdown with real slots for the chosen day
        (using OPENING_HOURS from main.js)
     3. Validates every field with clear, specific error messages
     4. Shows a confirmation summary instead of really sending anything

   Validation runs:
     • when you leave a field ("blur"), so errors appear as you go
     • on every keystroke AFTER a field has shown an error, so the message
       disappears as soon as you fix it
     • on submit, for every field at once
   ========================================================================== */

const form = document.querySelector("#booking-form");
const confirmation = document.querySelector("#confirmation");

// Every form control we validate, looked up by its id.
const fields = {
  date: document.querySelector("#date"),
  time: document.querySelector("#time"),
  guests: document.querySelector("#guests"),
  name: document.querySelector("#name"),
  email: document.querySelector("#email"),
  phone: document.querySelector("#phone"),
  consent: document.querySelector("#consent"),
};

const MAX_DAYS_AHEAD = 60;
const LAST_SEATING_BEFORE_CLOSE = 60;  // minutes
const SLOT_LENGTH = 30;                // minutes between bookable times


/* --------------------------------------------------------------------------
   DATE HELPERS
   Date inputs use "YYYY-MM-DD" strings. These helpers convert between
   that format and JavaScript Date objects.
   -------------------------------------------------------------------------- */

// Today's date in UK time, as "YYYY-MM-DD". The "en-CA" locale happens to
// format dates as YYYY-MM-DD, which is exactly what we need.
function londonToday() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/London" }).format(new Date());
}

// "2026-11-20" → a Date object for that day (midday, to dodge clock-change edge cases).
function parseDate(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);   // months count from 0 in JS!
}

// Date object → "2026-11-20"
function formatISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Minutes since midnight → "18:30"
function toTime(totalMinutes) {
  const h = String(Math.floor(totalMinutes / 60)).padStart(2, "0");
  const m = String(totalMinutes % 60).padStart(2, "0");
  return `${h}:${m}`;
}

// Set the earliest and latest dates the picker allows.
const today = parseDate(londonToday());
const lastDay = new Date(today);
lastDay.setDate(lastDay.getDate() + MAX_DAYS_AHEAD);
fields.date.min = formatISO(today);
fields.date.max = formatISO(lastDay);


/* --------------------------------------------------------------------------
   TIME SLOTS
   Builds the list of bookable times for a given date.
   -------------------------------------------------------------------------- */
function getSlots(dateValue) {
  const date = parseDate(dateValue);
  const sittings = OPENING_HOURS[date.getDay()];   // from main.js
  const slots = [];

  sittings.forEach((sitting) => {
    const first = toMinutes(sitting.open);
    const last = toMinutes(sitting.close) - LAST_SEATING_BEFORE_CLOSE;
    for (let t = first; t <= last; t += SLOT_LENGTH) {
      slots.push(t);
    }
  });

  // If the date is today, remove times that have passed (plus an hour's notice).
  if (dateValue === londonToday()) {
    const nowMinutes = getLondonNow().minutes;     // from main.js
    return slots.filter((t) => t >= nowMinutes + 60);
  }
  return slots;
}

// Rebuild the <select> options whenever the date changes.
function updateTimeOptions() {
  const select = fields.time;
  const previous = select.value;          // try to keep the user's choice
  select.innerHTML = "";                  // remove the old options

  // Only offer times if the date itself is valid.
  if (!fields.date.value || validators.date() !== "") {
    select.disabled = true;
    select.add(new Option("Choose a date first", ""));
    return;
  }

  const slots = getSlots(fields.date.value);
  if (slots.length === 0) {
    select.disabled = true;
    select.add(new Option("No times left on this day", ""));
    return;
  }

  select.disabled = false;
  select.add(new Option("Select a time", ""));
  slots.forEach((minutes) => {
    const time = toTime(minutes);
    // Label lunch and dinner to make the list easier to scan.
    const label = minutes < 16 * 60 ? `${time} · lunch` : `${time} · dinner`;
    select.add(new Option(label, time));
  });

  // Re-select the previous time if it's still available.
  if ([...select.options].some((o) => o.value === previous)) {
    select.value = previous;
  }
}


/* --------------------------------------------------------------------------
   VALIDATION RULES
   Each function returns an error message, or "" (empty) if the field is OK.
   Keeping rules in one object makes them easy to read, test and extend.
   -------------------------------------------------------------------------- */
const validators = {
  date() {
    const value = fields.date.value;
    if (!value) return "Choose a date for your visit.";

    const chosen = parseDate(value);
    if (chosen < today) return "That date has passed. Choose today or a later date.";
    if (chosen > lastDay) return `We take online bookings up to ${MAX_DAYS_AHEAD} days ahead.`;

    const day = chosen.getDay();
    if (day === 1 || day === 2) return "We're closed on Mondays and Tuesdays. Choose another day.";

    if (getSlots(value).length === 0) return "There are no tables left today. Choose another date.";
    return "";
  },

  time() {
    if (!fields.time.value) return "Choose a time.";
    return "";
  },

  guests() {
    const value = fields.guests.value;
    if (!value) return "Tell us how many people are coming.";
    if (value === "9+") return "Groups of 9 or more need to book by phone.";
    return "";
  },

  name() {
    const value = fields.name.value.trim();
    if (!value) return "Enter your name.";
    if (value.length < 2) return "Your name must be at least 2 characters.";
    return "";
  },

  email() {
    const value = fields.email.value.trim();
    if (!value) return "Enter your email address.";
    // A simple pattern: something@something.something (no spaces).
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Enter an email address like name@example.com.";
    }
    return "";
  },

  phone() {
    // Ignore spaces, brackets and dashes people often type.
    const value = fields.phone.value.replace(/[\s()-]/g, "");
    if (!value) return "Enter a mobile number.";
    // UK numbers: start with 0 or +44, followed by 9–10 more digits.
    if (!/^(\+44|0)\d{9,10}$/.test(value)) {
      return "Enter a UK number, like 07700 900123.";
    }
    return "";
  },

  consent() {
    if (!fields.consent.checked) return "Please confirm you've read this.";
    return "";
  },
};


/* --------------------------------------------------------------------------
   SHOWING ERRORS
   -------------------------------------------------------------------------- */

// Validate one field, show or clear its message, and return true if valid.
function validateField(key) {
  const message = validators[key]();
  const input = fields[key];
  const errorEl = document.querySelector(`#${input.id}-error`);

  errorEl.textContent = message;
  // aria-invalid tells screen readers (and our CSS) the field has a problem.
  input.setAttribute("aria-invalid", message ? "true" : "false");
  return message === "";
}


/* --------------------------------------------------------------------------
   EVENT LISTENERS
   -------------------------------------------------------------------------- */
Object.entries(fields).forEach(([key, input]) => {
  // Check a field when the user leaves it.
  input.addEventListener("blur", () => {
    if (input.value || input.type === "checkbox") validateField(key);
  });

  // Once a field has an error, re-check it live so the error clears on fixing.
  const liveEvent = input.tagName === "SELECT" || input.type === "checkbox" || input.type === "date"
    ? "change"
    : "input";
  input.addEventListener(liveEvent, () => {
    if (input.getAttribute("aria-invalid") === "true") validateField(key);
  });
});

// A new date means new time slots.
fields.date.addEventListener("change", () => {
  validateField("date");
  updateTimeOptions();
});

// Show the large-group notice when "9 or more" is chosen.
fields.guests.addEventListener("change", () => {
  document.querySelector("#large-group").hidden = fields.guests.value !== "9+";
});

// Live character counter for the requests box.
const requests = document.querySelector("#requests");
const requestsCount = document.querySelector("#requests-count");
requests.addEventListener("input", () => {
  requestsCount.textContent = requests.value.length;
});


/* --------------------------------------------------------------------------
   SUBMITTING
   -------------------------------------------------------------------------- */
form.addEventListener("submit", (event) => {
  // Stop the browser's default behaviour (reloading the page).
  event.preventDefault();

  // Validate everything. We use map() rather than every() so that ALL
  // fields show their errors, not just the first failing one.
  const results = Object.keys(fields).map((key) => validateField(key));
  const allValid = results.every(Boolean);

  if (!allValid) {
    // Move focus to the first field with a problem.
    const firstInvalid = form.querySelector('[aria-invalid="true"]');
    firstInvalid.focus();
    return;
  }

  showConfirmation();
});

function showConfirmation() {
  const date = parseDate(fields.date.value);
  const niceDate = date.toLocaleDateString("en-GB", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
  const guests = Number(fields.guests.value);

  // The rows of the summary, as [label, value] pairs.
  const rows = [
    ["Date", niceDate],
    ["Time", fields.time.value],
    ["Guests", `${guests} ${guests === 1 ? "guest" : "guests"}`],
    ["Email", fields.email.value.trim()],
    ["Mobile", fields.phone.value.trim()],
  ];
  const occasion = document.querySelector("#occasion").value;
  if (occasion) rows.push(["Occasion", occasion]);
  if (requests.value.trim()) rows.push(["Requests", requests.value.trim()]);

  // Build the summary with createElement + textContent rather than
  // innerHTML. This is safer: anything the user typed is treated as plain
  // text, never as HTML (this prevents "XSS" attacks).
  const summary = document.querySelector("#confirm-summary");
  summary.replaceChildren();
  rows.forEach(([label, value]) => {
    const dt = document.createElement("dt");
    const dd = document.createElement("dd");
    dt.textContent = label;
    dd.textContent = value;
    summary.append(dt, dd);
  });

  // First name only, for a friendlier greeting.
  document.querySelector("#confirm-name").textContent = fields.name.value.trim().split(" ")[0];

  form.hidden = true;
  confirmation.hidden = false;
  confirmation.focus();
  confirmation.scrollIntoView({ behavior: "smooth", block: "start" });
}

// "Make another booking" resets everything.
document.querySelector("#book-again").addEventListener("click", () => {
  form.reset();
  Object.values(fields).forEach((input) => input.removeAttribute("aria-invalid"));
  form.querySelectorAll(".field__error").forEach((el) => (el.textContent = ""));
  document.querySelector("#large-group").hidden = true;
  requestsCount.textContent = "0";
  updateTimeOptions();

  confirmation.hidden = true;
  form.hidden = false;
  fields.date.focus();
});
