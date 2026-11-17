/* ==========================================================================
   SALTMARSH — menu.js
   --------------------------------------------------------------------------
   Filters the menu by course, dietary needs and a search term.

   How it works:
     1. We keep the current filter choices in one object called `filters`.
     2. Whenever a control changes, we update `filters` and call applyFilters().
     3. applyFilters() loops over every dish, decides if it should be shown,
        and hides courses that end up with no visible dishes.

   Keeping all the "state" in one place and having ONE function that redraws
   the page from it is the same idea React is built on, so this is good
   practice for the next project.
   ========================================================================== */

/* ---------- Grab the elements we need ---------- */
const courseButtons = document.querySelectorAll("[data-course-filter]");
const dietCheckboxes = document.querySelectorAll(".filter-extras input[type='checkbox']");
const searchInput = document.querySelector("#menu-search");
const courses = document.querySelectorAll(".menu-course");
const dishes = document.querySelectorAll(".dish");
const countText = document.querySelector("#menu-count");
const emptyState = document.querySelector("#menu-empty");
const resetButton = document.querySelector("#menu-reset");

/* ---------- The current filter "state" ---------- */
const filters = {
  course: "all",      // "all", "raw", "small", "mains" or "puddings"
  diets: [],          // e.g. ["v", "gf"] — a dish must match ALL of these
  search: "",         // lower-case search text
};


/* ---------- Decide whether one dish passes the filters ---------- */
function dishMatches(dish) {
  // 1. Course: which course <section> is this dish inside?
  const course = dish.closest(".menu-course").dataset.course;
  if (filters.course !== "all" && course !== filters.course) {
    return false;
  }

  // 2. Diet: the dish's data-diet="v gf" becomes the array ["v", "gf"].
  //    .every() checks that each ticked diet is in the dish's list.
  const dishDiets = dish.dataset.diet.split(" ").filter(Boolean);
  const meetsDiets = filters.diets.every((diet) => dishDiets.includes(diet));
  if (!meetsDiets) {
    return false;
  }

  // 3. Search: look for the text in the dish name and description.
  if (filters.search) {
    const text = dish.textContent.toLowerCase();
    if (!text.includes(filters.search)) {
      return false;
    }
  }

  return true;
}


/* ---------- Show/hide everything based on the current filters ---------- */
function applyFilters() {
  let visibleCount = 0;

  // Show or hide each dish using the HTML `hidden` attribute.
  dishes.forEach((dish) => {
    const show = dishMatches(dish);
    dish.hidden = !show;
    if (show) visibleCount++;
  });

  // Hide a whole course if none of its dishes are visible.
  courses.forEach((course) => {
    const hasVisibleDish = course.querySelector(".dish:not([hidden])");
    course.hidden = !hasVisibleDish;
  });

  // Update the "Showing X dishes" text (screen readers will announce it).
  const isFiltered =
    filters.course !== "all" || filters.diets.length > 0 || filters.search !== "";

  if (!isFiltered) {
    countText.textContent = `Showing all ${dishes.length} dishes`;
  } else {
    countText.textContent = `Showing ${visibleCount} of ${dishes.length} dishes`;
  }

  // Show the "no results" message when nothing matches.
  emptyState.hidden = visibleCount > 0;
}


/* ---------- Event listeners: respond to the user ---------- */

// Course chips: only one can be active at a time.
courseButtons.forEach((button) => {
  button.addEventListener("click", () => {
    filters.course = button.dataset.courseFilter;

    // Update aria-pressed on every chip so only the clicked one is "on".
    courseButtons.forEach((b) => {
      b.setAttribute("aria-pressed", String(b === button));
    });

    applyFilters();
  });
});

// Dietary checkboxes: rebuild the list of ticked diets each time.
dietCheckboxes.forEach((checkbox) => {
  checkbox.addEventListener("change", () => {
    filters.diets = [...dietCheckboxes]          // turn the NodeList into an array
      .filter((box) => box.checked)
      .map((box) => box.value);
    applyFilters();
  });
});

// Search: "input" fires on every keystroke, so results update as you type.
searchInput.addEventListener("input", () => {
  filters.search = searchInput.value.trim().toLowerCase();
  applyFilters();
});

// "Clear all filters" button in the empty state.
resetButton.addEventListener("click", () => {
  filters.course = "all";
  filters.diets = [];
  filters.search = "";

  // Reset the controls so they match the state.
  courseButtons.forEach((b) => {
    b.setAttribute("aria-pressed", String(b.dataset.courseFilter === "all"));
  });
  dietCheckboxes.forEach((box) => (box.checked = false));
  searchInput.value = "";

  applyFilters();
  searchInput.focus();
});

// Run once on load so the count text is correct from the start.
applyFilters();
