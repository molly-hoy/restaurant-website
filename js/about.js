/* ==========================================================================
   SALTMARSH — about.js
   --------------------------------------------------------------------------
   The gallery "lightbox": click a photo to view it large, then move between
   photos with the buttons, the arrow keys, or close with Escape.

   Accessibility details that employers notice:
     • Focus moves INTO the lightbox when it opens, and back to the photo
       you clicked when it closes.
     • Tab is "trapped" inside the lightbox while it's open, so keyboard
       users can't get lost on the page behind it.
     • The page behind can't scroll while the lightbox is open.
   ========================================================================== */

const galleryItems = [...document.querySelectorAll(".gallery__item")];
const lightbox = document.querySelector("#lightbox");
const lightboxPhoto = document.querySelector("#lightbox-photo");
const lightboxImg = document.querySelector("#lightbox-img");
const lightboxCaption = document.querySelector("#lightbox-caption");
const closeBtn = lightbox.querySelector(".lightbox__close");
const prevBtn = lightbox.querySelector(".lightbox__prev");
const nextBtn = lightbox.querySelector(".lightbox__next");

let currentIndex = 0;      // which photo is showing
let lastFocused = null;    // the element to return focus to on close


/* ---------- Show the photo at a given position ---------- */
function showPhoto(index) {
  // Wrap around: going "next" from the last photo returns to the first.
  currentIndex = (index + galleryItems.length) % galleryItems.length;

  const sourceFigure = galleryItems[currentIndex].querySelector(".photo");
  const sourceImg = sourceFigure.querySelector("img");

  // Copy the image details and placeholder state from the gallery tile.
  lightboxImg.src = sourceImg.getAttribute("src");
  lightboxImg.alt = sourceImg.alt;
  lightboxPhoto.dataset.label = sourceFigure.dataset.label;
  lightboxPhoto.classList.toggle("is-missing", sourceFigure.classList.contains("is-missing"));

  lightboxCaption.textContent = `${sourceImg.alt} · ${currentIndex + 1} of ${galleryItems.length}`;
}


/* ---------- Open and close ---------- */
function openLightbox(index) {
  lastFocused = document.activeElement;
  showPhoto(index);
  lightbox.classList.add("is-open");
  lightbox.setAttribute("aria-hidden", "false");
  document.body.classList.add("no-scroll");
  closeBtn.focus();
}

function closeLightbox() {
  lightbox.classList.remove("is-open");
  lightbox.setAttribute("aria-hidden", "true");
  document.body.classList.remove("no-scroll");
  lastFocused?.focus();    // ?. means "only if it exists"
}


/* ---------- Event listeners ---------- */
galleryItems.forEach((item, index) => {
  item.addEventListener("click", () => openLightbox(index));
});

closeBtn.addEventListener("click", closeLightbox);
prevBtn.addEventListener("click", () => showPhoto(currentIndex - 1));
nextBtn.addEventListener("click", () => showPhoto(currentIndex + 1));

// Clicking the dark background (not the photo or buttons) closes it.
lightbox.addEventListener("click", (event) => {
  if (event.target === lightbox) closeLightbox();
});

// Keyboard controls — only while the lightbox is open.
document.addEventListener("keydown", (event) => {
  if (!lightbox.classList.contains("is-open")) return;

  if (event.key === "Escape") closeLightbox();
  if (event.key === "ArrowLeft") showPhoto(currentIndex - 1);
  if (event.key === "ArrowRight") showPhoto(currentIndex + 1);

  // Focus trap: keep Tab cycling between the three buttons.
  if (event.key === "Tab") {
    const focusable = [closeBtn, prevBtn, nextBtn];
    const position = focusable.indexOf(document.activeElement);
    event.preventDefault();
    const step = event.shiftKey ? -1 : 1;
    const nextPosition = (position + step + focusable.length) % focusable.length;
    focusable[nextPosition].focus();
  }
});
