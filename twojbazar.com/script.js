const RENDER_API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_API_PATH = "/api/listings";
const LISTINGS_JSON_URL = "listings.json";
const LISTINGS_CACHE_KEY = "twojbazar-home-listings-cache";

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const listingGrid = document.getElementById("listingGrid");
const filterChips = document.querySelectorAll(".filter-chip[data-filter]");
const countryChips = document.querySelectorAll(".filter-chip[data-country-filter]");
const countrySelect = document.getElementById("countrySelect");
const sortSelect = document.getElementById("sortSelect");
const listingEmpty = document.getElementById("listingEmpty");
const categoryCards = document.querySelectorAll(".category-card[data-filter-target]");
const CATEGORY_OPTIONS = [
  "Praca dam",
  "Praca szukam",
  "Mieszkanie wynajm\u0119",
  "Mieszkanie szukam",
  "Pok\u00f3j wynajm\u0119",
  "Pok\u00f3j szukam",
  "Us\u0142ugi oferuj\u0119",
  "Us\u0142ugi szukam",
  "Sprzedam",
  "Kupi\u0119",
  "Transport",
  "Pomoc / formalno\u015bci",
  "Poznam ludzi",
  "Inne",
];

const COUNTRY_CURRENCY_MAP = {
  szwecja: "SEK",
  norwegia: "NOK",
  dania: "DKK",
};

const ALLOWED_COUNTRIES = ["all", "szwecja", "norwegia", "dania"];

let activeFilter = "all";
let activeCountry = "all";
let activeSort = "newest";

function getApiCandidates(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [];

  if (window.location.protocol.startsWith("http")) {
    candidates.push(normalizedPath);
  }

  candidates.push(`${RENDER_API_BASE_URL}${normalizedPath}`);
  return [...new Set(candidates)];
}

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  [...navLinks.querySelectorAll("a")].forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCountryFilterValue(value) {
  const normalizedValue = normalizeText(value);
  return ALLOWED_COUNTRIES.includes(normalizedValue) ? normalizedValue : "all";
}

function getCategoryFilterValue(value) {
  return normalizeText(value) || "all";
}

function normalizeCategory(value) {
  const rawCategory = String(value || "").trim();

  if (!rawCategory) {
    return "Inne";
  }

  const directMatch = CATEGORY_OPTIONS.find((category) => getCategoryFilterValue(category) === getCategoryFilterValue(rawCategory));

  if (directMatch) {
    return directMatch;
  }

  const normalizedValue = getCategoryFilterValue(rawCategory);

  if (normalizedValue.includes("praca") && normalizedValue.includes("szuk")) return "Praca szukam";
  if (normalizedValue.includes("praca")) return "Praca dam";
  if (normalizedValue.includes("mieszkan") && normalizedValue.includes("szuk")) return "Mieszkanie szukam";
  if (normalizedValue.includes("mieszkan")) return "Mieszkanie wynajm\u0119";
  if (normalizedValue.includes("pokoj") && normalizedValue.includes("szuk")) return "Pok\u00f3j szukam";
  if (normalizedValue.includes("pokoj")) return "Pok\u00f3j wynajm\u0119";
  if (normalizedValue.includes("uslug") && normalizedValue.includes("szuk")) return "Us\u0142ugi szukam";
  if (normalizedValue.includes("uslug")) return "Us\u0142ugi oferuj\u0119";
  if (normalizedValue.includes("sprzed")) return "Sprzedam";
  if (normalizedValue.includes("kupi")) return "Kupi\u0119";
  if (normalizedValue.includes("transport") || normalizedValue.includes("przewoz") || normalizedValue.includes("bus")) return "Transport";
  if (normalizedValue.includes("pomoc") || normalizedValue.includes("formal")) return "Pomoc / formalno\u015bci";
  if (normalizedValue.includes("poznam") || normalizedValue.includes("ludzi") || normalizedValue.includes("spolecz")) return "Poznam ludzi";

  return "Inne";
}

function getInitialCountryFilter() {
  const activeChip = [...countryChips].find((chip) => chip.classList.contains("active"));
  return getCountryFilterValue(countrySelect?.value || activeChip?.dataset.countryFilter || "all");
}

