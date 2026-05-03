const RENDER_API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_API_PATH = "/api/listings";
const MANAGE_API_PATH = "/api/manage";
const LISTINGS_JSON_URL = "../listings.json";
const AI_GENERATE_API_PATH = "/api/generate-description";
const MODERATION_API_PATH = "/api/moderate-listing";
const COUNTRY_FILTER_STORAGE_KEY = "twojbazar-mobile-country-filter";
const LISTINGS_CACHE_KEY = "twojbazar-mobile-listings-cache";

const appMain = document.getElementById("appMain");
const topbarTitle = document.getElementById("topbarTitle");
const topbarAction = document.getElementById("topbarAction");
const backButton = document.getElementById("backButton");
const bottomNavLinks = [...document.querySelectorAll(".bottom-nav-link")];

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

const COUNTRY_OPTIONS = [
  "Szwecja",
  "Norwegia",
  "Dania",
];

const COUNTRY_CURRENCY_MAP = {
  Szwecja: "SEK",
  Norwegia: "NOK",
  Dania: "DKK",
};

const CITIES_BY_COUNTRY = {
  Szwecja: ["Stockholm", "Sztokholm", "Göteborg", "Malmö", "Uppsala", "Västerås", "Örebro", "Linköping", "Helsingborg", "Jönköping", "Lund", "Norrköping"],
  Norwegia: ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Tromsø", "Sandnes", "Ålesund"],
  Dania: ["København", "Kopenhaga", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle"],
};

const COUNTRY_FLAG_MAP = {
  Szwecja: "🇸🇪",
  Norwegia: "🇳🇴",
  Dania: "🇩🇰",
};

CITIES_BY_COUNTRY.Szwecja = ["Stockholm", "Sztokholm", "G\u00f6teborg", "Malm\u00f6", "Uppsala", "V\u00e4ster\u00e5s", "\u00d6rebro", "Link\u00f6ping", "Helsingborg", "J\u00f6nk\u00f6ping", "Lund", "Norrk\u00f6ping"];
CITIES_BY_COUNTRY.Norwegia = ["Oslo", "Bergen", "Trondheim", "Stavanger", "Drammen", "Fredrikstad", "Kristiansand", "Troms\u00f8", "Sandnes", "\u00c5lesund"];
CITIES_BY_COUNTRY.Dania = ["K\u00f8benhavn", "Kopenhaga", "Aarhus", "Odense", "Aalborg", "Esbjerg", "Randers", "Kolding", "Horsens", "Vejle"];

COUNTRY_FLAG_MAP.Szwecja = "\ud83c\uddf8\ud83c\uddea";
COUNTRY_FLAG_MAP.Norwegia = "\ud83c\uddf3\ud83c\uddf4";
COUNTRY_FLAG_MAP.Dania = "\ud83c\udde9\ud83c\uddf0";

const CITY_DATABASE_URL = "../data/cities.json";

async function loadCitiesDatabase() {
  try {
    const response = await fetch(CITY_DATABASE_URL, { cache: "force-cache" });
    if (!response.ok) {
      throw new Error(`City database request failed: ${response.status}`);
    }

    const citiesByCountry = await response.json();
    Object.entries(citiesByCountry).forEach(([country, cities]) => {
      if (Array.isArray(cities) && cities.length) {
        CITIES_BY_COUNTRY[country] = cities;
      }
    });

    return CITIES_BY_COUNTRY;
  } catch (error) {
    console.warn("[TwojBazar APP] City database fallback is active:", error);
    return CITIES_BY_COUNTRY;
  }
}

const citiesDatabaseReady = loadCitiesDatabase();

const DEMO_LISTINGS = [
  { id: "demo-1", title: "Praca dam magazyn G\u00f6teborg", category: "Praca dam", price: "145", currency: "SEK", country: "Szwecja", city: "G\u00f6teborg", description: "Praca od zaraz w polskim zespole, zmiana dzienna i pomoc we wdro\u017ceniu.", createdAt: "2026-04-01T09:00:00.000Z" },
  { id: "demo-2", title: "Pok\u00f3j wynajm\u0119 Sztokholm", category: "Pok\u00f3j wynajm\u0119", price: "5 200", currency: "SEK", country: "Szwecja", city: "Sztokholm", description: "Pok\u00f3j dla jednej osoby, dobra komunikacja i blisko polskiego sklepu.", createdAt: "2026-04-01T11:00:00.000Z" },
  { id: "demo-3", title: "Us\u0142ugi oferuj\u0119 remonty Bergen", category: "Us\u0142ugi oferuj\u0119", price: "Od 400 NOK", currency: "NOK", country: "Norwegia", city: "Bergen", description: "Polska ekipa, szybkie terminy, mieszkania i ma\u0142e lokale u\u017cytkowe.", createdAt: "2026-04-01T15:00:00.000Z" },
  { id: "demo-4", title: "Pomoc / formalno\u015bci Uppsala", category: "Pomoc / formalno\u015bci", price: "Konsultacja", currency: "SEK", country: "Szwecja", city: "Uppsala", description: "Wsparcie po polsku w dokumentach, urz\u0119dach i podstawowych formalno\u015bciach.", createdAt: "2026-04-01T22:00:00.000Z" },
  { id: "demo-5", title: "Poznam ludzi w Oslo", category: "Poznam ludzi", price: "Spo\u0142eczno\u015b\u0107", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Szukam kontaktu z Polakami do rozm\u00f3w, spacer\u00f3w i wsp\u00f3lnego poznawania miasta.", createdAt: "2026-04-01T23:00:00.000Z" },
];

let listingsCache = [];
let routeRenderId = 0;
const HOME_CATEGORY_SHORTCUTS = [
  { label: "Praca dam", value: "Praca dam", hint: "Oferty pracy od Polonii na miejscu" },
  { label: "Pok\u00f3j wynajm\u0119", value: "Pok\u00f3j wynajm\u0119", hint: "Pokoje do wynaj\u0119cia w wybranym kraju" },
  { label: "Us\u0142ugi oferuj\u0119", value: "Us\u0142ugi oferuj\u0119", hint: "Pomoc, remonty i wsparcie na miejscu" },
  { label: "Transport", value: "Transport", hint: "Przejazdy, przewozy i pomoc w trasie" },
];

const HELP_SECTIONS = [
  {
    country: "Szwecja",
    intro: "Najważniejsze sprawy po przyjeździe do Szwecji to identyfikacja, podatki i pomoc w znalezieniu pracy.",
    items: [
      {
        name: "Personnummer",
        topic: "Dokumenty",
        description: "Szwedzki numer identyfikacyjny potrzebny do wielu codziennych spraw.",
        tasks: "Rejestracja pobytu, formalności urzędowe i podstawy codziennego funkcjonowania.",
        url: "https://www.skatteverket.se/servicelankar/otherlanguages/inenglishengelska/individualsandemployees/movingtosweden.4.3810a01c150939e893f4077.html",
      },
      {
        name: "Skatteverket",
        topic: "Podatki",
        description: "Główny urząd podatkowy w Szwecji odpowiedzialny też za wiele spraw rejestrowych.",
        tasks: "Podatki, adres, rejestracja, personnummer i podstawowe sprawy urzędowe.",
        url: "https://www.skatteverket.se/",
      },
      {
        name: "Arbetsförmedlingen",
        topic: "Praca",
        description: "Szwedzki urząd pracy z ofertami i wsparciem dla osób szukających zatrudnienia.",
        tasks: "Szukanie pracy, rejestracja i podstawowe wsparcie zawodowe.",
        url: "https://www.arbetsformedlingen.se/",
      },
    ],
  },
  {
    country: "Norwegia",
    intro: "W Norwegii najczęściej potrzebne są informacje o pracy, podatkach i świadczeniach.",
    items: [
      {
        name: "NAV",
        topic: "Praca i świadczenia",
        description: "Norweski urząd zajmujący się pracą, świadczeniami i wsparciem dla mieszkańców.",
        tasks: "Oferty pracy, rejestracja, zasiłki i wsparcie przy zatrudnieniu.",
        url: "https://www.nav.no/en/home",
      },
      {
        name: "Skatteetaten",
        topic: "Podatki",
        description: "Norweski urząd podatkowy z informacjami o rozliczeniach i numerach identyfikacyjnych.",
        tasks: "Karta podatkowa, rozliczenie i identyfikacja podatkowa.",
        url: "https://www.skatteetaten.no/en/person/",
      },
    ],
  },
  {
    country: "Dania",
    intro: "W Danii najważniejsze są sprawy podatkowe i lokalne wsparcie przy pracy oraz zatrudnieniu.",
    items: [
      {
        name: "SKAT",
        topic: "Podatki",
        description: "Duński system podatkowy i oficjalne informacje dla osób pracujących w Danii.",
        tasks: "Podatki, karta podatkowa, rozliczenie i podstawowe formalności finansowe.",
        url: "https://skat.dk/en-gb",
      },
      {
        name: "Jobcenter",
        topic: "Praca",
        description: "Lokalne centrum pracy pomagające w znalezieniu zatrudnienia i kontakcie z rynkiem pracy.",
        tasks: "Wsparcie przy szukaniu pracy i kontakt z urzędem pracy.",
        url: "https://lifeindenmark.borger.dk/working",
      },
    ],
  },
];
function getDefaultCountry() {
  return COUNTRY_OPTIONS[0];
}

function getApiCandidates(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [];

  if (window.location.protocol.startsWith("http")) {
    candidates.push(normalizedPath);
  }

  candidates.push(`${RENDER_API_BASE_URL}${normalizedPath}`);
  return [...new Set(candidates)];
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getCityFilterValue(value) {
  const normalizedValue = normalizeText(value);
  return normalizedValue || "all";
}

function getCitiesForCountry(country) {
  const selectedCountry = COUNTRY_OPTIONS.includes(country) ? country : getDefaultCountry();
  return CITIES_BY_COUNTRY[selectedCountry] || [];
}

function setupCityAutocomplete({ input, countrySelect }) {
  if (!input || !countrySelect) {
    return;
  }

  const dropdown = document.createElement("div");
  dropdown.className = "city-suggestions hidden";
  dropdown.setAttribute("role", "listbox");
  input.setAttribute("autocomplete", "off");
  input.setAttribute("aria-autocomplete", "list");
  input.setAttribute("aria-expanded", "false");
  input.insertAdjacentElement("afterend", dropdown);

  let activeIndex = -1;
  let currentSuggestions = [];

  function hideSuggestions() {
    dropdown.classList.add("hidden");
    dropdown.innerHTML = "";
    input.setAttribute("aria-expanded", "false");
    activeIndex = -1;
    currentSuggestions = [];
  }

  function selectSuggestion(city) {
    input.value = city;
    hideSuggestions();
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function renderSuggestions() {
    const query = normalizeText(input.value);
    const country = normalizeSpaces(countrySelect.value);
    const cities = CITIES_BY_COUNTRY[country] || [];

    if (!query || !cities.length) {
      hideSuggestions();
      return;
    }

    currentSuggestions = cities
      .map((city) => ({
        city,
        normalized: normalizeText(city),
      }))
      .filter((item) => item.normalized.includes(query))
      .sort((first, second) => {
        const firstStarts = first.normalized.startsWith(query);
        const secondStarts = second.normalized.startsWith(query);

        if (firstStarts !== secondStarts) {
          return firstStarts ? -1 : 1;
        }

        return first.city.localeCompare(second.city, "pl");
      })
      .map((item) => item.city)
      .slice(0, 8);

    if (!currentSuggestions.length) {
      hideSuggestions();
      return;
    }

    dropdown.innerHTML = currentSuggestions
      .map((city, index) => `<button class="city-suggestion${index === activeIndex ? " active" : ""}" type="button" role="option" data-city="${escapeHtml(city)}">${escapeHtml(city)}</button>`)
      .join("");
    dropdown.classList.remove("hidden");
    input.setAttribute("aria-expanded", "true");
  }

  input.addEventListener("input", () => {
    activeIndex = -1;
    renderSuggestions();
  });

  input.addEventListener("focus", renderSuggestions);

  citiesDatabaseReady.then(() => {
    if (document.activeElement === input) {
      renderSuggestions();
    }
  });

  input.addEventListener("keydown", (event) => {
    if (dropdown.classList.contains("hidden") || !currentSuggestions.length) {
      return;
    }

    if (event.key === "ArrowDown") {
      event.preventDefault();
      activeIndex = (activeIndex + 1) % currentSuggestions.length;
      renderSuggestions();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      activeIndex = (activeIndex - 1 + currentSuggestions.length) % currentSuggestions.length;
      renderSuggestions();
    } else if (event.key === "Enter" && activeIndex >= 0) {
      event.preventDefault();
      selectSuggestion(currentSuggestions[activeIndex]);
    } else if (event.key === "Escape") {
      hideSuggestions();
    }
  });

  dropdown.addEventListener("mousedown", (event) => {
    event.preventDefault();
    const button = event.target.closest("[data-city]");
    if (button) {
      selectSuggestion(button.dataset.city);
    }
  });

  countrySelect.addEventListener("change", hideSuggestions);

  document.addEventListener("click", (event) => {
    if (!input.parentElement?.contains(event.target)) {
      hideSuggestions();
    }
  });
}

function normalizeCategory(value) {
  const rawCategory = normalizeSpaces(value);

  if (!rawCategory) {
    return "Inne";
  }

  const directMatch = CATEGORY_OPTIONS.find((category) => normalizeText(category) === normalizeText(rawCategory));

  if (directMatch) {
    return directMatch;
  }

  const normalizedValue = normalizeText(rawCategory);

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

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeSpaces(country)] || "EUR";
}

function formatCountryLabel(country) {
  const normalizedCountry = normalizeSpaces(country);
  return `${COUNTRY_FLAG_MAP[normalizedCountry] || "🌍"} ${normalizedCountry}`;
}

function renderCountryLabel(country) {
  const normalizedCountry = normalizeSpaces(country);
  const flag = COUNTRY_FLAG_MAP[normalizedCountry] || "🌍";
  return `<span class="country-flag" aria-hidden="true">${escapeHtml(flag)}</span><span class="country-name">${escapeHtml(normalizedCountry)}</span>`;
}

function formatPrice(price, currency = "EUR") {
  const normalizedPrice = String(price || "").trim();
  if (!normalizedPrice) {
    return "Cena do ustalenia";
  }

  // Check for Polish, Swedish, Norwegian, and Danish characters
  return /[a-zA-Z\u0105\u0107\u0119\u0142\u0144\u00f3\u015b\u017a\u017c\u0104\u0106\u0118\u0141\u0143\u00d3\u015a\u0179\u017b\u00e5\u00e4\u00f6\u00c5\u00c4\u00d6\u00e6\u00f8\u00c6\u00d8]/.test(normalizedPrice)
    ? normalizedPrice
    : `${normalizedPrice} ${currency}`;
}

function normalizeListingRecord(listing) {
  return {
    ...listing,
    title: normalizeSpaces(listing?.title || ""),
    category: normalizeCategory(listing?.category || ""),
    country: normalizeSpaces(listing?.country || ""),
    city: normalizeSpaces(listing?.city || ""),
    description: normalizeDescription(listing?.description || ""),
    currency: listing?.currency || getCurrencyForCountry(listing?.country),
    status: normalizeStatus(listing?.status),
  };
}

function normalizeStatus(value) {
  const normalizedValue = normalizeText(value);

  if (normalizedValue === "inactive") {
    return "inactive";
  }

  if (normalizedValue === "deleted") {
    return "deleted";
  }

  return "active";
}

function mergeListings(listings = []) {
  const mergedById = new Map();

  listings.forEach((listing) => {
    const normalizedListing = normalizeListingRecord(listing);
    const id = String(normalizedListing.id || "").trim();

    if (!id || !COUNTRY_OPTIONS.includes(normalizedListing.country) || normalizedListing.status !== "active") {
      return;
    }

    mergedById.set(id, normalizedListing);
  });

  return [...mergedById.values()].sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });

}

function readCachedListings() {
  try {
    const raw = sessionStorage.getItem(LISTINGS_CACHE_KEY);
    const data = raw ? JSON.parse(raw) : [];
    return Array.isArray(data) ? mergeListings(data) : [];
  } catch (error) {
    console.error("Mobile listings cache read error:", error);
    return [];
  }
}

function writeCachedListings(listings) {
  try {
    sessionStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify(mergeListings(listings)));
  } catch (error) {
    console.error("Mobile listings cache write error:", error);
  }
}

