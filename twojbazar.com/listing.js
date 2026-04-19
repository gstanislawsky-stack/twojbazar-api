const LISTINGS_JSON_URL = "listings.json";
const RENDER_API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_API_PATH = "/api/listings";
const LISTINGS_CACHE_KEY = "twojbazar-listing-details-cache";
const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");
const titleElement = document.getElementById("listingTitle");
const introElement = document.getElementById("listingIntro");
const metaElement = document.getElementById("listingMeta");
const priceElement = document.getElementById("listingPrice");
const descriptionElement = document.getElementById("listingDescription");
const contactElement = document.getElementById("listingContact");
const contactPanel = document.getElementById("listingContactPanel");
const galleryElement = document.getElementById("listingGallery");
const imageElement = document.getElementById("listingImage");
const imagePlaceholderElement = document.getElementById("listingImagePlaceholder");
const galleryThumbsElement = document.getElementById("listingGalleryThumbs");
const metaDescriptionElement = document.querySelector('meta[name="description"]');
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
  dania: "DKK",
  norwegia: "NOK",
};

function getApiCandidates(path) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const candidates = [];

  if (window.location.protocol.startsWith("http")) {
    candidates.push(normalizedPath);
  }

  candidates.push(`${RENDER_API_BASE_URL}${normalizedPath}`);
  return [...new Set(candidates)];
}if (menuToggle && navLinks && navActions) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navActions.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  [...navLinks.querySelectorAll("a"), ...navActions.querySelectorAll("a")].forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navActions.classList.remove("open");
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

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeText(country)] || "EUR";
}

function normalizeCategory(value) {
  const rawCategory = String(value || "").trim();

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

function isPublicListing(listing) {
  return normalizeStatus(listing?.status) === "active";
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

function truncateText(value, maxLength = 160) {
  const normalized = String(value || "").replace(/\s+/g, " ").trim();

  if (!normalized) {
    return "";
  }

  if (normalized.length <= maxLength) {
    return normalized;
  }

  return `${normalized.slice(0, maxLength - 1).trimEnd()}…`;
}

function updateSeoMetadata(listing) {
  if (!listing) {
    document.title = "Ogłoszenie nie znalezione | TwojBazar";

    if (metaDescriptionElement) {
      metaDescriptionElement.setAttribute(
        "content",
        "Nie znaleziono ogloszenia w TwojBazar. Sprawdz aktualne ogloszenia dla Polaków w Szwecji, Norwegii i Danii."
      );
    }

    return;
  }

  const category = normalizeCategory(listing.category);
  const location = [listing.city, listing.country].filter(Boolean).join(", ");
  const titleParts = [listing.title, category, location].filter(Boolean);
  const descriptionParts = [
    listing.title,
    category,
    location,
    listing.description || "Sprawdz szczególy ogloszenia i dane kontaktowe w TwojBazar.",
  ].filter(Boolean);

  document.title = `${titleParts.join(" | ")} | TwojBazar`;

  if (metaDescriptionElement) {
    metaDescriptionElement.setAttribute("content", truncateText(descriptionParts.join(". ")));
  }
}

function readCachedListing(id) {
  try {
    const raw = sessionStorage.getItem(LISTINGS_CACHE_KEY);
    const listings = raw ? JSON.parse(raw) : [];

    if (!Array.isArray(listings)) {
      return null;
    }

    return listings.find((listing) => String(listing.id) === String(id) && isPublicListing(listing)) || null;
  } catch (error) {
    console.error("Listing details cache read error:", error);
    return null;
  }
}

function writeCachedListing(listing) {
  try {
    if (!listing?.id) {
      return;
    }

    const raw = sessionStorage.getItem(LISTINGS_CACHE_KEY);
    const listings = raw ? JSON.parse(raw) : [];
    const nextListings = Array.isArray(listings)
      ? listings.filter((item) => String(item.id) !== String(listing.id))
      : [];

    nextListings.push(listing);
    sessionStorage.setItem(LISTINGS_CACHE_KEY, JSON.stringify(nextListings));
  } catch (error) {
    console.error("Listing details cache write error:", error);
  }
}

async function fetchListingById(id) {
  const cachedListing = readCachedListing(id);

  if (cachedListing) {
    return cachedListing;
  }

  const sources = [];

  try {
    const response = await fetch(LISTINGS_JSON_URL, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Błąd pobierania listings.json: ${response.status}`);
    }

    const listings = await response.json();
    if (Array.isArray(listings)) {
      sources.push(...listings);
    }
  } catch (error) {
    console.error("Listing details JSON read error:", error);
  }

  for (const url of getApiCandidates(LISTINGS_API_PATH)) {
    try {
      const response = await fetch(url, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Błąd pobierania ogłoszeń z API: ${response.status}`);
      }

      const listings = await response.json();
      if (Array.isArray(listings)) {
        sources.push(...listings);
        break;
      }
    } catch (error) {
      console.error("Listing details API read error:", {
        url,
        error,
      });
    }
  }
  const listing = sources.find((item) => String(item?.id) === String(id) && isPublicListing(item));

  if (!listing) {
    return null;
  }

  const normalizedListing = {
    ...listing,
    category: normalizeCategory(listing.category),
  };

  writeCachedListing(normalizedListing);
  return normalizedListing;
}