function getInitialCategoryFilter() {
  const activeChip = [...filterChips].find((chip) => chip.classList.contains("active"));
  return getCategoryFilterValue(activeChip?.dataset.filter || "all");
}

function getInitialSortValue() {
  return ["newest", "price-asc", "price-desc"].includes(sortSelect?.value) ? sortSelect.value : "newest";
}

function mergeListings(listings = []) {
  const mergedById = new Map();

  listings.forEach((listing) => {
    const id = String(listing?.id || "").trim();
    const country = getCountryFilterValue(listing?.country);
    const category = normalizeCategory(listing?.category);

    if (!id || country === "all") {
      return;
    }

    mergedById.set(id, {
      ...listing,
      category,
    });
  });

  return [...mergedById.values()];
}

function readCachedListings() {
  try {
    const raw = sessionStorage.getItem(LISTINGS_CACHE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? mergeListings(data) : [];
  } catch (error) {
    console.error("Listings cache read error:", error);
    return [];
  }
}

function writeCachedListings(listings) {
  try {
    sessionStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify(mergeListings(listings)));
  } catch (error) {
    console.error("Listings cache write error:", error);
  }
}

async function fetchListings() {
  const cachedListings = readCachedListings();
  const sources = [...cachedListings];

  try {
    const response = await fetch(LISTINGS_JSON_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Blad pobierania listings.json: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      sources.push(...data);
    }
  } catch (error) {
    console.error("Listings JSON read error:", error);
  }

  for (const url of getApiCandidates(LISTINGS_API_PATH)) {
    try {
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Blad pobierania ogloszen z API: ${response.status}`);
      }

      const data = await response.json();
      if (Array.isArray(data)) {
        sources.push(...data);
        break;
      }
    } catch (error) {
      console.error("Listings API read error:", {
        url,
        error,
      });
    }
  }

  const mergedListings = mergeListings(sources);

  if (mergedListings.length) {
    writeCachedListings(mergedListings);
  }

  return mergedListings;
}

function getListingCards() {
  return [...document.querySelectorAll(".listing-card")];
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeText(country)] || "EUR";
}

function getCategoryMeta(category) {
  const safeCategory = normalizeCategory(category);

  if (safeCategory === "Praca dam" || safeCategory === "Praca szukam") {
    return { badge: safeCategory, gradient: "gradient-one" };
  }

  if (
    safeCategory === "Mieszkanie wynajm\u0119" ||
    safeCategory === "Mieszkanie szukam" ||
    safeCategory === "Pok\u00f3j wynajm\u0119" ||
    safeCategory === "Pok\u00f3j szukam"
  ) {
    return { badge: safeCategory, gradient: "gradient-three" };
  }

  if (
    safeCategory === "Us\u0142ugi oferuj\u0119" ||
    safeCategory === "Us\u0142ugi szukam" ||
    safeCategory === "Pomoc / formalno\u015bci"
  ) {
    return { badge: safeCategory, gradient: "gradient-two" };
  }

  if (safeCategory === "Transport") {
    return { badge: safeCategory, gradient: "gradient-one" };
  }

  if (safeCategory === "Kupi\u0119") {
    return { badge: safeCategory, gradient: "gradient-four" };
  }

  if (safeCategory === "Poznam ludzi") {
    return { badge: safeCategory, gradient: "gradient-six" };
  }

  return { badge: safeCategory, gradient: "gradient-five" };
}

function formatPrice(price, currency = "EUR") {
  const normalizedPrice = String(price || "").trim();

  if (!normalizedPrice) {
    return "Cena do ustalenia";
  }

  return /[a-zA-ZacelnószzACELNÓSZZ]/.test(normalizedPrice)
    ? normalizedPrice
    : `${normalizedPrice} ${currency}`;
}

function getSortablePriceValue(price) {
  const normalizedPrice = String(price || "")
    .replace(",", ".")
    .replace(/\s+/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  return normalizedPrice ? Number(normalizedPrice[0]) : Number.POSITIVE_INFINITY;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getListingUrl(id) {
  return `listing.html?id=${encodeURIComponent(id)}`;
}

function decorateCardForDetails(card, id) {
  card.dataset.id = id;
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Otwórz ogloszenie: ${card.dataset.title || "szczególy"}`);

  const detailsLink = card.querySelector(".listing-footer a");
  if (detailsLink) {
    detailsLink.setAttribute("href", getListingUrl(id));
  }
}

function createListingCard(listing) {
  const article = document.createElement("article");
  const category = normalizeCategory(listing.category);
  const country = listing.country || "Nie podano kraju";
  const city = listing.city || "Nie podano miasta";
  const currency = listing.currency || getCurrencyForCountry(country);
  const { badge, gradient } = getCategoryMeta(category);
  const id = listing.id || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  const imageMarkup = listing.image
    ? `<img class="listing-image-photo" src="${listing.image}" alt="${escapeHtml(listing.title || "Zdjecie ogloszenia")}">`
    : "";

  article.className = "listing-card listing-card-user";
  article.dataset.title = listing.title || "";
  article.dataset.category = category;
  article.dataset.country = getCountryFilterValue(country);
  article.dataset.city = city || "";
  article.dataset.createdAt = listing.createdAt || "";
  article.dataset.price = String(listing.price || "");

  article.innerHTML = `
    <div class="listing-image ${gradient}">
      <span class="listing-badge">${escapeHtml(badge)}</span>
      ${imageMarkup}
    </div>
    <div class="listing-content">
      <div class="listing-topline">
        <span>${escapeHtml(category)}</span>
        <span>${escapeHtml(city)} • ${escapeHtml(country)}</span>
      </div>
      <h3>${escapeHtml(listing.title || "Nowe ogloszenie")}</h3>
      <p class="price">${formatPrice(listing.price, currency)}</p>
      <p>${escapeHtml(listing.description || "Brak opisu ogloszenia.")}</p>
      <div class="listing-footer">
        <span>Nowe</span>
        <a href="${getListingUrl(id)}">Szczególy</a>
      </div>
    </div>
  `;

  decorateCardForDetails(article, id);
  return article;
}

function getCardIdFromLink(card, index) {
  const detailsLink = card.querySelector(".listing-footer a");

  if (detailsLink) {
    const href = detailsLink.getAttribute("href") || "";
    const match = href.match(/[?&]id=([^&#]+)/);

    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
  }

  return `static-${index + 1}`;
}

function decorateExistingCards() {
  getListingCards().forEach((card, index) => {
    if (!card.dataset.title) {
      card.dataset.title = card.querySelector("h3")?.textContent?.trim() || "";
    }

    if (!card.dataset.category) {
      card.dataset.category = normalizeCategory(card.querySelector(".listing-topline span")?.textContent?.trim() || "");
    } else {
      card.dataset.category = normalizeCategory(card.dataset.category);
    }

    if (!card.dataset.city) {
      const locationText = card.querySelector(".listing-topline span:last-child")?.textContent || "";
      card.dataset.city = locationText.split("•")[0]?.trim() || "";
    }

    if (!card.dataset.price) {
      card.dataset.price = card.querySelector(".price")?.textContent?.trim() || "";
    }

    if (!card.dataset.country) {
      const locationText = card.querySelector(".listing-topline span:last-child")?.textContent || "";
      const countryText = locationText.split("•")[1]?.trim() || "";
      card.dataset.country = getCountryFilterValue(countryText);
    } else {
      card.dataset.country = getCountryFilterValue(card.dataset.country);
    }

    decorateCardForDetails(card, getCardIdFromLink(card, index));
  });
}

async function renderStoredListings() {
  if (!listingGrid) {
    return false;
  }

  const listings = (await fetchListings()).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  if (!listings.length) {
    return false;
  }

  listingGrid.innerHTML = "";
  listings.forEach((listing) => {
    listingGrid.append(createListingCard(listing));
  });

  return true;
}

function updateListings() {
  const listingCards = getListingCards();

  if (!listingCards.length) {
    if (listingEmpty) {
      listingEmpty.classList.remove("hidden");
    }
    return;
  }

  const query = normalizeText(searchInput?.value || "");
  let visibleCount = 0;

  const visibleCards = [];

  listingCards.forEach((card) => {
    const title = normalizeText(card.dataset.title || "");
    const category = getCategoryFilterValue(normalizeCategory(card.dataset.category || ""));
    const country = getCountryFilterValue(card.dataset.country || "");
    const city = normalizeText(card.dataset.city || "");

    const matchesSearch =
      query === "" ||
      title.includes(query) ||
      category.includes(query) ||
      city.includes(query) ||
      country.includes(query);

    const matchesCategory = activeFilter === "all" || category === activeFilter;
    const matchesCountry = activeCountry === "all" || country === activeCountry;
    const isVisible = matchesSearch && matchesCategory && matchesCountry;

    card.classList.toggle("hidden", !isVisible);

    if (isVisible) {
      visibleCards.push(card);
      visibleCount += 1;
    }
  });

  const sortedCards = [...listingCards].sort((firstCard, secondCard) => {
    if (activeSort === "price-asc") {
      return getSortablePriceValue(firstCard.dataset.price) - getSortablePriceValue(secondCard.dataset.price);
    }

    if (activeSort === "price-desc") {
      return getSortablePriceValue(secondCard.dataset.price) - getSortablePriceValue(firstCard.dataset.price);
    }

    return new Date(secondCard.dataset.createdAt || 0).getTime() - new Date(firstCard.dataset.createdAt || 0).getTime();
  });

  sortedCards.forEach((card) => {
    listingGrid?.appendChild(card);
  });

  if (listingEmpty) {
    listingEmpty.classList.toggle("hidden", visibleCount > 0);
  }
}

function syncCountryControls(countryValue) {
  const nextCountry = getCountryFilterValue(countryValue);

  if (countrySelect) {
    countrySelect.value = nextCountry;
  }

  countryChips.forEach((chip) => {
    chip.classList.toggle("active", getCountryFilterValue(chip.dataset.countryFilter) === nextCountry);
  });
}

function syncCategoryControls(categoryValue) {
  const nextCategory = getCategoryFilterValue(categoryValue);

  filterChips.forEach((chip) => {
    chip.classList.toggle("active", getCategoryFilterValue(chip.dataset.filter) === nextCategory);
  });
}

if (searchForm) {
  searchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    updateListings();
  });
}

if (searchInput) {
  searchInput.addEventListener("input", updateListings);
}

if (listingGrid) {
  listingGrid.addEventListener("click", (event) => {
    const detailsLink = event.target.closest(".listing-footer a");
    if (detailsLink) {
      return;
    }

    const card = event.target.closest(".listing-card");
    if (!card || !card.dataset.id) {
      return;
    }

    window.location.href = getListingUrl(card.dataset.id);
  });

  listingGrid.addEventListener("keydown", (event) => {
    const card = event.target.closest(".listing-card");

    if (!card || !card.dataset.id) {
      return;
    }

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      window.location.href = getListingUrl(card.dataset.id);
    }
  });
}

if (filterChips.length) {
  filterChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeFilter = getCategoryFilterValue(chip.dataset.filter || "all");
      syncCategoryControls(activeFilter);
      updateListings();
    });
  });
}

if (countryChips.length) {
  countryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCountry = getCountryFilterValue(chip.dataset.countryFilter || "all");
      syncCountryControls(activeCountry);
      updateListings();
    });
  });
}

if (countrySelect) {
  countrySelect.addEventListener("change", () => {
    activeCountry = getCountryFilterValue(countrySelect.value);
    syncCountryControls(activeCountry);
    updateListings();
  });
}

if (sortSelect) {
  sortSelect.addEventListener("change", () => {
    activeSort = getInitialSortValue();
    updateListings();
  });
}

if (categoryCards.length && filterChips.length) {
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetFilter = getCategoryFilterValue(card.dataset.filterTarget || "all");
      const targetChip = [...filterChips].find(
        (chip) => getCategoryFilterValue(chip.dataset.filter) === targetFilter
      );

      if (!targetChip) {
        return;
      }

      targetChip.click();
      document.getElementById("ogloszenia")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function initHomepage() {
  activeFilter = getInitialCategoryFilter();
  activeCountry = getInitialCountryFilter();
  activeSort = getInitialSortValue();

  await renderStoredListings();
  decorateExistingCards();
  syncCategoryControls(activeFilter);
  syncCountryControls(activeCountry);
  updateListings();
}

initHomepage();