function getRoute() {
  const hash = window.location.hash.replace(/^#/, "");

  if (!hash || hash === "home") {
    return { name: "home" };
  }
  if (hash === "listings") {
    return { name: "home", scrollToListings: true };
  }
  if (hash === "add") {
    return { name: "add", quickAi: false };
  }
  if (hash === "add-ai") {
    return { name: "add", quickAi: true };
  }
  if (hash === "help") {
    return { name: "help" };
  }
  if (hash.startsWith("listing/")) {
    return { name: "listing", id: hash.split("/")[1] || "" };
  }
  if (hash.startsWith("manage/")) {
    return { name: "manage", token: hash.split("/")[1] || "" };
  }

  return { name: "home" };
}

function setTopbar(route) {
  topbarTitle.textContent = "Twoj Bazar";
  backButton.classList.toggle("hidden", route.name === "home");
  topbarAction.textContent = "Dodaj ogłoszenie";
  topbarAction.setAttribute("aria-label", "Przejdź do dodawania ogłoszenia");

  bottomNavLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === (["home", "add", "help"].includes(route.name) ? route.name : ""));
  });

}

async function requestApi(path, options = {}) {
  let lastError = null;

  for (const url of getApiCandidates(path)) {
    try {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(await readApiError(response, `Błąd API (${response.status})`));
      }

      return response;
    } catch (error) {
      lastError = error;
      console.error("Mobile API request error:", { url, error });
    }
  }

  throw lastError || new Error("Nie udało się połączyć z API.");
}