function getListingImages(listing) {
  if (Array.isArray(listing.images) && listing.images.length) {
    return listing.images.filter(Boolean);
  }

  if (listing.image) {
    return [listing.image];
  }

  return [];
}

function renderNotFound() {
  updateSeoMetadata(null);
  titleElement.textContent = "Ogłoszenie nie znalezione";
  introElement.textContent = "Sprawdz link albo wróc do listy ogloszen.";
  metaElement.innerHTML = "";
  priceElement.textContent = "";
  descriptionElement.textContent = "Ogłoszenie nie znalezione";
  contactPanel.classList.add("hidden");
  galleryElement.classList.add("hidden");
}

function renderContact(listing) {
  const parts = [];

  if (listing.contactName) {
    parts.push(`<p><strong>Kontakt:</strong> ${escapeHtml(listing.contactName)}</p>`);
  }

  if (listing.phone) {
    parts.push(`<p><strong>Telefon:</strong> <a class="listing-contact-link" href="tel:${escapeHtml(listing.phone)}">${escapeHtml(listing.phone)}</a></p>`);
  }

  if (listing.email) {
    parts.push(`<p><strong>Email:</strong> <a class="listing-contact-link" href="mailto:${escapeHtml(listing.email)}">${escapeHtml(listing.email)}</a></p>`);
  }

  if (!parts.length) {
    contactPanel.classList.add("hidden");
    return;
  }

  contactPanel.classList.remove("hidden");
  contactElement.innerHTML = parts.join("");
}

function renderGallery(listing) {
  const images = getListingImages(listing);

  galleryElement.classList.remove("hidden");
  galleryThumbsElement.innerHTML = "";

  if (!images.length) {
    imageElement.classList.add("hidden");
    imageElement.removeAttribute("src");
    imagePlaceholderElement.classList.remove("hidden");
    galleryThumbsElement.classList.add("hidden");
    return;
  }

  imageElement.src = images[0];
  imageElement.alt = listing.title || "Zdjecie ogloszenia";
  imageElement.classList.remove("hidden");
  imagePlaceholderElement.classList.add("hidden");

  if (images.length === 1) {
    galleryThumbsElement.classList.add("hidden");
    return;
  }

  galleryThumbsElement.classList.remove("hidden");

  images.forEach((imageSrc, index) => {
    const thumbButton = document.createElement("button");
    thumbButton.type = "button";
    thumbButton.className = `listing-gallery-thumb${index === 0 ? " active" : ""}`;
    thumbButton.dataset.image = imageSrc;
    thumbButton.innerHTML = `<img src="${imageSrc}" alt="Miniatura ${index + 1}">`;
    galleryThumbsElement.appendChild(thumbButton);
  });
}

function renderListing(listing) {
  const category = normalizeCategory(listing.category);
  const currency = listing.currency || getCurrencyForCountry(listing.country);

  updateSeoMetadata(listing);
  titleElement.textContent = listing.title || "Ogłoszenie";
  introElement.textContent = "Sprawdz szczególy ogloszenia i dane kontaktowe.";
  metaElement.innerHTML = `
    <span class="listing-details-badge">${escapeHtml(category)}</span>
    <span><strong>Kategoria:</strong> ${escapeHtml(category)}</span>
    <span><strong>Kraj:</strong> ${escapeHtml(listing.country || "Nie podano kraju")}</span>
    <span><strong>Miasto:</strong> ${escapeHtml(listing.city || "Nie podano miasta")}</span>
  `;
  priceElement.textContent = formatPrice(listing.price, currency);
  descriptionElement.textContent = listing.description || "Brak opisu ogloszenia.";
  renderGallery(listing);
  renderContact(listing);
}

const params = new URLSearchParams(window.location.search);
const listingId = params.get("id");

async function initListingPage() {
  const listing = listingId ? await fetchListingById(listingId) : null;

  if (!listing) {
    renderNotFound();
    return;
  }

  renderListing(listing);
}

initListingPage();

document.addEventListener("click", (event) => {
  const galleryButton = event.target.closest(".listing-gallery-thumb");

  if (!galleryButton) {
    return;
  }

  imageElement.src = galleryButton.dataset.image || "";
  document.querySelectorAll(".listing-gallery-thumb").forEach((thumb) => {
    thumb.classList.toggle("active", thumb === galleryButton);
  });
});












