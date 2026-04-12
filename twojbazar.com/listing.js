const API_BASE_URL = "https://twojbazar-api.onrender.com";
const LISTINGS_ENDPOINT = `${API_BASE_URL}/api/listings`;
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

const COUNTRY_CURRENCY_MAP = {
  szwecja: "SEK",
  dania: "DKK",
  norwegia: "NOK",
  niemcy: "EUR",
  holandia: "EUR",
  francja: "EUR",
  irlandia: "EUR",
  belgia: "EUR",
  austria: "EUR",
  wlochy: "EUR",
  "wielka brytania": "GBP",
  szwajcaria: "CHF",
};

const DEMO_LISTINGS = [
  { id: "demo-1", title: "Praca dam magazyn Göteborg", category: "Praca dam", price: "145", currency: "SEK", country: "Szwecja", city: "Göteborg", description: "Praca od zaraz w polskim zespole, zmiana dzienna, pomoc we wdrożeniu." },
  { id: "demo-2", title: "Praca szukam sprzątanie Kopenhaga", category: "Praca szukam", price: "Pełen etat", currency: "DKK", country: "Dania", city: "Kopenhaga", description: "Szukam stabilnej pracy przy sprzątaniu, komunikatywny polski i angielski." },
  { id: "demo-3", title: "Pokój wynajmę Sztokholm", category: "Pokój wynajmę", price: "5 200", currency: "SEK", country: "Szwecja", city: "Sztokholm", description: "Pokój dla jednej osoby, dobra komunikacja, blisko polskiego sklepu." },
  { id: "demo-4", title: "Szukam pokoju Oslo", category: "Pokój szukam", price: "Do 6 000 NOK", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Poszukuję pokoju blisko centrum, spokojna osoba pracująca." },
  { id: "demo-5", title: "Mieszkanie wynajmę Lyon", category: "Mieszkanie wynajmę", price: "980", currency: "EUR", country: "Francja", city: "Lyon", description: "Kawalerka w dobrym standardzie, blisko metra i polskiej parafii." },
  { id: "demo-6", title: "Szukam mieszkania Aarhus", category: "Mieszkanie szukam", price: "Do 8 500 DKK", currency: "DKK", country: "Dania", city: "Aarhus", description: "Szukam małego mieszkania dla pary, najlepiej z możliwością meldunku." },
  { id: "demo-7", title: "Oferuję remonty i malowanie", category: "Usługi oferuję", price: "Od 400 NOK", currency: "NOK", country: "Norwegia", city: "Bergen", description: "Polska ekipa, szybkie terminy, mieszkania i małe lokale użytkowe." },
  { id: "demo-8", title: "Szukam księgowej dla firmy", category: "Usługi szukam", price: "Stała współpraca", currency: "EUR", country: "Francja", city: "Paryż", description: "Potrzebna polskojęzyczna księgowa do prowadzenia małej działalności." },
  { id: "demo-9", title: "Sprzedam rower Malmö", category: "Sprzedam", price: "1 800", currency: "SEK", country: "Szwecja", city: "Malmö", description: "Rower miejski w dobrym stanie, idealny do dojazdów do pracy." },
  { id: "demo-10", title: "Kupię używaną pralkę", category: "Kupię", price: "Do 1 200 DKK", currency: "DKK", country: "Dania", city: "Odense", description: "Szukam sprawnej pralki, najlepiej z transportem lub blisko miasta." },
  { id: "demo-11", title: "Oddam ubranka dziecięce", category: "Oddam", price: "0 NOK", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Paczka ubranek po dziecku, odbiór osobisty w tygodniu." },
  { id: "demo-12", title: "Zamienię auto na busa", category: "Zamienię", price: "Wymiana", currency: "EUR", country: "Francja", city: "Lille", description: "Zamienię sprawne auto osobowe na małego busa do pracy." },
  { id: "demo-13", title: "Transport paczek Polska Szwecja", category: "Transport", price: "Od 180 SEK", currency: "SEK", country: "Szwecja", city: "Malmö", description: "Regularne kursy, przewóz paczek i rzeczy prywatnych od drzwi do drzwi." },
  { id: "demo-14", title: "Pomoc przy numerze personalnym", category: "Pomoc / formalności", price: "Konsultacja", currency: "SEK", country: "Szwecja", city: "Uppsala", description: "Wsparcie po polsku w dokumentach, urzędach i podstawowych formalnościach." },
  { id: "demo-15", title: "Poznam ludzi w Oslo", category: "Poznam ludzi", price: "Społeczność", currency: "NOK", country: "Norwegia", city: "Oslo", description: "Szukam kontaktu z Polakami do rozmów, spacerów i wspólnego poznawania miasta." },
  { id: "demo-16", title: "Różne ogłoszenie lokalne", category: "Inne", price: "Do ustalenia", currency: "EUR", country: "Francja", city: "Nicea", description: "Ogłoszenie lokalne, które nie pasuje do innych kategorii portalu." },
];

if (menuToggle && navLinks && navActions) {
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
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeText(country)] || "EUR";
}

function formatPrice(price, currency = "EUR") {
  const normalizedPrice = String(price || "").trim();

  if (!normalizedPrice) {
    return "Cena do ustalenia";
  }

  return /[a-zA-ZąćęłńóśźżĄĆĘŁŃÓŚŹŻ]/.test(normalizedPrice)
    ? normalizedPrice
    : `${normalizedPrice} ${currency}`;
}

async function fetchListingById(id) {
  try {
    const response = await fetch(`${LISTINGS_ENDPOINT}/${encodeURIComponent(id)}`);

    if (response.ok) {
      return await response.json();
    }

    if (response.status !== 404) {
      throw new Error(`Błąd pobierania ogłoszenia: ${response.status}`);
    }
  } catch (error) {
    console.error("Listing details API read error:", error);
  }

  return DEMO_LISTINGS.find((listing) => String(listing.id) === String(id)) || null;
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
  titleElement.textContent = "Nie znaleziono ogłoszenia.";
  introElement.textContent = "Sprawdź link albo wróć do listy ogłoszeń.";
  metaElement.innerHTML = "";
  priceElement.textContent = "";
  descriptionElement.textContent = "Nie znaleziono ogłoszenia.";
  contactPanel.classList.add("hidden");
  galleryElement.classList.add("hidden");
}

function renderContact(listing) {
  const parts = [];
  const actionParts = [];

  if (listing.contactName) {
    parts.push(`<p><strong>Kontakt:</strong> ${escapeHtml(listing.contactName)}</p>`);
  }

  if (listing.showPhone && listing.phone) {
    actionParts.push(`<a class="listing-contact-link" href="tel:${escapeHtml(listing.phone)}">Zadzwoń</a>`);
  }

  if (listing.showEmail && listing.email) {
    actionParts.push(`<a class="listing-contact-link" href="mailto:${escapeHtml(listing.email)}">Napisz</a>`);
  }

  if (!parts.length && !actionParts.length) {
    contactPanel.classList.add("hidden");
    return;
  }

  contactPanel.classList.remove("hidden");
  contactElement.innerHTML = `${parts.join("")}${actionParts.length ? `<div class="listing-contact-actions">${actionParts.join("")}</div>` : ""}`;
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
  imageElement.alt = listing.title || "Zdjęcie ogłoszenia";
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
  const currency = listing.currency || getCurrencyForCountry(listing.country);
  titleElement.textContent = listing.title || "Ogłoszenie";
  introElement.textContent = "Sprawdź szczegóły ogłoszenia i dane kontaktowe.";
  metaElement.innerHTML = `
    <span class="listing-details-badge">${escapeHtml(listing.category || "Ogłoszenie")}</span>
    <span>${escapeHtml(listing.city || "Nie podano miasta")} • ${escapeHtml(listing.country || "Nie podano kraju")}</span>
  `;
  priceElement.textContent = formatPrice(listing.price, currency);
  descriptionElement.textContent = listing.description || "Brak opisu ogłoszenia.";
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