async function fetchListings() {
  const cachedListings = readCachedListings();
  const allListings = [...cachedListings];

  try {
    const response = await fetch(LISTINGS_JSON_URL, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`B\u0142\u0105d pobierania listings.json: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      allListings.push(...data);
    }
  } catch (error) {
    console.error("Mobile listings JSON read error:", error);
  }

  try {
    const response = await requestApi(LISTINGS_API_PATH, { cache: "no-store" });
    if (!response.ok) {
      throw new Error(`B\u0142\u0105d pobierania og\u0142osze\u0144: ${response.status}`);
    }

    const data = await response.json();
    if (Array.isArray(data)) {
      allListings.push(...data);
    }
  } catch (error) {
    console.error("Mobile listings API read error:", error);
  }

  allListings.push(...DEMO_LISTINGS);
  listingsCache = mergeListings(allListings);

  if (listingsCache.length) {
    writeCachedListings(listingsCache);
  }

  return [...listingsCache];
}

async function fetchListingById(id) {
  const allListings = listingsCache.length ? [...listingsCache] : await fetchListings();
  return allListings.find((listing) => String(listing.id) === String(id)) || null;
}

async function createListing(listing, imageFile) {
  const formData = new FormData();

  Object.entries(listing).forEach(([key, value]) => {
    if (key === "image" || key === "images" || value === undefined || value === null) {
      return;
    }

    formData.append(key, typeof value === "boolean" ? String(value) : String(value));
  });

  if (imageFile) {
    formData.append("image", imageFile, imageFile.name || "listing-image.jpg");
  }

  const response = await requestApi(LISTINGS_API_PATH, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, `Błąd zapisu ogłoszenia (${response.status})`));
  }

  return response.json();
}

function getEmailDeliveryMessage(createdListing) {
  const deliveryStatus = createdListing?.emailDelivery?.status;

  if (deliveryStatus === "sent") {
    return " Link do edycji wysłaliśmy też na podany e-mail.";
  }

  if (deliveryStatus === "not_configured") {
    return " Link do edycji jest gotowy, ale wysyłka e-mail nie jest jeszcze skonfigurowana.";
  }

  if (deliveryStatus === "failed") {
    return " Link do edycji jest gotowy, ale nie udało się wysłać wiadomości e-mail.";
  }

  if (deliveryStatus === "skipped") {
    return " Link do edycji jest gotowy. E-mail nie został wysłany, bo nie podano adresu.";
  }

  return "";
}

async function readApiError(response, fallbackLabel) {
  try {
    const data = await response.json();
    return data?.error || `${fallbackLabel}: ${response.status}`;
  } catch (_error) {
    return `${fallbackLabel}: ${response.status}`;
  }
}

async function fetchManagedListing(token) {
  const response = await requestApi(`${MANAGE_API_PATH}/${encodeURIComponent(token)}`, { cache: "no-store" });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Błąd pobierania linku zarządzania"));
  }

  return response.json();
}

async function updateManagedListing(token, listing) {
  const formData = new FormData();

  Object.entries(listing).forEach(([key, value]) => {
    if (key === "image" || key === "images" || value === undefined || value === null) {
      return;
    }

    formData.append(key, typeof value === "boolean" ? String(value) : String(value));
  });

  if (listing.imageFile) {
    formData.append("image", listing.imageFile, listing.imageFile.name || "listing-image.jpg");
  } else if (listing.clearImage) {
    formData.append("clearImage", "true");
  }

  const response = await requestApi(`${MANAGE_API_PATH}/${encodeURIComponent(token)}`, {
    method: "PUT",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Błąd zapisu zmian"));
  }

  return response.json();
}

async function updateManagedListingStatus(token, status) {
  const response = await requestApi(`${MANAGE_API_PATH}/${encodeURIComponent(token)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Błąd zmiany statusu"));
  }

  return response.json();
}

async function deleteManagedListing(token) {
  const response = await requestApi(`${MANAGE_API_PATH}/${encodeURIComponent(token)}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Błąd usuwania ogłoszenia"));
  }

  return response.json();
}

function extractManagementToken(managementUrl) {
  if (!managementUrl) {
    return "";
  }

  try {
    const parsed = new URL(managementUrl, window.location.origin);
    return parsed.searchParams.get("token") || "";
  } catch (_error) {
    return "";
  }
}

async function moderateListingContent(payload) {
  const response = await requestApi(MODERATION_API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`B\u0142\u0105d moderacji: ${response.status}`);
  }

  return response.json();
}

async function generateListingFromImage(file) {
  console.debug("[TwojBazar APP] generateListingFromImage selected file", {
    hasFile: Boolean(file),
    fileName: file?.name || null,
    fileSize: file?.size || 0,
    fileType: file?.type || null,
  });

  const formData = new FormData();
  formData.append("image", file);

  const response = await requestApi(AI_GENERATE_API_PATH, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response, "Błąd AI"));
  }

  return response.json();
}

function readImageAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!file) {
      resolve("");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(new Error("Nie uda\u0142o si\u0119 odczyta\u0107 zdj\u0119cia."));
    reader.readAsDataURL(file);
  });

}

function getInputImageFile(input) {
  return input?.files?.[0] || input?.__twojBazarSelectedFile || null;
}

function clearInputImageFile(input) {
  if (!input) {
    return;
  }

  input.__twojBazarSelectedFile = null;
  input.value = "";
}

function getStoredCountryFilter() {
  try {
    const value = localStorage.getItem(COUNTRY_FILTER_STORAGE_KEY);
    return value && COUNTRY_OPTIONS.includes(value) ? value : getDefaultCountry();
  } catch (error) {
    console.error("Country filter storage error:", error);
    return getDefaultCountry();
  }
}

function setStoredCountryFilter(country) {
  const value = COUNTRY_OPTIONS.includes(country) ? country : getDefaultCountry();
  localStorage.setItem(COUNTRY_FILTER_STORAGE_KEY, value);
}

function navigate(hash) {
  const normalizedHash = String(hash || "home").replace(/^#/, "");
  if (window.location.hash === `#${normalizedHash}`) {
    renderRoute();
    return;
  }

  window.location.hash = `#${normalizedHash}`;
  requestAnimationFrame(renderRoute);
}

function getAppRouteUrl(hash) {
  const normalizedHash = String(hash || "home").replace(/^#/, "");
  return `${window.location.origin}${window.location.pathname}#${normalizedHash}`;
}

function isLocalHost() {
  return ["localhost", "127.0.0.1", "0.0.0.0"].includes(window.location.hostname);
}

function normalizeListingImageUrl(value) {
  const imageUrl = String(value || "").trim();

  if (!imageUrl || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  if (imageUrl.startsWith("/uploads/")) {
    return isLocalHost() ? imageUrl : `${RENDER_API_BASE_URL}${imageUrl}`;
  }

  if (imageUrl.startsWith("uploads/")) {
    return isLocalHost() ? `/${imageUrl}` : `${RENDER_API_BASE_URL}/${imageUrl}`;
  }

  if (!/^https?:\/\//i.test(imageUrl)) {
    return imageUrl;
  }

  try {
    const url = new URL(imageUrl);
    const apiUrl = new URL(RENDER_API_BASE_URL);

    if (url.hostname === apiUrl.hostname) {
      return `${RENDER_API_BASE_URL}${url.pathname}`;
    }

    if (url.pathname.startsWith("/uploads/") && url.hostname !== apiUrl.hostname) {
      return `${RENDER_API_BASE_URL}${url.pathname}`;
    }
  } catch (_error) {
    return imageUrl;
  }

  return imageUrl;
}

function getBackRoute(route) {
  if (!route || route.name === "home") {
    return "home";
  }

  return "home";
}

function getListingImage(listing) {
  return normalizeListingImageUrl(Array.isArray(listing.images) && listing.images.length ? listing.images[0] : listing.image || "");
}

function getSortablePriceValue(price) {
  const normalizedPrice = String(price || "")
    .replace(",", ".")
    .replace(/\s+/g, "")
    .match(/-?\d+(?:\.\d+)?/);

  return normalizedPrice ? Number(normalizedPrice[0]) : null;
}

function compareListings(firstListing, secondListing, activeSort) {
  if (activeSort === "price-asc" || activeSort === "price-desc") {
    const firstPrice = getSortablePriceValue(firstListing.price);
    const secondPrice = getSortablePriceValue(secondListing.price);
    const firstHasPrice = firstPrice !== null;
    const secondHasPrice = secondPrice !== null;

    if (firstHasPrice && secondHasPrice) {
      return activeSort === "price-asc" ? firstPrice - secondPrice : secondPrice - firstPrice;
    }

    if (firstHasPrice !== secondHasPrice) {
      return firstHasPrice ? -1 : 1;
    }
  }

  const firstDate = new Date(firstListing.createdAt || "").getTime();
  const secondDate = new Date(secondListing.createdAt || "").getTime();
  const firstTimestamp = Number.isFinite(firstDate) ? firstDate : 0;
  const secondTimestamp = Number.isFinite(secondDate) ? secondDate : 0;
  return secondTimestamp - firstTimestamp;
}

function parsePriceValue(value) {
  const normalizedValue = normalizeSpaces(value).replace(/\s+/g, "").replace(",", ".");
  const price = Number(normalizedValue);
  return Number.isFinite(price) ? price : "";
}

function renderHomeView(listings, query = "", country = getDefaultCountry(), category = "all", sort = "newest", city = "all") {
  const normalizedQuery = normalizeText(query);
  const selectedCountry = COUNTRY_OPTIONS.includes(country) ? country : getDefaultCountry();
  const normalizedCountry = normalizeText(selectedCountry);
  const normalizedCategory = normalizeText(category);
  const activeSort = ["newest", "price-asc", "price-desc"].includes(sort) ? sort : "newest";
  const activeCity = getCityFilterValue(city);
  const cityOptions = getCitiesForCountry(selectedCountry);
  const selectedCity = activeCity === "all" || cityOptions.some((item) => getCityFilterValue(item) === activeCity) ? activeCity : "all";

  const filtered = listings.filter((listing) => {
    const haystack = [listing.title, listing.category, listing.country, listing.city, listing.description].map(normalizeText);
    const matchesQuery = !normalizedQuery || haystack.some((entry) => entry.includes(normalizedQuery));
    const matchesCountry = normalizeText(listing.country) === normalizedCountry;
    const matchesCategory = normalizedCategory === "all" || normalizeText(normalizeCategory(listing.category)) === normalizedCategory;
    const matchesCity = selectedCity === "all" || getCityFilterValue(listing.city) === selectedCity;
    return matchesQuery && matchesCountry && matchesCategory && matchesCity;
  }).sort((firstListing, secondListing) => compareListings(firstListing, secondListing, activeSort));

  appMain.innerHTML = `
    <section class="screen hero-card">
      <div class="hero-content">
        <p class="hero-kicker">Portal Polonii za granic\u0105</p>
        <h2 class="hero-title">Og\u0142oszenia dla Polak\u00f3w w Szwecji, Norwegii i Danii</h2>
        <p class="hero-text">Praca, pokoje, transport i pomoc w formalno\u015bciach w Szwecji, Norwegii i Danii.</p>
        <div class="hero-actions hero-actions-primary">
          <a class="button button-accent hero-cta" href="#add">Dodaj og\u0142oszenie</a>
          <a class="button button-secondary hero-browse" href="#listings">Przegl\u0105daj og\u0142oszenia</a>
        </div>
        <div class="hero-subactions">
          <a class="hero-secondary-link hero-ai-link" href="#add-ai">Dodaj szybciej z pomoc\u0105 AI</a>
        </div>
        <div class="hero-stats">
          <div class="hero-stat">
            <strong>Kraj i miasto maj\u0105 znaczenie</strong>
            <span class="muted">szukaj lokalnie, tam gdzie naprawd\u0119 jeste\u015b</span>
          </div>
          <div class="hero-stat">
            <strong>Start w Skandynawii</strong>
            <span class="muted">Kolejne kraje dodamy p\u00f3\u017aniej, gdy portal si\u0119 rozwinie.</span>
          </div>
        </div>
      </div>
    </section>

    <section class="screen search-card" id="listings">
      <div class="section-heading">
        <p class="section-eyebrow">Start</p>
        <h2>Szukaj og\u0142osze\u0144</h2>
        <p class="section-text">Filtruj po kraju lub wpisz oficjalną kategorię albo miasto.</p>
      </div>
      <div class="search-row">
        <label class="search-input-wrap" for="homeSearchInput">
          <input id="homeSearchInput" type="search" placeholder="Praca dam, pok\u00f3j wynajm\u0119, transport, pomoc / formalno\u015bci..." value="${escapeHtml(query)}">
        </label>
        <label class="field-group" for="homeSortSelect">
          <span>Sortowanie</span>
          <select id="homeSortSelect">
            <option value="newest" ${activeSort === "newest" ? "selected" : ""}>Najnowsze</option>
            <option value="price-asc" ${activeSort === "price-asc" ? "selected" : ""}>Najtańsze</option>
            <option value="price-desc" ${activeSort === "price-desc" ? "selected" : ""}>Najdroższe</option>
          </select>
        </label>
        <label class="field-group" for="homeCitySelect">
          <span>Miasto</span>
          <select id="homeCitySelect">
            <option value="all">Wszystkie miasta</option>
            ${cityOptions.map((item) => `<option value="${escapeHtml(item)}" ${getCityFilterValue(item) === selectedCity ? "selected" : ""}>${escapeHtml(item)}</option>`).join("")}
          </select>
        </label>
        <div class="country-filter-group">
          <p class="filter-label">Wybierz kraj</p>
          <div class="chip-row chip-row-countries">
          ${COUNTRY_OPTIONS.map((item) => `
            <button class="nav-pill country-pill ${normalizeText(item) === normalizedCountry ? "active" : ""}" type="button" data-country="${escapeHtml(item)}">${renderCountryLabel(item)}</button>
          `).join("")}
          </div>
        </div>
      </div>
    </section>

    <section class="screen">
      <div class="section-heading">
        <p class="section-eyebrow">Szybkie skr\u00f3ty</p>
        <h2>Najcz\u0119stsze kategorie</h2>
        <p class="section-text">Wybierz temat, kt\u00f3rego szukasz. Wyniki od razu poka\u017c\u0105 og\u0142oszenia z tej kategorii.</p>
      </div>
      <div class="category-grid">
        ${HOME_CATEGORY_SHORTCUTS.map((item) => `
          <button class="category-card ${normalizeText(item.value) === normalizedCategory ? "active" : ""}" type="button" data-category="${escapeHtml(item.value)}">
            <strong>${escapeHtml(item.label)}</strong>
            <span>${escapeHtml(item.hint)}</span>
          </button>
        `).join("")}
      </div>
    </section>

    <section class="screen">
      <div class="section-heading">
        <p class="section-eyebrow">Og\u0142oszenia</p>
        <h2>${normalizedCategory === "all" ? "Najnowsze oferty" : `Wyniki: ${escapeHtml(category)}`}</h2>
        <p class="section-text">Prosty mobilny uk\u0142ad, z cen\u0105 i lokalizacj\u0105 widoczn\u0105 od razu.</p>
      </div>
      <div class="app-list">
        ${filtered.length ? filtered.map((listing) => `
          <article class="panel listing-card" data-listing-id="${escapeHtml(listing.id)}">
            <div class="listing-card-media">
              <div class="listing-thumb">
                ${getListingImage(listing)
                  ? `<img src="${escapeHtml(getListingImage(listing))}" alt="${escapeHtml(listing.title || "Zdj\u0119cie oferty")}">`
                  : `<div class="listing-thumb-fallback">Brak zdj\u0119cia</div>`}
              </div>
              <div class="listing-copy">
                <span class="listing-category">${escapeHtml(normalizeCategory(listing.category))}</span>
                <h3 class="listing-title">${escapeHtml(listing.title || "Nowe og\u0142oszenie")}</h3>
                <p class="listing-location">${escapeHtml(listing.city || "Nie podano miasta")} \u2022 ${escapeHtml(listing.country || "Nie podano kraju")}</p>
                <p class="listing-price">${escapeHtml(formatPrice(listing.price, listing.currency || getCurrencyForCountry(listing.country)))}</p>
              </div>
            </div>
            <p class="listing-summary">${escapeHtml(listing.description || "Brak opisu og\u0142oszenia.")}</p>
            <div class="listing-bottomline">
              <span>${escapeHtml(listing.createdAt ? new Date(listing.createdAt).toLocaleDateString("pl-PL") : "Nowe")}</span>
              <span>Zobacz szczeg\u00f3\u0142y</span>
            </div>
          </article>
        `).join("") : `<div class="app-empty panel">Brak og\u0142osze\u0144 dla wybranego filtra.</div>`}
      </div>
    </section>
  `;

  document.getElementById("homeSearchInput")?.addEventListener("input", (event) => {
    const nextQuery = event.target.value;
    renderHomeView(listings, nextQuery, selectedCountry, category, activeSort, selectedCity);
    requestAnimationFrame(() => {
      const searchInput = document.getElementById("homeSearchInput");
      if (!searchInput) {
        return;
      }

      searchInput.focus({ preventScroll: true });
      searchInput.setSelectionRange(nextQuery.length, nextQuery.length);
    });
  });

  document.getElementById("homeSortSelect")?.addEventListener("change", (event) => {
    renderHomeView(listings, query, selectedCountry, category, event.target.value, selectedCity);
  });

  document.getElementById("homeCitySelect")?.addEventListener("change", (event) => {
    renderHomeView(listings, query, selectedCountry, category, activeSort, event.target.value);
  });

  appMain.querySelectorAll("[data-country]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextCountry = COUNTRY_OPTIONS.includes(button.dataset.country) ? button.dataset.country : getDefaultCountry();
      setStoredCountryFilter(nextCountry);
      renderHomeView(listings, query, nextCountry, category, activeSort, "all");
    });
  });

  appMain.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      renderHomeView(listings, query, selectedCountry, button.dataset.category || "all", activeSort, selectedCity);
    });
  });

  appMain.querySelectorAll("[data-listing-id]").forEach((card) => {
    card.addEventListener("click", () => {
      navigate(`listing/${card.dataset.listingId}`);
    });
  });

}

