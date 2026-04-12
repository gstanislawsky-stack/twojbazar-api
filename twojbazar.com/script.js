const API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_ENDPOINT = `${API_BASE_URL}/api/listings`;
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const listingGrid = document.getElementById("listingGrid");
const filterChips = document.querySelectorAll(".filter-chip[data-filter]");
const countryChips = document.querySelectorAll(".filter-chip[data-country-filter]");
const countrySelect = document.getElementById("countrySelect");
const listingEmpty = document.getElementById("listingEmpty");
const categoryCards = document.querySelectorAll(".category-card[data-filter-target]");
const COUNTRY_CURRENCY_MAP = {
  sweden: "SEK",
  norway: "NOK",
  denmark: "DKK",
};
const DEMO_LISTINGS = [
  { id: "demo-1", title: "Praca dam magazyn G\u00f6teborg", category: "praca dam", price: "145", currency: "SEK", country: "Szwecja", city: "G\u00f6teborg", description: "Praca od zaraz w polskim zespole, zmiana dzienna i pomoc we wdro\u017ceniu.", createdAt: "2026-04-01T09:00:00.000Z" },
  { id: "demo-2", title: "Praca szukam sprz\u0105tanie Kopenhaga", category: "praca szukam", price: "Pe\u0142en etat", currency: "DKK", country: "Dania", city: "Kopenhaga", description: "Szukam stabilnej pracy przy sprz\u0105taniu, komunikatywny polski i angielski.", createdAt: "2026-04-01T10:00:00.000Z" },
  { id: "demo-3", title: "Pok\u00f3j wynajm\u0119 Sztokholm", category: "pok\u00f3j wynajm\u0119", price: "5 200", currency: "SEK", country: "Szwecja", city: "Sztokholm", description: "Pok\u00f3j dla jednej osoby, dobra komunikacja i blisko polskiego sklepu.", createdAt: "2026-04-01T11:00:00.000Z" },
  { id: "demo-4", title: "Pok\u00f3j szukam Oslo", category: "pok\u00f3j szukam", price: "Do 6 000 NOK", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Szukam pokoju blisko centrum, spokojna osoba pracuj\u0105ca, bez na\u0142og\u00f3w.", createdAt: "2026-04-01T12:00:00.000Z" },
  { id: "demo-5", title: "Mieszkanie wynajm\u0119 Malm\u00f6", category: "mieszkanie wynajm\u0119", price: "9 800", currency: "SEK", country: "Szwecja", city: "Malm\u00f6", description: "Jasne mieszkanie w spokojnej okolicy, dobry dojazd do centrum i sklep\u00f3w.", createdAt: "2026-04-01T13:00:00.000Z" },
  { id: "demo-6", title: "Mieszkanie szukam Aarhus", category: "mieszkanie szukam", price: "Do 8 500 DKK", currency: "DKK", country: "Dania", city: "Aarhus", description: "Szukam ma\u0142ego mieszkania dla pary, najlepiej z mo\u017cliwo\u015bci\u0105 meldunku.", createdAt: "2026-04-01T14:00:00.000Z" },
  { id: "demo-7", title: "Us\u0142ugi oferuj\u0119 remonty i malowanie", category: "us\u0142ugi oferuj\u0119", price: "Od 400 NOK", currency: "NOK", country: "Norwegia", city: "Bergen", description: "Polska ekipa, szybkie terminy, mieszkania i ma\u0142e lokale u\u017cytkowe.", createdAt: "2026-04-01T15:00:00.000Z" },
  { id: "demo-8", title: "Us\u0142ugi szukam ksi\u0119gowej dla firmy", category: "us\u0142ugi szukam", price: "Sta\u0142a wsp\u00f3\u0142praca", currency: "DKK", country: "Dania", city: "Kopenhaga", description: "Potrzebna polskoj\u0119zyczna ksi\u0119gowa do prowadzenia ma\u0142ej dzia\u0142alno\u015bci w Danii.", createdAt: "2026-04-01T16:00:00.000Z" },
  { id: "demo-9", title: "Sprzedam rower Malm\u00f6", category: "sprzedam", price: "1 800", currency: "SEK", country: "Szwecja", city: "Malm\u00f6", description: "Rower miejski w dobrym stanie, idealny do codziennych dojazd\u00f3w do pracy.", createdAt: "2026-04-01T17:00:00.000Z" },
  { id: "demo-10", title: "Kupi\u0119 u\u017cywan\u0105 pralk\u0119 Aarhus", category: "kupi\u0119", price: "Do 1 200 DKK", currency: "DKK", country: "Dania", city: "Aarhus", description: "Szukam sprawnej pralki, najlepiej z transportem lub blisko miasta.", createdAt: "2026-04-01T18:00:00.000Z" },
  { id: "demo-11", title: "Oddam ubranka dzieci\u0119ce Oslo", category: "oddam", price: "0 NOK", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Paczka ubranek po dziecku, odbi\u00f3r osobisty w tygodniu.", createdAt: "2026-04-01T19:00:00.000Z" },
  { id: "demo-12", title: "Zamieni\u0119 auto na busa Bergen", category: "zamieni\u0119", price: "Wymiana", currency: "NOK", country: "Norwegia", city: "Bergen", description: "Zamieni\u0119 sprawne auto osobowe na ma\u0142ego busa do pracy lub transportu.", createdAt: "2026-04-01T20:00:00.000Z" },
  { id: "demo-13", title: "Transport paczek Polska - Szwecja", category: "transport", price: "Od 180 SEK", currency: "SEK", country: "Szwecja", city: "Malm\u00f6", description: "Regularne kursy, przew\u00f3z paczek i rzeczy prywatnych od drzwi do drzwi.", createdAt: "2026-04-01T21:00:00.000Z" },
  { id: "demo-14", title: "Pomoc / formalno\u015bci G\u00f6teborg", category: "pomoc / formalno\u015bci", price: "Konsultacja", currency: "SEK", country: "Szwecja", city: "G\u00f6teborg", description: "Wsparcie po polsku w dokumentach, urz\u0119dach i podstawowych formalno\u015bciach.", createdAt: "2026-04-01T22:00:00.000Z" },
  { id: "demo-15", title: "Poznam ludzi w Oslo", category: "poznam ludzi", price: "Spo\u0142eczno\u015b\u0107", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Szukam kontaktu z Polakami do rozm\u00f3w, spacer\u00f3w i wsp\u00f3lnego poznawania miasta.", createdAt: "2026-04-01T23:00:00.000Z" },
  { id: "demo-16", title: "Inne og\u0142oszenie lokalne Aarhus", category: "inne", price: "Do ustalenia", currency: "DKK", country: "Dania", city: "Aarhus", description: "Lokalne og\u0142oszenie spo\u0142eczno\u015bciowe, kt\u00f3re nie pasuje do innych kategorii portalu.", createdAt: "2026-04-02T08:00:00.000Z" }
];

const SCANDINAVIAN_COUNTRIES = ["sweden", "norway", "denmark"];

let activeFilter = "all";
let activeCountry = "all";

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

async function fetchListings() {
  try {
    const response = await fetch(LISTINGS_ENDPOINT);

    if (!response.ok) {
      throw new Error(`B\u0142\u0105d pobierania og\u0142osze\u0144: ${response.status}`);
    }

    const data = await response.json();
    return Array.isArray(data)
      ? data.filter((listing) => SCANDINAVIAN_COUNTRIES.includes(normalizeText(listing.country)))
      : [];
  } catch (error) {
    console.error("Listings API read error:", error);
    return [];
  }
}

function getListingCards() {
  return [...document.querySelectorAll(".listing-card")];
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeText(country)] || "EUR";
}

function getCategoryMeta(category) {
  const normalizedCategory = normalizeText(category);

  if (normalizedCategory.includes("praca")) {
    return { badge: category || "Praca", gradient: "gradient-one" };
  }

  if (normalizedCategory.includes("mieszkanie") || normalizedCategory.includes("pokoj")) {
    return { badge: category || "Mieszkania", gradient: "gradient-three" };
  }

  if (normalizedCategory.includes("uslug")) {
    return { badge: category || "Us\u0142ugi", gradient: "gradient-two" };
  }

  if (normalizedCategory.includes("transport")) {
    return { badge: category || "Transport", gradient: "gradient-one" };
  }

  if (normalizedCategory.includes("kupi")) {
    return { badge: category || "Kupi\u0119", gradient: "gradient-four" };
  }

  return { badge: category || "Og\u0142oszenie", gradient: "gradient-five" };
}

function formatPrice(price, currency = "EUR") {
  const normalizedPrice = String(price || "").trim();

  if (!normalizedPrice) {
    return "Cena do ustalenia";
  }

  return /[a-zA-Z\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b]/.test(normalizedPrice)
    ? normalizedPrice
    : `${normalizedPrice} ${currency}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getListingUrl(id) {
  return `listing.html?id=${encodeURIComponent(id)}`;
}

function decorateCardForDetails(card, id) {
  card.dataset.id = id;
  card.tabIndex = 0;
  card.setAttribute("role", "link");
  card.setAttribute("aria-label", `Otw\u00f3rz og\u0142oszenie: ${card.dataset.title || "szczeg\u00f3\u0142y"}`);

  const detailsLink = card.querySelector(".listing-footer a");
  if (detailsLink) {
    detailsLink.setAttribute("href", getListingUrl(id));
  }
}

function createListingCard(listing) {
  const article = document.createElement("article");
  const category = listing.category || "Og\u0142oszenie";
  const country = listing.country || "Nie podano kraju";
  const city = listing.city || "Nie podano miasta";
  const currency = listing.currency || getCurrencyForCountry(country);
  const { badge, gradient } = getCategoryMeta(category);
  const imageMarkup = listing.image
    ? `<img class="listing-image-photo" src="${listing.image}" alt="${escapeHtml(listing.title || "Zdj\u0119cie og\u0142oszenia")}">`
    : "";

  article.className = "listing-card listing-card-user";
  article.dataset.title = listing.title || "";
  article.dataset.category = category;
  article.dataset.country = normalizeText(country);
  article.dataset.city = city;
  article.dataset.createdAt = listing.createdAt || "";

  article.innerHTML = `
    <div class="listing-image ${gradient}">
      <span class="listing-badge">${badge}</span>
      ${imageMarkup}
    </div>
    <div class="listing-content">
      <div class="listing-topline">
        <span>${category}</span>
        <span>${city} \u2022 ${country}</span>
      </div>
      <h3>${escapeHtml(listing.title || "Nowe og\u0142oszenie")}</h3>
      <p class="price">${formatPrice(listing.price, currency)}</p>
      <p>${escapeHtml(listing.description || "Brak opisu og\u0142oszenia.")}</p>
      <div class="listing-footer">
        <span>Nowe</span>
        <a href="${getListingUrl(listing.id)}">Szczeg\u00f3\u0142y</a>
      </div>
    </div>
  `;

  decorateCardForDetails(article, listing.id);
  return article;
}

async function renderStoredListings() {
  if (!listingGrid) {
    return;
  }

  listingGrid.querySelectorAll(".listing-card-user").forEach((card) => card.remove());

  const listings = (await fetchListings()).sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

  listings.forEach((listing) => {
    listingGrid.prepend(createListingCard(listing));
  });
}

function decorateDemoCards() {
  getListingCards()
    .filter((card) => !card.classList.contains("listing-card-user"))
    .forEach((card, index) => {
      const demoId = DEMO_LISTINGS[index]?.id || `demo-${index + 1}`;
      decorateCardForDetails(card, demoId);
    });
}

function updateListings() {
  const listingCards = getListingCards();

  if (!listingCards.length) {
    return;
  }

  const query = normalizeText(searchInput?.value || "");
  let visibleCount = 0;

  listingCards.forEach((card) => {
    const title = normalizeText(card.dataset.title || "");
    const category = normalizeText(card.dataset.category || "");
    const country = normalizeText(card.dataset.country || "");
    const city = normalizeText(card.dataset.city || "");
    const matchesQuery =
      query === "" ||
      title.includes(query) ||
      category.includes(query) ||
      country.includes(query) ||
      city.includes(query);
    const matchesFilter = activeFilter === "all" || category === normalizeText(activeFilter);
    const matchesCountry = activeCountry === "all" || country === normalizeText(activeCountry);
    const isVisible = matchesQuery && matchesFilter && matchesCountry;

    card.classList.toggle("hidden", !isVisible);

    if (isVisible) {
      visibleCount += 1;
    }
  });

  if (listingEmpty) {
    listingEmpty.classList.toggle("hidden", visibleCount > 0);
  }
}

function syncCountryControls(countryValue) {
  if (countrySelect) {
    countrySelect.value = countryValue;
  }

  countryChips.forEach((item) => {
    item.classList.toggle("active", item.dataset.countryFilter === countryValue);
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
      activeFilter = chip.dataset.filter || "all";

      filterChips.forEach((item) => {
        item.classList.toggle("active", item === chip);
      });

      updateListings();
    });
  });
}

if (countryChips.length) {
  countryChips.forEach((chip) => {
    chip.addEventListener("click", () => {
      activeCountry = chip.dataset.countryFilter || "all";
      syncCountryControls(activeCountry);
      updateListings();
    });
  });
}

if (countrySelect) {
  countrySelect.addEventListener("change", () => {
    activeCountry = countrySelect.value || "all";

    if (activeCountry !== "all" && !SCANDINAVIAN_COUNTRIES.includes(normalizeText(activeCountry))) {
      activeCountry = "all";
    }

    syncCountryControls(activeCountry);
    updateListings();
  });
}

if (categoryCards.length && filterChips.length) {
  categoryCards.forEach((card) => {
    card.addEventListener("click", () => {
      const targetFilter = card.dataset.filterTarget || "all";
      const targetChip = [...filterChips].find((chip) => chip.dataset.filter === targetFilter);

      if (!targetChip) {
        return;
      }

      targetChip.click();
      document.getElementById("ogloszenia")?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  });
}

async function initHomepage() {
  await renderStoredListings();
  decorateDemoCards();
  syncCountryControls(activeCountry);
  updateListings();
}

initHomepage();
