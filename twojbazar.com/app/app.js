const API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_ENDPOINT = `${API_BASE_URL}/api/listings`;
const AI_GENERATE_ENDPOINT = `${API_BASE_URL}/api/generate-description`;
const MODERATION_ENDPOINT = `${API_BASE_URL}/api/moderate-listing`;
const PROFILE_STORAGE_KEY = "twojbazar-mobile-profile";
const COUNTRY_FILTER_STORAGE_KEY = "twojbazar-mobile-country-filter";

const appMain = document.getElementById("appMain");
const topbarTitle = document.getElementById("topbarTitle");
const topbarKicker = document.getElementById("topbarKicker");
const topbarAction = document.getElementById("topbarAction");
const backButton = document.getElementById("backButton");
const bottomNavLinks = [...document.querySelectorAll(".bottom-nav-link")];

const CATEGORY_OPTIONS = [
  "Praca dam",
  "Praca szukam",
  "Pok\u00f3j wynajm\u0119",
  "Pok\u00f3j szukam",
  "Mieszkanie wynajm\u0119",
  "Mieszkanie szukam",
  "Transport",
  "Us\u0142ugi oferuj\u0119",
  "Us\u0142ugi szukam",
  "Sprzedam",
  "Kupi\u0119",
  "Oddam",
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

const DEMO_LISTINGS = [
  { id: "demo-1", title: "Praca dam magazyn G\u00f6teborg", category: "Praca dam", price: "145", currency: "SEK", country: "Szwecja", city: "G\u00f6teborg", description: "Praca od zaraz w polskim zespole, zmiana dzienna i pomoc we wdro\u017ceniu.", createdAt: "2026-04-01T09:00:00.000Z" },
  { id: "demo-2", title: "Pok\u00f3j wynajm\u0119 Sztokholm", category: "Pok\u00f3j wynajm\u0119", price: "5 200", currency: "SEK", country: "Szwecja", city: "Sztokholm", description: "Pok\u00f3j dla jednej osoby, dobra komunikacja i blisko polskiego sklepu.", createdAt: "2026-04-01T11:00:00.000Z" },
  { id: "demo-3", title: "Us\u0142ugi oferuj\u0119 remonty Bergen", category: "Us\u0142ugi oferuj\u0119", price: "Od 400 NOK", currency: "NOK", country: "Norwegia", city: "Bergen", description: "Polska ekipa, szybkie terminy, mieszkania i ma\u0142e lokale u\u017cytkowe.", createdAt: "2026-04-01T15:00:00.000Z" },
  { id: "demo-4", title: "Pomoc / formalno\u015bci Uppsala", category: "Pomoc / formalno\u015bci", price: "Konsultacja", currency: "SEK", country: "Szwecja", city: "Uppsala", description: "Wsparcie po polsku w dokumentach, urz\u0119dach i podstawowych formalno\u015bciach.", createdAt: "2026-04-01T22:00:00.000Z" },
  { id: "demo-5", title: "Poznam ludzi w Oslo", category: "Poznam ludzi", price: "Spo\u0142eczno\u015b\u0107", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Szukam kontaktu z Polakami do rozm\u00f3w, spacer\u00f3w i wsp\u00f3lnego poznawania miasta.", createdAt: "2026-04-01T23:00:00.000Z" },
];

let listingsCache = [];
const HOME_CATEGORY_SHORTCUTS = [
  { label: "Praca", value: "Praca", hint: "Oferty i osoby szukaj\u0105ce pracy" },
  { label: "Mieszkania", value: "Mieszkanie", hint: "Pokoje i mieszkania do wynaj\u0119cia" },
  { label: "Us\u0142ugi", value: "Us\u0142ugi", hint: "Pomoc, remonty, wsparcie na miejscu" },
  { label: "Transport", value: "Transport", hint: "Przejazdy, przewozy i pomoc w trasie" },
];

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

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeSpaces(country)] || "EUR";
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

function getRoute() {
  const hash = window.location.hash.replace(/^#/, "");

  if (!hash || hash === "home") {
    return { name: "home" };
  }
  if (hash === "add") {
    return { name: "add" };
  }
  if (hash === "account") {
    return { name: "account" };
  }
  if (hash === "login") {
    return { name: "login" };
  }
  if (hash.startsWith("listing/")) {
    return { name: "listing", id: hash.split("/")[1] || "" };
  }

  return { name: "home" };
}

function setTopbar(route) {
  topbarTitle.textContent = "Twoj Bazar";
  backButton.classList.toggle("hidden", route.name === "home");
  topbarAction.textContent = route.name === "account" && getStoredProfile() ? "Wyloguj" : "Konto";
  topbarAction.setAttribute(
    "aria-label",
    route.name === "account" && getStoredProfile() ? "Wyloguj" : "Przejdź do konta"
  );

  bottomNavLinks.forEach((link) => {
    link.classList.toggle("active", link.dataset.route === (["home", "add", "account"].includes(route.name) ? route.name : ""));
  });
}

async function fetchListings() {
  try {
    const response = await fetch(LISTINGS_ENDPOINT);
    if (!response.ok) {
      throw new Error(`B\u0142\u0105d pobierania og\u0142osze\u0144: ${response.status}`);
    }

    const data = await response.json();
    listingsCache = Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("Mobile listings fetch error:", error);
    listingsCache = [];
  }

  return [...listingsCache, ...DEMO_LISTINGS].sort((a, b) => {
    return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
  });
}

async function fetchListingById(id) {
  const allListings = await fetchListings();
  return allListings.find((listing) => String(listing.id) === String(id)) || null;
}

async function createListing(listing) {
  const response = await fetch(LISTINGS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(listing),
  });

  if (!response.ok) {
    throw new Error(`B\u0142\u0105d zapisu og\u0142oszenia: ${response.status}`);
  }

  return response.json();
}

async function moderateListingContent(payload) {
  const response = await fetch(MODERATION_ENDPOINT, {
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
  const formData = new FormData();
  formData.append("image", file);

  const response = await fetch(AI_GENERATE_ENDPOINT, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`B\u0142\u0105d AI: ${response.status}`);
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

function getStoredProfile() {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.error("Profile storage error:", error);
    return null;
  }
}

function getStoredCountryFilter() {
  try {
    const value = localStorage.getItem(COUNTRY_FILTER_STORAGE_KEY);
    return value && (value === "all" || COUNTRY_OPTIONS.includes(value)) ? value : "all";
  } catch (error) {
    console.error("Country filter storage error:", error);
    return "all";
  }
}

function setStoredCountryFilter(country) {
  const value = country === "all" || COUNTRY_OPTIONS.includes(country) ? country : "all";
  localStorage.setItem(COUNTRY_FILTER_STORAGE_KEY, value);
}

function setStoredProfile(profile) {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
}

function clearStoredProfile() {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}

function navigate(hash) {
  window.location.hash = hash;
}

function getListingImage(listing) {
  return Array.isArray(listing.images) && listing.images.length ? listing.images[0] : listing.image || "";
}

function renderHomeView(listings, query = "", country = "all", category = "all") {
  const normalizedQuery = normalizeText(query);
  const normalizedCountry = normalizeText(country);
  const normalizedCategory = normalizeText(category);

  const filtered = listings.filter((listing) => {
    const haystack = [listing.title, listing.category, listing.country, listing.city, listing.description].map(normalizeText);
    const matchesQuery = !normalizedQuery || haystack.some((entry) => entry.includes(normalizedQuery));
    const matchesCountry = normalizedCountry === "all" || normalizeText(listing.country) === normalizedCountry;
    const matchesCategory = normalizedCategory === "all" || normalizeText(listing.category).includes(normalizedCategory);
    return matchesQuery && matchesCountry && matchesCategory;
  });

  appMain.innerHTML = `
    <section class="screen hero-card">
      <p class="hero-kicker">Portal Polonii za granic\u0105</p>
      <h2 class="hero-title">Og\u0142oszenia dla Polak\u00f3w w Skandynawii</h2>
      <p class="hero-text">Praca, pokoje, mieszkania, transport i pomoc w Szwecji, Norwegii i Danii.</p>
      <div class="hero-actions">
        <a class="button button-accent" href="#add">Dodaj og\u0142oszenie</a>
        <a class="button button-secondary" href="#account">Twoje konto</a>
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
    </section>

    <section class="screen search-card">
      <div class="section-heading">
        <p class="section-eyebrow">Start</p>
        <h2>Szukaj og\u0142osze\u0144</h2>
        <p class="section-text">Filtruj po kraju lub wpisz, czego potrzebujesz.</p>
      </div>
      <div class="search-row">
        <label class="search-input-wrap" for="homeSearchInput">
          <input id="homeSearchInput" type="search" placeholder="Praca, pok\u00f3j, transport, formalno\u015bci..." value="${escapeHtml(query)}">
        </label>
        <div class="chip-row">
          <button class="nav-pill ${country === "all" ? "active" : ""}" type="button" data-country="all">Wszystkie</button>
          ${COUNTRY_OPTIONS.map((item) => `
            <button class="nav-pill ${normalizeText(item) === normalizedCountry ? "active" : ""}" type="button" data-country="${escapeHtml(item)}">${escapeHtml(item)}</button>
          `).join("")}
        </div>
      </div>
    </section>

    <section class="screen">
      <div class="section-heading">
        <p class="section-eyebrow">Szybkie skr\u00f3ty</p>
        <h2>Najcz\u0119stsze kategorie</h2>
        <p class="section-text">Jednym klikni\u0119ciem zaw\u0119zisz wyniki do najwa\u017cniejszych spraw za granic\u0105.</p>
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
                  ? `<img src="${getListingImage(listing)}" alt="${escapeHtml(listing.title || "Zdj\u0119cie oferty")}">`
                  : `<div class="listing-thumb-fallback">Brak zdj\u0119cia</div>`}
              </div>
              <div class="listing-copy">
                <span class="listing-category">${escapeHtml(listing.category || "Og\u0142oszenie")}</span>
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
    renderHomeView(listings, event.target.value, country, category);
  });

  appMain.querySelectorAll("[data-country]").forEach((button) => {
    button.addEventListener("click", () => {
      const nextCountry = button.dataset.country || "all";
      setStoredCountryFilter(nextCountry);
      renderHomeView(listings, query, nextCountry, category);
    });
  });

  appMain.querySelectorAll("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      renderHomeView(listings, query, country, button.dataset.category || "all");
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

  const image = Array.isArray(listing.images) && listing.images.length ? listing.images[0] : listing.image;
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
          ${image ? `<img src="${image}" alt="${escapeHtml(listing.title || "Zdj\u0119cie oferty")}">` : `<div class="detail-placeholder">Brak zdj\u0119cia</div>`}
        </div>
      </div>

      <div class="section-heading">
        <span class="listing-category">${escapeHtml(listing.category || "Og\u0142oszenie")}</span>
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
}

function renderLoginView() {
  appMain.innerHTML = `
    <section class="screen login-card">
      <div class="section-heading">
        <h2 class="login-title">Zaloguj si\u0119</h2>
        <p class="section-text">Mobilny widok konta jest gotowy pod przysz\u0142e pod\u0142\u0105czenie do systemu logowania.</p>
      </div>
      <form class="form-stack" id="mobileLoginForm">
        <label class="field-group">
          <span>E-mail</span>
          <input type="email" id="loginEmail" placeholder="Np. anna@example.com" required>
        </label>
        <label class="field-group">
          <span>Has\u0142o</span>
          <input type="password" id="loginPassword" placeholder="Wpisz has\u0142o" required>
        </label>
        <button class="button button-primary" type="submit">Zaloguj si\u0119</button>
        <p class="status" id="loginStatus"></p>
      </form>
    </section>
  `;

  document.getElementById("mobileLoginForm")?.addEventListener("submit", (event) => {
    event.preventDefault();
    const email = document.getElementById("loginEmail")?.value.trim() || "";
    const status = document.getElementById("loginStatus");

    if (!email) {
      status.textContent = "Podaj adres e-mail.";
      status.className = "status error";
      return;
    }

    setStoredProfile({
      email,
      name: email.split("@")[0] || "U\u017cytkownik",
    });

    navigate("account");
  });
}

function renderAccountView() {
  const profile = getStoredProfile();

  if (!profile) {
    appMain.innerHTML = `
      <section class="screen account-card">
        <div class="section-heading">
          <h2 class="account-title">Twoje konto</h2>
          <p class="section-text">Zaloguj si\u0119, aby przygotowa\u0107 profil pod przysz\u0142\u0105 wersj\u0119 aplikacji.</p>
        </div>
        <div class="hero-stat">
          <strong>Profil mobilny</strong>
          <span class="muted">Widok konta jest gotowy do dalszej integracji z backendem logowania.</span>
        </div>
        <button class="button button-primary" id="goToLoginButton" type="button">Przejd\u017a do logowania</button>
      </section>
    `;

    document.getElementById("goToLoginButton")?.addEventListener("click", () => navigate("login"));
    return;
  }

  appMain.innerHTML = `
    <section class="screen account-card">
      <div class="section-heading">
        <h2 class="account-title">Tw\u00f3j profil</h2>
        <p class="section-text">Mobilny widok konta jest uproszczony i gotowy pod integracj\u0119 z pe\u0142nym systemem u\u017cytkownika.</p>
      </div>
      <div class="hero-stat">
        <strong>${escapeHtml(profile.name || "U\u017cytkownik")}</strong>
        <span>${escapeHtml(profile.email || "")}</span>
      </div>
      <div class="quick-actions">
        <a class="button button-secondary" href="#add">Dodaj nowe og\u0142oszenie</a>
        <button class="button button-accent" id="logoutButton" type="button">Wyloguj</button>
      </div>
    </section>
  `;

  document.getElementById("logoutButton")?.addEventListener("click", () => {
    clearStoredProfile();
    navigate("account");
  });
}

function renderAddView() {
  const preferredCountry = getStoredCountryFilter();

  appMain.innerHTML = `
    <section class="screen add-card">
      <div class="section-heading">
        <h2 class="add-title">Dodaj og\u0142oszenie</h2>
        <p class="section-text">Dodaj ofert\u0119 dla Polak\u00f3w w Skandynawii. Kraj z filtra ustawimy automatycznie.</p>
      </div>

      <section class="panel">
        <div class="section-heading">
          <p class="hero-kicker">Asystent AI</p>
          <h3>Dodaj zdj\u0119cie i uzupe\u0142nij og\u0142oszenie</h3>
        </div>
        <div class="steps">
          <div class="step"><span class="step-number">1</span><div><strong>Dodaj zdj\u0119cie</strong><p class="muted">Jedno wyra\u017ane zdj\u0119cie produktu lub us\u0142ugi.</p></div></div>
          <div class="step"><span class="step-number">2</span><div><strong>Kliknij AI</strong><p class="muted">Uzupe\u0142ni tytu\u0142, kategori\u0119, opis i cechy.</p></div></div>
        </div>
        <div class="form-stack">
          <div class="field-group">
            <span>Zdj\u0119cie oferty</span>
            <input id="mobileListingImage" type="file" accept="image/*" class="file-input-native">
            <label for="mobileListingImage" class="file-upload-ui">
              <span class="file-upload-trigger">Wybierz zdj\u0119cie</span>
              <span class="file-upload-status" id="mobileImageFileStatus">Nie wybrano pliku</span>
            </label>
          </div>
          <div class="image-preview hidden" id="mobileImagePreview">
            <div class="image-preview-thumb-wrap"><img id="mobileImagePreviewThumb" alt="Podgl\u0105d wybranego zdj\u0119cia"></div>
            <button class="image-preview-remove" id="mobileRemoveImageButton" type="button">Usu\u0144 zdj\u0119cie</button>
          </div>
          <button class="button button-ai" id="mobileGenerateButton" type="button">Uzupe\u0142nij og\u0142oszenie z AI</button>
          <div class="info-box-row">
            <article class="info-box"><h3>Co uzupe\u0142ni AI?</h3><p>Tytu\u0142, kategori\u0119, opis i najwa\u017cniejsze cechy.</p></article>
            <article class="info-box"><h3>Wskaz\u00f3wka</h3><p>Najlepsze efekty daj\u0105 jasne i czytelne zdj\u0119cia.</p></article>
          </div>
          <p class="status" id="mobileAiStatus"></p>
        </div>
      </section>

      <form class="form-stack panel" id="mobileAddForm">
        <label class="field-group"><span>Tytu\u0142</span><input id="mobileTitle" type="text" placeholder="Np. Pok\u00f3j wynajm\u0119 od zaraz" required></label>
        <label class="field-group"><span>Kategoria</span><select id="mobileCategory" required><option value="">Wybierz kategori\u0119</option>${CATEGORY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>
        <label class="field-group"><span>Cena</span><input id="mobilePrice" type="text" placeholder="Np. 850 SEK"></label>
        <label class="field-group"><span>Kraj</span><select id="mobileCountry" required><option value="">Wybierz kraj</option>${COUNTRY_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join("")}</select></label>
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
  const imageStatus = document.getElementById("mobileImageFileStatus");
  const imagePreview = document.getElementById("mobileImagePreview");
  const imagePreviewThumb = document.getElementById("mobileImagePreviewThumb");
  const removeImageButton = document.getElementById("mobileRemoveImageButton");
  const aiButton = document.getElementById("mobileGenerateButton");
  const aiStatus = document.getElementById("mobileAiStatus");
  const formStatus = document.getElementById("mobileFormStatus");
  const form = document.getElementById("mobileAddForm");
  const countrySelect = document.getElementById("mobileCountry");

  if (countrySelect && preferredCountry !== "all") {
    countrySelect.value = preferredCountry;
  }

  countrySelect?.addEventListener("change", () => {
    if (countrySelect.value) {
      setStoredCountryFilter(countrySelect.value);
    }
  });

  async function updateImagePreview(file) {
    if (!file) {
      imageInput.value = "";
      imageStatus.textContent = "Nie wybrano pliku";
      imagePreview.classList.add("hidden");
      imagePreviewThumb.removeAttribute("src");
      return;
    }

    if (!file.type.startsWith("image/")) {
      imageInput.value = "";
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

  imageInput?.addEventListener("change", async () => {
    await updateImagePreview(imageInput.files[0]);
    aiStatus.textContent = "";
    aiStatus.className = "status";
  });

  removeImageButton?.addEventListener("click", () => {
    updateImagePreview(null);
    aiStatus.textContent = "";
    aiStatus.className = "status";
  });

  aiButton?.addEventListener("click", async () => {
    if (!imageInput?.files?.length) {
      aiStatus.textContent = "Dodaj zdj\u0119cie, aby skorzysta\u0107 z AI.";
      aiStatus.className = "status error";
      return;
    }

    aiButton.disabled = true;
    aiButton.textContent = "Analizuj\u0119 zdj\u0119cie...";
    aiStatus.textContent = "Analizuj\u0119 zdj\u0119cie i przygotowuj\u0119 propozycj\u0119 tre\u015bci...";
    aiStatus.className = "status";

    try {
      const data = await generateListingFromImage(imageInput.files[0]);
      document.getElementById("mobileTitle").value = data.title || "";
      document.getElementById("mobileCategory").value = data.category || "";
      document.getElementById("mobileDescription").value = data.description || "";
      aiStatus.textContent = "AI uzupe\u0142ni\u0142o formularz. Sprawd\u017a wynik i dopracuj tre\u015b\u0107.";
      aiStatus.className = "status success";
    } catch (error) {
      console.error("Mobile AI generation error:", error);
      aiStatus.textContent = "Nie uda\u0142o si\u0119 wygenerowa\u0107 opisu ze zdj\u0119cia. Sprawd\u017a po\u0142\u0105czenie z backendem i spr\u00f3buj ponownie.";
      aiStatus.className = "status error";
    } finally {
      aiButton.disabled = false;
      aiButton.textContent = "Uzupe\u0142nij og\u0142oszenie z AI";
    }
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();

    const listing = {
      title: normalizeSpaces(document.getElementById("mobileTitle").value),
      category: document.getElementById("mobileCategory").value,
      price: normalizeSpaces(document.getElementById("mobilePrice").value),
      currency: getCurrencyForCountry(document.getElementById("mobileCountry").value),
      country: document.getElementById("mobileCountry").value,
      city: normalizeSpaces(document.getElementById("mobileCity").value),
      description: normalizeDescription(document.getElementById("mobileDescription").value),
      contactName: normalizeSpaces(document.getElementById("mobileContactName").value),
      phone: normalizeSpaces(document.getElementById("mobilePhone").value),
      email: normalizeSpaces(document.getElementById("mobileEmail").value),
      showPhone: document.getElementById("mobileShowPhone").checked,
      showEmail: document.getElementById("mobileShowEmail").checked,
      image: await readImageAsDataUrl(imageInput.files[0]),
    };

    listing.images = listing.image ? [listing.image] : [];

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

      await createListing(listing);
      formStatus.textContent = "Og\u0142oszenie zosta\u0142o zapisane. Wracam do listy og\u0142osze\u0144...";
      formStatus.className = "status success";
      setTimeout(() => navigate("home"), 500);
    } catch (error) {
      console.error("Mobile listing save error:", error);
      formStatus.textContent = "Nie uda\u0142o si\u0119 zapisa\u0107 og\u0142oszenia. Spr\u00f3buj ponownie.";
      formStatus.className = "status error";
    }
  });
}

async function renderRoute() {
  const route = getRoute();
  setTopbar(route);

  if (route.name === "home") {
    const listings = await fetchListings();
    renderHomeView(listings, "", getStoredCountryFilter());
    return;
  }
  if (route.name === "listing") {
    const listing = await fetchListingById(route.id);
    renderDetailView(listing);
    return;
  }
  if (route.name === "add") {
    renderAddView();
    return;
  }
  if (route.name === "login") {
    renderLoginView();
    return;
  }

  renderAccountView();
}

backButton.addEventListener("click", () => {
  if (window.location.hash && window.location.hash !== "#home") {
    history.length > 1 ? history.back() : navigate("home");
  }
});

topbarAction.addEventListener("click", () => {
  const route = getRoute();
  if (route.name === "account" && getStoredProfile()) {
    clearStoredProfile();
    renderRoute();
    return;
  }
  navigate("account");
});

window.addEventListener("hashchange", renderRoute);

if (!window.location.hash) {
  navigate("home");
} else {
  renderRoute();
}
