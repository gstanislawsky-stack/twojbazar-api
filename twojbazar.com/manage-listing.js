const RENDER_API_BASE_URL = "https://twojbazar-api.onrender.com";
const API_BASE_PATH = "/api/manage";
const CATEGORY_OPTIONS = [
  "Praca dam",
  "Praca szukam",
  "Mieszkanie wynajmę",
  "Mieszkanie szukam",
  "Pokój wynajmę",
  "Pokój szukam",
  "Usługi oferuję",
  "Usługi szukam",
  "Sprzedam",
  "Kupię",
  "Transport",
  "Pomoc / formalności",
  "Poznam ludzi",
  "Inne",
];

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");
const form = document.getElementById("manageListingForm");
const intro = document.getElementById("manageIntro");
const statusElement = document.getElementById("manageStatus");
const titleInput = document.getElementById("manageTitle");
const categorySelect = document.getElementById("manageCategory");
const priceInput = document.getElementById("managePrice");
const countrySelect = document.getElementById("manageCountry");
const cityInput = document.getElementById("manageCity");
const descriptionInput = document.getElementById("manageDescription");
const contactNameInput = document.getElementById("manageContactName");
const phoneInput = document.getElementById("managePhone");
const emailInput = document.getElementById("manageEmail");
const showPhoneInput = document.getElementById("manageShowPhone");
const showEmailInput = document.getElementById("manageShowEmail");
const imageInput = document.getElementById("manageImage");
const imageStatus = document.getElementById("manageImageStatus");
const imagePreview = document.getElementById("manageImagePreview");
const imagePreviewThumb = document.getElementById("manageImagePreviewThumb");
const removeImageButton = document.getElementById("manageRemoveImageButton");
const toggleStatusButton = document.getElementById("toggleStatusButton");
const deleteListingButton = document.getElementById("deleteListingButton");
const publicLinkText = document.getElementById("publicLinkText");
const manageLinkText = document.getElementById("manageLinkText");
const copyManageLinkButton = document.getElementById("copyManageLinkButton");
const viewListingButton = document.getElementById("viewListingButton");

let currentListing = null;
let pendingImage = "";
let pendingImageFile = null;
let shouldClearImage = false;

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navActions?.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });
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

async function readErrorResponse(response) {
  try {
    const data = await response.clone().json();
    return data?.error || data?.message || `Błąd serwera: ${response.status}`;
  } catch (_error) {
    const text = await response.text();
    return text || `Błąd serwera: ${response.status}`;
  }
}

async function fetchWithFallback(path, options = {}) {
  const candidates = getApiCandidates(path);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      const errorMessage = await readErrorResponse(response);
      if (response.status === 404 && url !== candidates[candidates.length - 1]) {
        lastError = new Error(errorMessage);
        continue;
      }

      throw new Error(errorMessage);
    } catch (error) {
      lastError = error;
      if (url === candidates[candidates.length - 1]) {
        throw error;
      }
    }
  }

  throw lastError || new Error("Nie udało się połączyć z API.");
}

function normalizeSpaces(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

function normalizeText(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parsePriceValue(value) {
  const normalizedValue = normalizeSpaces(value).replace(/\s+/g, "").replace(",", ".");
  const price = Number(normalizedValue);
  return Number.isFinite(price) ? price : "";
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
  if (normalizedValue.includes("mieszkan")) return "Mieszkanie wynajmę";
  if (normalizedValue.includes("pokoj") && normalizedValue.includes("szuk")) return "Pokój szukam";
  if (normalizedValue.includes("pokoj")) return "Pokój wynajmę";
  if (normalizedValue.includes("uslug") && normalizedValue.includes("szuk")) return "Usługi szukam";
  if (normalizedValue.includes("uslug")) return "Usługi oferuję";
  if (normalizedValue.includes("sprzed")) return "Sprzedam";
  if (normalizedValue.includes("kupi")) return "Kupię";
  if (normalizedValue.includes("transport") || normalizedValue.includes("przewoz") || normalizedValue.includes("bus")) return "Transport";
  if (normalizedValue.includes("pomoc") || normalizedValue.includes("formal")) return "Pomoc / formalności";
  if (normalizedValue.includes("poznam") || normalizedValue.includes("ludzi") || normalizedValue.includes("spolecz")) return "Poznam ludzi";
  return "Inne";
}

function setStatus(message, type = "") {
  statusElement.textContent = message;
  statusElement.className = `form-status${type ? ` ${type}` : ""}`;
}

function fillCategoryOptions() {
  categorySelect.innerHTML = '<option value="">Wybierz kategorię</option>';
  CATEGORY_OPTIONS.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  });
}

function getManagementPath(token) {
  return `${API_BASE_PATH}/${encodeURIComponent(token)}`;
}

function updateViewActions(listing) {
  const managementUrl = listing.manageUrl || listing.managementUrl || `${window.location.origin}/manage.html?token=${encodeURIComponent(manageToken)}`;
  const publicUrl = listing.publicUrl || `${window.location.origin}/listing.html?id=${encodeURIComponent(listing.id)}`;

  if (publicLinkText) {
    publicLinkText.textContent = publicUrl;
  }

  if (manageLinkText) {
    manageLinkText.textContent = managementUrl;
  }

  if (viewListingButton) {
    viewListingButton.href = publicUrl;
    viewListingButton.classList.toggle("hidden", listing.status !== "active");
  }

  if (toggleStatusButton) {
    toggleStatusButton.textContent = listing.status === "deleted"
      ? "Przywróć ogłoszenie"
      : listing.status === "inactive"
        ? "Oznacz jako aktualne"
        : "Oznacz jako nieaktualne";
  }

  intro.textContent = listing.status === "deleted"
    ? "To ogłoszenie jest usunięte publicznie. Nadal możesz je przywrócić albo edytować przez ten prywatny link."
    : listing.status === "inactive"
      ? "To ogłoszenie jest oznaczone jako nieaktualne. Możesz je ponownie aktywować albo edytować."
      : "Przez ten prywatny link możesz edytować, wstrzymać albo usunąć ogłoszenie.";
}