function renderDetailView(listing) {
  if (!listing) {
    appMain.innerHTML = `
      <section class="screen app-empty">
        <h2 class="detail-title">Nie znaleziono og\u0142oszenia</h2>
        <p class="section-text">Sprawd\u017a link albo wr\u00f3\u0107 do listy og\u0142osze\u0144.</p>
      </section>
    `;
    return;
  }

  const image = getListingImage(listing);
  const contactActions = [];

  if (listing.showPhone && listing.phone) {
    contactActions.push(`<a class="button button-accent" href="tel:${escapeHtml(listing.phone)}">Zadzwo\u0144</a>`);
  }
  if (listing.showEmail && listing.email) {
    contactActions.push(`<a class="button button-primary" href="mailto:${escapeHtml(listing.email)}">Napisz</a>`);
  }

  appMain.innerHTML = `
    <section class="screen detail-card">
      <div class="detail-gallery">
        <div class="detail-image">
          ${image ? `<img src="${escapeHtml(image)}" alt="${escapeHtml(listing.title || "Zdj\u0119cie oferty")}">` : `<div class="detail-placeholder">Brak zdj\u0119cia</div>`}
        </div>
      </div>

      <div class="section-heading">
        <span class="listing-category">${escapeHtml(normalizeCategory(listing.category))}</span>
        <h2 class="detail-title">${escapeHtml(listing.title || "Og\u0142oszenie")}</h2>
        <p class="detail-price">${escapeHtml(formatPrice(listing.price, listing.currency || getCurrencyForCountry(listing.country)))}</p>
      </div>

      <div class="detail-meta">
        <div class="hero-stat"><strong>Kraj</strong><span>${escapeHtml(listing.country || "Nie podano kraju")}</span></div>
        <div class="hero-stat"><strong>Miasto</strong><span>${escapeHtml(listing.city || "Nie podano miasta")}</span></div>
      </div>

      <section class="panel detail-sidebar">
        <div class="section-heading"><h3>Szczeg\u00f3\u0142y</h3></div>
        <div class="detail-description">${escapeHtml(listing.description || "Brak opisu og\u0142oszenia.")}</div>
      </section>

      <section class="contact-card">
        <p class="contact-label">Dane kontaktowe</p>
        <p class="contact-name">${escapeHtml(listing.contactName || "Og\u0142oszeniodawca")}</p>
        ${contactActions.length ? `<div class="contact-actions">${contactActions.join("")}</div>` : `<p class="muted">Kontakt zosta\u0142 ukryty w tym og\u0142oszeniu.</p>`}
      </section>
    </section>
  `;

  appMain.querySelector(".detail-image img")?.addEventListener("error", (event) => {
    const placeholder = document.createElement("div");
    placeholder.className = "detail-placeholder";
    placeholder.textContent = "Nie uda\u0142o si\u0119 za\u0142adowa\u0107 zdj\u0119cia";
    event.currentTarget.replaceWith(placeholder);
  });
}