function populateForm(listing) {
  currentListing = listing;
  pendingImage = listing.image || "";
  pendingImageFile = null;
  shouldClearImage = false;
  titleInput.value = listing.title || "";
  categorySelect.value = normalizeCategory(listing.category);
  priceInput.value = listing.price || "";
  countrySelect.value = listing.country || "";
  cityInput.value = listing.city || "";
  descriptionInput.value = listing.description || "";
  contactNameInput.value = listing.contactName || "";
  phoneInput.value = listing.phone || "";
  emailInput.value = listing.email || "";
  showPhoneInput.checked = Boolean(listing.showPhone);
  showEmailInput.checked = Boolean(listing.showEmail);

  if (pendingImage) {
    imagePreviewThumb.src = pendingImage;
    imagePreview.classList.remove("hidden");
    imageStatus.textContent = "Aktualne zdjęcie";
  } else {
    imagePreview.classList.add("hidden");
    imagePreviewThumb.removeAttribute("src");
    imageStatus.textContent = "Brak zdjęcia";
  }

  updateViewActions(listing);
}

function buildListingPayload() {
  return {
    title: normalizeSpaces(titleInput.value),
    category: normalizeCategory(categorySelect.value),
    price: parsePriceValue(priceInput.value),
    country: normalizeSpaces(countrySelect.value),
    city: normalizeSpaces(cityInput.value),
    description: normalizeDescription(descriptionInput.value),
    contactName: normalizeSpaces(contactNameInput.value),
    phone: normalizeSpaces(phoneInput.value),
    email: normalizeSpaces(emailInput.value),
    showPhone: Boolean(showPhoneInput.checked),
    showEmail: Boolean(showEmailInput.checked),
  };
}

async function loadListing() {
  const response = await fetchWithFallback(getManagementPath(manageToken));
  const data = await response.json();
  populateForm(data);
}

async function updateListing() {
  const payload = buildListingPayload();
  const formData = new FormData();

  Object.entries(payload).forEach(([key, value]) => {
    formData.append(key, typeof value === "boolean" ? String(value) : String(value));
  });

  if (pendingImageFile) {
    formData.append("image", pendingImageFile);
  } else if (shouldClearImage) {
    formData.append("clearImage", "true");
  }

  const response = await fetchWithFallback(getManagementPath(manageToken), {
    method: "PUT",
    body: formData,
  });

  return response.json();
}

async function updateListingStatus(status) {
  const response = await fetchWithFallback(`${getManagementPath(manageToken)}/status`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status }),
  });

  return response.json();
}

async function deleteListing() {
  const response = await fetchWithFallback(getManagementPath(manageToken), {
    method: "DELETE",
  });

  return response.json();
}

const params = new URLSearchParams(window.location.search);
const manageToken = params.get("token") || "";

fillCategoryOptions();

if (!manageToken) {
  setStatus("Brak prywatnego linku do zarządzania ogłoszeniem.", "error");
  intro.textContent = "Otwórz stronę przez poprawny prywatny link.";
} else {
  loadListing().catch((error) => {
    console.error("Manage listing load error:", error);
    setStatus(error.message || "Nie udało się wczytać ogłoszenia.", "error");
    intro.textContent = "Ten link jest nieprawidłowy albo ogłoszenie zostało usunięte.";
  });
}

imageInput?.addEventListener("change", async () => {
  const file = imageInput.files?.[0];

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
  imageInput.value = "";
  imagePreview.classList.add("hidden");
  imagePreviewThumb.removeAttribute("src");
  imageStatus.textContent = "Brak zdjęcia";
});

copyManageLinkButton?.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(manageLinkText.textContent || "");
    setStatus("Prywatny link został skopiowany.", "success");
  } catch (error) {
    console.error("Copy manage link error:", error);
    setStatus("Nie udało się skopiować linku.", "error");
  }
});

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  try {
    const listing = await updateListing();
    populateForm(listing);
    setStatus("Zmiany zostały zapisane.", "success");
  } catch (error) {
    console.error("Manage listing save error:", error);
    setStatus(error.message || "Nie udało się zapisać zmian.", "error");
  }
});

toggleStatusButton?.addEventListener("click", async () => {
  if (!currentListing) {
    return;
  }

  try {
    const nextStatus = currentListing.status === "deleted"
      ? "active"
      : currentListing.status === "inactive"
        ? "active"
        : "inactive";
    const listing = await updateListingStatus(nextStatus);
    populateForm(listing);
    setStatus(
      nextStatus === "inactive"
        ? "Ogłoszenie oznaczono jako nieaktualne."
        : "Ogłoszenie ponownie oznaczono jako aktywne.",
      "success"
    );
  } catch (error) {
    console.error("Manage listing status error:", error);
    setStatus(error.message || "Nie udało się zmienić statusu.", "error");
  }
});

deleteListingButton?.addEventListener("click", async () => {
  if (!window.confirm("Usunąć to ogłoszenie?")) {
    return;
  }

  try {
    const listing = await deleteListing();
    populateForm(listing);
    setStatus("Ogłoszenie zostało usunięte i ukryte publicznie.", "success");
  } catch (error) {
    console.error("Manage listing delete error:", error);
    setStatus(error.message || "Nie udało się usunąć ogłoszenia.", "error");
  }
});