function renderHelpView() {
  appMain.innerHTML = `
    <section class="screen help-screen">
      <div class="section-heading">
        <div>
          <span class="section-kicker">Pomoc</span>
          <h2>Pomoc dla Polaków w Skandynawii</h2>
        </div>
        <p class="section-text">Najważniejsze urzędy, praca, podatki i dokumenty dla Szwecji, Norwegii i Danii.</p>
      </div>
      <div class="stack-lg">
        ${HELP_SECTIONS.map((section) => `
          <section class="panel">
            <div class="section-heading">
              <div>
                <span class="section-kicker">${escapeHtml(section.country)}</span>
                <h3>${escapeHtml(section.country)}</h3>
              </div>
              <p class="section-text">${escapeHtml(section.intro)}</p>
            </div>
            <div class="stack-md">
              ${section.items.map((item) => `
                <article class="panel">
                  <span class="pill">${escapeHtml(item.topic)}</span>
                  <h4>${escapeHtml(item.name)}</h4>
                  <p class="section-text">${escapeHtml(item.description)}</p>
                  <p class="section-text"><strong>Co można tam załatwić:</strong> ${escapeHtml(item.tasks)}</p>
                  <div class="quick-actions">
                    <a class="button button-secondary" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Oficjalna strona</a>
                  </div>
                </article>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
}

renderHelpView = function renderHelpViewPolished() {
  appMain.innerHTML = `
    <section class="screen help-screen">
      <section class="panel help-hero-card">
        <span class="section-kicker">Pomoc</span>
        <h2>Jak korzysta\u0107 z TwojBazar?</h2>
        <p class="section-text">Szybka pomoc do og\u0142osze\u0144, kontaktu i bezpiecznego korzystania z portalu w Skandynawii.</p>
        <div class="quick-actions help-main-actions">
          <a class="button button-accent" href="#home">Przegl\u0105daj og\u0142oszenia</a>
          <a class="button button-secondary" href="#add">Dodaj og\u0142oszenie</a>
        </div>
      </section>

      <section class="help-action-grid" aria-label="Najcz\u0119stsze dzia\u0142ania">
        <article class="help-action-card">
          <span>01</span>
          <h3>Znajd\u017a og\u0142oszenie</h3>
          <p>Wybierz kraj, miasto i typ og\u0142oszenia. Wyniki zaw\u0119\u017c\u0105 si\u0119 bez prze\u0142adowania strony.</p>
        </article>
        <article class="help-action-card">
          <span>02</span>
          <h3>Dodaj ofert\u0119</h3>
          <p>Dodaj zdj\u0119cie, tytu\u0142, opis i kontakt. AI mo\u017cesz u\u017cy\u0107 tylko jako pomoc przy opisie.</p>
        </article>
        <article class="help-action-card">
          <span>03</span>
          <h3>Zarz\u0105dzaj og\u0142oszeniem</h3>
          <p>Po dodaniu zachowaj mail z prywatnym linkiem. Przez ten link edytujesz lub usuwasz og\u0142oszenie.</p>
        </article>
        <article class="help-action-card">
          <span>04</span>
          <h3>Bezpieczny kontakt</h3>
          <p>Nie wysy\u0142aj zaliczek bez sprawdzenia osoby. Ustal szczeg\u00f3\u0142y rozmow\u0105 i zachowaj potwierdzenia.</p>
        </article>
      </section>

      <div class="stack-lg">
        <div class="section-heading compact-heading">
          <div>
            <span class="section-kicker">Linki urz\u0119dowe</span>
            <h2>Przydatne sprawy w kraju</h2>
          </div>
          <p class="section-text">Najwa\u017cniejsze oficjalne miejsca dla pracy, podatk\u00f3w i dokument\u00f3w.</p>
        </div>
        ${HELP_SECTIONS.map((section) => `
          <section class="panel help-country-card">
            <div class="section-heading country-heading">
              <div>
                <span class="section-kicker">${escapeHtml(section.country)}</span>
                <h3>${escapeHtml(section.country)}</h3>
              </div>
              <p class="section-text">${escapeHtml(section.intro)}</p>
            </div>
            <div class="help-link-list">
              ${section.items.map((item) => `
                <article class="help-link-card">
                  <div>
                    <span class="pill">${escapeHtml(item.topic)}</span>
                    <h4>${escapeHtml(item.name)}</h4>
                    <p class="section-text">${escapeHtml(item.tasks)}</p>
                  </div>
                  <a class="button button-secondary help-link-button" href="${escapeHtml(item.url)}" target="_blank" rel="noopener noreferrer">Otw\u00f3rz</a>
                </article>
              `).join("")}
            </div>
          </section>
        `).join("")}
      </div>
    </section>
  `;
};

function renderAddView(quickAi = false) {
  const preferredCountry = getStoredCountryFilter();

  appMain.innerHTML = `
    <section class="screen add-card">
      <div class="section-heading">
        <h2 class="add-title">Dodaj ogłoszenie</h2>
        <p class="section-text">Dodaj ogłoszenie ręcznie albo użyj AI jako pomocniczego skrótu do przygotowania opisu ze zdjęcia.</p>
      </div>

      <section class="panel">
        <div class="section-heading">
          <p class="hero-kicker">Asystent AI</p>
          <h3>Opcjonalnie: pomoc AI ze zdjęcia</h3>
        </div>
        <div class="steps">
          <div class="step"><span class="step-number">1</span><div><strong>Dodaj zdj\u0119cie</strong><p class="muted">Jedno wyra\u017ane zdj\u0119cie produktu lub us\u0142ugi.</p></div></div>
          <div class="step"><span class="step-number">2</span><div><strong>Kliknij AI</strong><p class="muted">Uzupe\u0142ni tytu\u0142, kategori\u0119, opis i cechy.</p></div></div>
        </div>
        <div class="form-stack">
          <div class="field-group">
            <span>Zdj\u0119cie oferty</span>
            <input id="mobileListingImage" type="file" accept="image/*" capture="environment" class="file-input-native">
            <input id="mobileListingImageGallery" type="file" accept="image/*" class="file-input-native">
            <div class="file-upload-actions">
              <label for="mobileListingImage" class="file-upload-ui" id="mobileListingImageCameraTrigger">
                <span class="file-upload-trigger">📷 Zrób zdjęcie</span>
                <span class="file-upload-status">Aparat telefonu</span>
              </label>
              <label for="mobileListingImageGallery" class="file-upload-ui" id="mobileListingImageGalleryTrigger">
                <span class="file-upload-trigger">🖼️ Wybierz z galerii</span>
                <span class="file-upload-status" id="mobileImageFileStatus">Nie wybrano pliku</span>
              </label>
            </div>
          </div>
          <div class="image-preview hidden" id="mobileImagePreview">
            <div class="image-preview-thumb-wrap"><img id="mobileImagePreviewThumb" alt="Podgl\u0105d wybranego zdj\u0119cia"></div>
            <button class="image-preview-remove" id="mobileRemoveImageButton" type="button" data-action="remove-selected-image">Usu\u0144 zdj\u0119cie</button>
          </div>
          <button class="button button-ai" id="mobileGenerateButton" type="button">Uzupe\u0142nij og\u0142oszenie z AI</button>
          <div class="info-box-row">
            <article class="info-box"><h3>Co uzupe\u0142ni AI?</h3><p>Tytu\u0142, kategori\u0119, opis i najwa\u017cniejsze cechy.</p></article>
            <article class="info-box"><h3>Po AI</h3><p>Popraw szkic i uzupełnij tylko kraj, miasto, kontakt i cenę, jeśli trzeba.</p></article>
          </div>
          <p class="status" id="mobileAiStatus"></p>
        </div>
      </section>

      <form class="form-stack panel" id="mobileAddForm">
        <label class="field-group"><span>Tytu\u0142</span><input id="mobileTitle" type="text" placeholder="Np. Pok\u00f3j wynajm\u0119 od zaraz" required></label>
        <label class="field-group"><span>Kategoria</span><select id="mobileCategory" required><option value="">Wybierz kategorię</option>${CATEGORY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>
        <label class="field-group"><span>Cena</span><input id="mobilePrice" type="text" placeholder="Np. 850 SEK"></label>
        <label class="field-group"><span>Kraj</span><select id="mobileCountry" required><option value="">🌍 Wybierz kraj</option>${COUNTRY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(formatCountryLabel(option))}</option>`).join("")}</select></label>
        <label class="field-group"><span>Miasto</span><input id="mobileCity" type="text" placeholder="Np. Sztokholm" required></label>
        <label class="field-group"><span>Opis</span><textarea id="mobileDescription" placeholder="Opisz ofert\u0119 mo\u017cliwie konkretnie." required></textarea></label>
        <div class="section-heading"><h3>Dane kontaktowe</h3></div>
        <label class="field-group"><span>Imi\u0119 kontaktowe</span><input id="mobileContactName" type="text" placeholder="Np. Anna"></label>
        <label class="field-group"><span>Telefon</span><input id="mobilePhone" type="tel" placeholder="Np. +46 700 123 456"></label>
        <label class="field-group"><span>E-mail</span><input id="mobileEmail" type="email" placeholder="Np. anna@example.com"></label>
        <label class="field-inline-label"><input id="mobileShowPhone" type="checkbox"><span>Poka\u017c telefon w og\u0142oszeniu</span></label>
        <label class="field-inline-label"><input id="mobileShowEmail" type="checkbox"><span>Poka\u017c e-mail w og\u0142oszeniu</span></label>
        <button class="button button-primary" type="submit">Opublikuj og\u0142oszenie</button>
        <p class="status" id="mobileFormStatus"></p>
      </form>
    </section>
  `;

  const imageInput = document.getElementById("mobileListingImage");
  const imageGalleryInput = document.getElementById("mobileListingImageGallery");
  const imageCameraTrigger = document.getElementById("mobileListingImageCameraTrigger");
  const imageGalleryTrigger = document.getElementById("mobileListingImageGalleryTrigger");
  const imageStatus = document.getElementById("mobileImageFileStatus");
  const imagePreview = document.getElementById("mobileImagePreview");
  const imagePreviewThumb = document.getElementById("mobileImagePreviewThumb");
  const removeImageButton = document.getElementById("mobileRemoveImageButton");
  const aiButton = document.getElementById("mobileGenerateButton");
  const aiStatus = document.getElementById("mobileAiStatus");
  const formStatus = document.getElementById("mobileFormStatus");
  const form = document.getElementById("mobileAddForm");
  const countrySelect = document.getElementById("mobileCountry");
  const cityInput = document.getElementById("mobileCity");

  if (countrySelect && preferredCountry !== "all") {
    countrySelect.value = preferredCountry;
  }

  countrySelect?.addEventListener("change", () => {
    if (countrySelect.value) {
      setStoredCountryFilter(countrySelect.value);
    }
  });

  setupCityAutocomplete({
    input: cityInput,
    countrySelect,
  });

  let selectedImageFile = null;

  function getSelectedImageFile() {
    return selectedImageFile;
  }

  async function updateImagePreview(file) {
    if (!file) {
      selectedImageFile = null;
      clearInputImageFile(imageInput);
      clearInputImageFile(imageGalleryInput);
      imageStatus.textContent = "Nie wybrano pliku";
      imagePreview.classList.add("hidden");
      imagePreviewThumb.removeAttribute("src");
      return;
    }

    if (!file.type.startsWith("image/")) {
      selectedImageFile = null;
      clearInputImageFile(imageInput);
      clearInputImageFile(imageGalleryInput);
      imageStatus.textContent = "Nie wybrano pliku";
      imagePreview.classList.add("hidden");
      aiStatus.textContent = "Wybrany plik nie jest obrazem. Dodaj zdj\u0119cie produktu lub us\u0142ugi.";
      aiStatus.className = "status error";
      return;
    }

    imageStatus.textContent = file.name;
    imagePreviewThumb.src = await readImageAsDataUrl(file);
    imagePreview.classList.remove("hidden");
  }
  console.debug("[TwojBazar APP] image inputs", {
    imageInputFound: Boolean(imageInput),
    imageGalleryInputFound: Boolean(imageGalleryInput),
    imageCameraTriggerFound: Boolean(imageCameraTrigger),
    imageGalleryTriggerFound: Boolean(imageGalleryTrigger),
    imageStatusFound: Boolean(imageStatus),
    imagePreviewFound: Boolean(imagePreview),
  });

  async function handleImageSelection(activeInput, otherInput) {
    const selectedFile = getInputImageFile(activeInput);
    selectedImageFile = selectedFile;
    console.debug("[TwojBazar APP] handleImageSelection", { activeInputId: activeInput?.id || null, otherInputId: otherInput?.id || null, hasFile: Boolean(selectedFile), fileName: selectedFile?.name || null, fileSize: selectedFile?.size || 0, fileType: selectedFile?.type || null });

    if (otherInput) {
      clearInputImageFile(otherInput);
    }

    await updateImagePreview(selectedFile);
    aiStatus.textContent = "";
    aiStatus.className = "status";
  }

  imageCameraTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    console.debug("[TwojBazar APP] camera trigger click");
    imageInput?.click();
  });

  imageGalleryTrigger?.addEventListener("click", (event) => {
    event.preventDefault();
    console.debug("[TwojBazar APP] gallery trigger click");
    imageGalleryInput?.click();
  });

  imageInput?.addEventListener("change", async () => {
    const file = getInputImageFile(imageInput);
    console.debug("[TwojBazar APP] camera input change", { hasFile: Boolean(file), fileName: file?.name || null });
    await handleImageSelection(imageInput, imageGalleryInput);
  });

  imageGalleryInput?.addEventListener("change", async () => {
    const file = getInputImageFile(imageGalleryInput);
    console.debug("[TwojBazar APP] gallery input change", { hasFile: Boolean(file), fileName: file?.name || null });
    await handleImageSelection(imageGalleryInput, imageInput);
  });

  function handleRemoveImage(event) {
    event?.preventDefault();
    event?.stopPropagation();
    updateImagePreview(null);
    aiStatus.textContent = "";
    aiStatus.className = "status";
  }

  removeImageButton?.addEventListener("click", handleRemoveImage);

  form?.addEventListener("click", (event) => {
    const removeButton = event.target?.closest?.("[data-action='remove-selected-image'], #mobileRemoveImageButton");

    if (!removeButton) {
      return;
    }

    handleRemoveImage(event);
  });

  aiButton?.addEventListener("click", async () => {
    const selectedImage = getSelectedImageFile();
    console.debug("[TwojBazar APP] AI button selected file", {
      hasFile: Boolean(selectedImage),
      fileName: selectedImage?.name || null,
      fileSize: selectedImage?.size || 0,
      fileType: selectedImage?.type || null,
    });

    if (!selectedImage) {
      aiStatus.textContent = "Dodaj zdj\u0119cie, aby skorzysta\u0107 z AI.";
      aiStatus.className = "status error";
      return;
    }

    aiButton.disabled = true;
    aiButton.textContent = "Analizuj\u0119 zdj\u0119cie...";
    aiStatus.textContent = "Analizuj\u0119 zdj\u0119cie i przygotowuj\u0119 propozycj\u0119 tre\u015bci...";
    aiStatus.className = "status";

    try {
      const data = await generateListingFromImage(selectedImage);
      document.getElementById("mobileTitle").value = data.title || "";
      document.getElementById("mobileCategory").value = normalizeCategory(data.category || "");
      document.getElementById("mobileDescription").value = data.description || "";
      document.getElementById("mobileCountry")?.scrollIntoView({ behavior: "smooth", block: "center" });
      document.getElementById("mobileCountry")?.focus();
      aiStatus.textContent = "AI przygotowało szkic. Sprawdź dane i uzupełnij tylko kraj, miasto, kontakt oraz cenę, jeśli jest potrzebna.";
      aiStatus.className = "status success";
    } catch (error) {
      console.error("Mobile AI generation error:", error);
      aiStatus.textContent = error instanceof Error ? error.message : "Nie udało się wygenerować opisu ze zdjęcia.";
      aiStatus.className = "status error";
    } finally {
      aiButton.disabled = false;
      aiButton.textContent = "Uzupe\u0142nij og\u0142oszenie z AI";
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const selectedImage = getSelectedImageFile();
    console.debug("[TwojBazar APP] submit selected file", {
      hasFile: Boolean(selectedImage),
      fileName: selectedImage?.name || null,
      fileSize: selectedImage?.size || 0,
      fileType: selectedImage?.type || null,
    });
    const listing = {
      title: normalizeSpaces(document.getElementById("mobileTitle").value),
      category: normalizeCategory(document.getElementById("mobileCategory").value),
      price: parsePriceValue(document.getElementById("mobilePrice").value),
      currency: getCurrencyForCountry(document.getElementById("mobileCountry").value),
      country: document.getElementById("mobileCountry").value,
      city: normalizeSpaces(document.getElementById("mobileCity").value),
      description: normalizeDescription(document.getElementById("mobileDescription").value),
      contactName: normalizeSpaces(document.getElementById("mobileContactName").value),
      phone: normalizeSpaces(document.getElementById("mobilePhone").value),
      email: normalizeSpaces(document.getElementById("mobileEmail").value),
      showPhone: document.getElementById("mobileShowPhone").checked,
      showEmail: document.getElementById("mobileShowEmail").checked,
    };

    if (!listing.title || !listing.category || !listing.country || listing.city.length < 2 || listing.description.length < 20) {
      formStatus.textContent = "Uzupe\u0142nij poprawnie wymagane pola formularza.";
      formStatus.className = "status error";
      return;
    }

    try {
      setStoredCountryFilter(listing.country);

      const moderation = await moderateListingContent({
        title: listing.title,
        description: listing.description,
      });

      if (!moderation.allowed) {
        formStatus.textContent = "Og\u0142oszenie narusza zasady serwisu.";
        formStatus.className = "status error";
        return;
      }

      const createdListing = await createListing(listing, selectedImage);
      const managementToken = extractManagementToken(createdListing?.managementUrl);
      formStatus.textContent = `Ogłoszenie zostało zapisane. Otwieram prywatny link do zarządzania...${getEmailDeliveryMessage(createdListing)}`;
      formStatus.className = "status success";
      setTimeout(() => {
        navigate(managementToken ? `manage/${managementToken}` : "home");
      }, 500);
    } catch (error) {
      console.error("Mobile listing save error:", error);
      formStatus.textContent = error instanceof Error ? error.message : "Nie uda\u0142o si\u0119 zapisa\u0107 og\u0142oszenia. Spr\u00f3buj ponownie.";
      formStatus.className = "status error";
    }
  });


  if (quickAi) {
    requestAnimationFrame(() => {
      imageInput?.scrollIntoView({ behavior: "smooth", block: "start" });
      imageInput?.focus();
      aiStatus.textContent = "Dodaj zdjęcie lub zrób zdjęcie aparatem, a AI wypełni kategorię, tytuł, opis i najważniejsze cechy.";
      aiStatus.className = "status";
    });
  }
}

async function renderManageView(token) {
  if (!token) {
    appMain.innerHTML = `
      <section class="screen app-empty">
        <h2 class="detail-title">Brak linku zarządzania</h2>
        <p class="section-text">Otwórz poprawny prywatny link do zarządzania ogłoszeniem.</p>
      </section>
    `;
    return;
  }

  let listing;

  try {
    listing = await fetchManagedListing(token);
  } catch (error) {
    console.error("Mobile manage listing load error:", error);
    appMain.innerHTML = `
      <section class="screen app-empty">
        <h2 class="detail-title">Nie znaleziono linku zarządzania</h2>
        <p class="section-text">Ten prywatny link jest nieprawidłowy albo ogłoszenie zostało usunięte.</p>
      </section>
    `;
    return;
  }

  let pendingImage = getListingImage(listing);
  let pendingImageFile = null;
  let shouldClearImage = false;
  const managementLink = getAppRouteUrl(`manage/${encodeURIComponent(token)}`);
  const publicListingLink = `#listing/${encodeURIComponent(listing.id)}`;

  appMain.innerHTML = `
    <section class="screen add-card">
      <div class="section-heading">
        <h2 class="add-title">Zarządzaj ogłoszeniem</h2>
        <p class="section-text">Przez ten prywatny link możesz edytować ogłoszenie, usunąć je albo oznaczyć jako nieaktualne.</p>
      </div>

      <section class="panel">
        <div class="section-heading">
          <p class="section-eyebrow">Prywatny link</p>
          <h3>Zachowaj ten adres</h3>
          <p class="section-text">${escapeHtml(managementLink)}</p>
        </div>
        <div class="quick-actions">
            <button class="button button-secondary" id="mobileCopyManageLinkButton" type="button">Kopiuj link</button>
            <a class="button button-secondary ${listing.status === "active" ? "" : "hidden"}" href="${escapeHtml(publicListingLink)}">Zobacz ogłoszenie</a>
        </div>
      </section>

      <form class="form-stack panel" id="mobileManageForm">
        <label class="field-group"><span>Tytuł</span><input id="mobileManageTitle" type="text" value="${escapeHtml(listing.title || "")}" required></label>
        <label class="field-group"><span>Kategoria</span><select id="mobileManageCategory" required><option value="">Wybierz kategorię</option>${CATEGORY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${normalizeCategory(listing.category) === option ? "selected" : ""}>${escapeHtml(option)}</option>`).join("")}</select></label>
        <label class="field-group"><span>Cena</span><input id="mobileManagePrice" type="text" value="${escapeHtml(listing.price || "")}"></label>
        <label class="field-group"><span>Kraj</span><select id="mobileManageCountry" required><option value="">🌍 Wybierz kraj</option>${COUNTRY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}" ${listing.country === option ? "selected" : ""}>${escapeHtml(formatCountryLabel(option))}</option>`).join("")}</select></label>
        <label class="field-group"><span>Miasto</span><input id="mobileManageCity" type="text" value="${escapeHtml(listing.city || "")}" required></label>
        <label class="field-group"><span>Opis</span><textarea id="mobileManageDescription" required>${escapeHtml(listing.description || "")}</textarea></label>
        <label class="field-group"><span>Imię kontaktowe</span><input id="mobileManageContactName" type="text" value="${escapeHtml(listing.contactName || "")}"></label>
        <label class="field-group"><span>Telefon</span><input id="mobileManagePhone" type="tel" value="${escapeHtml(listing.phone || "")}"></label>
        <label class="field-group"><span>E-mail</span><input id="mobileManageEmail" type="email" value="${escapeHtml(listing.email || "")}"></label>
        <label class="field-inline-label"><input id="mobileManageShowPhone" type="checkbox" ${listing.showPhone ? "checked" : ""}><span>Pokaż telefon w ogłoszeniu</span></label>
        <label class="field-inline-label"><input id="mobileManageShowEmail" type="checkbox" ${listing.showEmail ? "checked" : ""}><span>Pokaż e-mail w ogłoszeniu</span></label>
        <div class="field-group">
          <span>Zdjęcie</span>
          <input id="mobileManageImage" type="file" accept="image/*" class="file-input-native">
          <label for="mobileManageImage" class="file-upload-ui">
            <span class="file-upload-trigger">Wybierz nowe zdjęcie</span>
            <span class="file-upload-status" id="mobileManageImageStatus">${pendingImage ? "Aktualne zdjęcie" : "Brak zdjęcia"}</span>
          </label>
        </div>
        <div class="image-preview ${pendingImage ? "" : "hidden"}" id="mobileManageImagePreview">
          <div class="image-preview-thumb-wrap"><img id="mobileManageImagePreviewThumb" alt="Podgląd zdjęcia" ${pendingImage ? `src="${pendingImage}"` : ""}></div>
          <button class="image-preview-remove" id="mobileManageRemoveImageButton" type="button">Usuń zdjęcie</button>
        </div>
        <div class="quick-actions">
          <button class="button button-primary" type="submit">Zapisz zmiany</button>
          <button class="button button-secondary" type="button" id="mobileToggleStatusButton">${listing.status === "deleted" ? "Przywróć ogłoszenie" : listing.status === "inactive" ? "Oznacz jako aktualne" : "Oznacz jako nieaktualne"}</button>
          <button class="button button-accent" type="button" id="mobileDeleteListingButton">Usuń ogłoszenie</button>
        </div>
        <p class="status" id="mobileManageStatus"></p>
      </form>
    </section>
  `;

  const form = document.getElementById("mobileManageForm");
  const statusElement = document.getElementById("mobileManageStatus");
  const imageInput = document.getElementById("mobileManageImage");
  const imagePreview = document.getElementById("mobileManageImagePreview");
  const imagePreviewThumb = document.getElementById("mobileManageImagePreviewThumb");
  const imageStatus = document.getElementById("mobileManageImageStatus");
  const removeImageButton = document.getElementById("mobileManageRemoveImageButton");
  const toggleStatusButton = document.getElementById("mobileToggleStatusButton");
  const deleteButton = document.getElementById("mobileDeleteListingButton");
  const copyLinkButton = document.getElementById("mobileCopyManageLinkButton");
  const manageCountrySelect = document.getElementById("mobileManageCountry");
  const manageCityInput = document.getElementById("mobileManageCity");

  setupCityAutocomplete({
    input: manageCityInput,
    countrySelect: manageCountrySelect,
  });

  copyLinkButton?.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(managementLink);
      statusElement.textContent = "Prywatny link został skopiowany.";
      statusElement.className = "status success";
    } catch (error) {
      console.error("Mobile copy manage link error:", error);
      statusElement.textContent = "Nie udało się skopiować linku.";
      statusElement.className = "status error";
    }
  });

  imageInput?.addEventListener("change", async () => {
    const file = getInputImageFile(imageInput);
    if (!file) {
      return;
    }

    pendingImageFile = file;
    shouldClearImage = false;
    pendingImage = URL.createObjectURL(file);
    imagePreviewThumb.src = pendingImage;
    imagePreview.classList.remove("hidden");
    imageStatus.textContent = file.name;
  });

  removeImageButton?.addEventListener("click", () => {
    pendingImage = "";
    pendingImageFile = null;
    shouldClearImage = true;
    clearInputImageFile(imageInput);
    imagePreview.classList.add("hidden");
    imagePreviewThumb.removeAttribute("src");
    imageStatus.textContent = "Brak zdjęcia";
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const payload = {
      title: normalizeSpaces(document.getElementById("mobileManageTitle").value),
      category: normalizeCategory(document.getElementById("mobileManageCategory").value),
      price: parsePriceValue(document.getElementById("mobileManagePrice").value),
      currency: getCurrencyForCountry(document.getElementById("mobileManageCountry").value),
      country: document.getElementById("mobileManageCountry").value,
      city: normalizeSpaces(document.getElementById("mobileManageCity").value),
      description: normalizeDescription(document.getElementById("mobileManageDescription").value),
      contactName: normalizeSpaces(document.getElementById("mobileManageContactName").value),
      phone: normalizeSpaces(document.getElementById("mobileManagePhone").value),
      email: normalizeSpaces(document.getElementById("mobileManageEmail").value),
      showPhone: document.getElementById("mobileManageShowPhone").checked,
      showEmail: document.getElementById("mobileManageShowEmail").checked,
      imageFile: pendingImageFile,
      clearImage: shouldClearImage,
    };

    try {
      listing = await updateManagedListing(token, payload);
      statusElement.textContent = "Zmiany zostały zapisane.";
      statusElement.className = "status success";
      toggleStatusButton.textContent = listing.status === "deleted" ? "Przywróć ogłoszenie" : listing.status === "inactive" ? "Oznacz jako aktualne" : "Oznacz jako nieaktualne";
    } catch (error) {
      console.error("Mobile manage listing save error:", error);
      statusElement.textContent = error.message || "Nie udało się zapisać zmian.";
      statusElement.className = "status error";
    }
  });

  toggleStatusButton?.addEventListener("click", async () => {
    try {
      const nextStatus =
        listing.status === "deleted"
          ? "active"
          : listing.status === "inactive"
            ? "active"
            : "inactive";
      listing = await updateManagedListingStatus(token, nextStatus);
      toggleStatusButton.textContent = listing.status === "deleted" ? "Przywróć ogłoszenie" : listing.status === "inactive" ? "Oznacz jako aktualne" : "Oznacz jako nieaktualne";
      statusElement.textContent = listing.status === "inactive" ? "Ogłoszenie oznaczono jako nieaktualne." : "Ogłoszenie ponownie oznaczono jako aktualne.";
      statusElement.className = "status success";
    } catch (error) {
      console.error("Mobile manage listing status error:", error);
      statusElement.textContent = error.message || "Nie udało się zmienić statusu.";
      statusElement.className = "status error";
    }
  });

  deleteButton?.addEventListener("click", async () => {
    if (!window.confirm("Usunąć to ogłoszenie?")) {
      return;
    }

    try {
      listing = await deleteManagedListing(token);
      toggleStatusButton.textContent = "Przywróć ogłoszenie";
      statusElement.textContent = "Ogłoszenie zostało usunięte.";
      statusElement.className = "status success";
    } catch (error) {
      console.error("Mobile manage listing delete error:", error);
      statusElement.textContent = error.message || "Nie udało się usunąć ogłoszenia.";
      statusElement.className = "status error";
    }
  });

}

async function renderRoute() {
  const currentRenderId = ++routeRenderId;
  const route = getRoute();
  setTopbar(route);

  if (route.name === "home") {
    await citiesDatabaseReady;
    if (currentRenderId !== routeRenderId || getRoute().name !== "home") {
      return;
    }

    const quickListings = listingsCache.length ? [...listingsCache] : mergeListings([...readCachedListings(), ...DEMO_LISTINGS]);
    renderHomeView(quickListings, "", getStoredCountryFilter());

    if (route.scrollToListings) {
      requestAnimationFrame(() => document.getElementById("listings")?.scrollIntoView({ block: "start" }));
    }

    const listings = await fetchListings();
    if (currentRenderId !== routeRenderId || getRoute().name !== "home") {
      return;
    }

    renderHomeView(listings, "", getStoredCountryFilter());
    if (route.scrollToListings) {
      requestAnimationFrame(() => document.getElementById("listings")?.scrollIntoView({ block: "start" }));
    }
    return;
  }
  if (route.name === "listing") {
    const listing = await fetchListingById(route.id);
    if (currentRenderId !== routeRenderId || getRoute().name !== "listing") {
      return;
    }

    renderDetailView(listing);
    return;
  }
  if (route.name === "help") {
    renderHelpView();
    return;
  }
  if (route.name === "manage") {
    await renderManageView(route.token);
    if (currentRenderId !== routeRenderId || getRoute().name !== "manage") {
      return;
    }

    return;
  }
  if (route.name === "add") {
    renderAddView(Boolean(route.quickAi));
    return;
  }

  const listings = listingsCache.length ? [...listingsCache] : await fetchListings();
  if (currentRenderId !== routeRenderId) {
    return;
  }

  renderHomeView(listings, "", getStoredCountryFilter());
}
backButton.addEventListener("click", () => {
  const route = getRoute();
  const backRoute = getBackRoute(route);
  if (backRoute !== route.name) {
    navigate(backRoute);
  }
});

topbarAction.addEventListener("click", () => {
  navigate("add");
});

bottomNavLinks.forEach((link) => {
  link.addEventListener("click", (event) => {
    event.preventDefault();
    navigate(link.dataset.route || "home");
  });
});

window.addEventListener("hashchange", renderRoute);

if (!window.location.hash) {
  navigate("home");
} else {
  renderRoute();
}


































