const RENDER_API_BASE_URL = "https://twojbazar-api.onrender.com";
const API_PATHS = {
  generateDescription: "/api/generate-description",
  moderateListing: "/api/moderate-listing",
  listings: "/api/listings",
};

function getApiCandidates(path) {
  const candidates = [];
  const normalizedPath = path.startsWith("/") ? path : "/" + path;

  if (window.location.protocol.startsWith("http")) {
    candidates.push(normalizedPath);
  }

  candidates.push(RENDER_API_BASE_URL + normalizedPath);

  return [...new Set(candidates)];
}

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");
const form = document.getElementById("addListingForm");
const formStatus = document.getElementById("formStatus");
const aiStatus = document.getElementById("aiStatus");
const generateFromImageButton = document.getElementById("generateFromImageButton");
const imageInput = document.getElementById("listingImage");
const imageGalleryInput = document.getElementById("listingImageGallery");
const imageCameraTrigger = document.getElementById("listingImageCameraTrigger");
const imageGalleryTrigger = document.getElementById("listingImageGalleryTrigger");
const imageFileStatus = document.getElementById("imageFileStatus");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewThumb = document.getElementById("imagePreviewThumb");
const removeImageButton = document.getElementById("removeImageButton");
let selectedImageFile = null;

console.debug("[TwojBazar WWW] image inputs", {
  imageInputFound: Boolean(imageInput),
  imageGalleryInputFound: Boolean(imageGalleryInput),
  imageCameraTriggerFound: Boolean(imageCameraTrigger),
  imageGalleryTriggerFound: Boolean(imageGalleryTrigger),
  imageFileStatusFound: Boolean(imageFileStatus),
  imagePreviewFound: Boolean(imagePreview),
});

const featuresList = document.getElementById("featuresList");
const featuresDataInput = document.getElementById("featuresData");
const titleInput = document.getElementById("title");
const categorySelect = document.getElementById("category");
const countrySelect = document.getElementById("country");
const priceInput = document.getElementById("price");
const priceHint = document.getElementById("priceHint");
const cityInput = document.getElementById("city");
const descriptionInput = document.getElementById("description");
const contactNameInput = document.getElementById("contactName");
const phoneInput = document.getElementById("phone");
const emailInput = document.getElementById("email");
const showPhoneInput = document.getElementById("showPhone");
const showEmailInput = document.getElementById("showEmail");
const aiQuickStartSection = document.getElementById("ai-quick-start");

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

const COUNTRY_CURRENCY_MAP = {
  Szwecja: "SEK",
  Norwegia: "NOK",
  Dania: "DKK",
};

const isQuickAiMode = new URLSearchParams(window.location.search).get("mode") === "ai";

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    const isOpen = navLinks.classList.toggle("open");
    navActions?.classList.toggle("open", isOpen);
    menuToggle.setAttribute("aria-expanded", String(isOpen));
  });

  [...navLinks.querySelectorAll("a"), ...(navActions?.querySelectorAll("a") || [])].forEach((link) => {
    link.addEventListener("click", () => {
      navLinks.classList.remove("open");
      navActions?.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    });
  });
}

function setFieldState(fieldName, isValid) {
  const wrapper = document.querySelector(`[data-field="${fieldName}"]`);

  if (!wrapper) {
    return true;
  }

  wrapper.classList.toggle("invalid", !isValid);
  return isValid;
}

function setStatus(element, message, type = "") {
  if (!element) {
    return;
  }

  element.textContent = message;
  element.className = `form-status${type ? ` ${type}` : ""}`;
}

function setStatusHtml(element, html, type = "") {
  if (!element) {
    return;
  }

  element.innerHTML = html;
  element.className = `form-status${type ? ` ${type}` : ""}`;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

async function readErrorResponse(response) {
  const fallbackMessage = `Błąd serwera: ${response.status}`;

  try {
    const data = await response.clone().json();
    return data?.error || data?.message || fallbackMessage;
  } catch (_error) {
    try {
      const text = await response.text();

      if (text && text.trim().startsWith("<!DOCTYPE")) {
        return `Endpoint API nie istnieje pod adresem ${response.url} (HTTP ${response.status}).`;
      }

      return text || fallbackMessage;
    } catch (_textError) {
      return fallbackMessage;
    }
  }
}

async function fetchWithApiFallback(path, options = {}) {
  const candidates = getApiCandidates(path);
  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, options);

      if (response.ok) {
        return response;
      }

      const errorMessage = await readErrorResponse(response);
      const notFoundHtml = response.status === 404 && errorMessage.includes("Endpoint API nie istnieje");

      console.error("API request failed:", {
        url,
        status: response.status,
        errorMessage,
      });

      if (notFoundHtml && url !== candidates[candidates.length - 1]) {
        lastError = new Error(errorMessage);
        continue;
      }

      throw new Error(errorMessage);
    } catch (error) {
      lastError = error;

      console.error("API request error:", {
        url,
        error,
      });

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

function parsePriceValue(value) {
  const normalizedValue = normalizeSpaces(value).replace(/\s+/g, "").replace(",", ".");
  const price = Number(normalizedValue);
  return Number.isFinite(price) ? price : "";
}

function normalizeDescription(value) {
  return String(value || "").trim();
}

function normalizeCategoryKey(value) {
  return normalizeSpaces(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCategory(value) {
  const rawCategory = normalizeSpaces(value);

  if (!rawCategory) {
    return "Inne";
  }

  const directMatch = CATEGORY_OPTIONS.find((category) => normalizeCategoryKey(category) === normalizeCategoryKey(rawCategory));

  if (directMatch) {
    return directMatch;
  }

  const normalizedValue = normalizeCategoryKey(rawCategory);

  if (normalizedValue.includes("praca") && normalizedValue.includes("szuk")) {
    return "Praca szukam";
  }

  if (normalizedValue.includes("praca")) {
    return "Praca dam";
  }

  if (normalizedValue.includes("mieszkan") && normalizedValue.includes("szuk")) {
    return "Mieszkanie szukam";
  }

  if (normalizedValue.includes("mieszkan")) {
    return "Mieszkanie wynajmę";
  }

  if (normalizedValue.includes("pokoj") && normalizedValue.includes("szuk")) {
    return "Pokój szukam";
  }

  if (normalizedValue.includes("pokoj")) {
    return "Pokój wynajmę";
  }

  if (normalizedValue.includes("uslug") && normalizedValue.includes("szuk")) {
    return "Usługi szukam";
  }

  if (normalizedValue.includes("uslug") || normalizedValue.includes("remont") || normalizedValue.includes("formal")) {
    return normalizedValue.includes("formal") ? "Pomoc / formalności" : "Usługi oferuję";
  }

  if (normalizedValue.includes("sprzed")) {
    return "Sprzedam";
  }

  if (normalizedValue.includes("kupi")) {
    return "Kupię";
  }

  if (normalizedValue.includes("transport") || normalizedValue.includes("przewoz") || normalizedValue.includes("bus")) {
    return "Transport";
  }

  if (normalizedValue.includes("pomoc") || normalizedValue.includes("formal")) {
    return "Pomoc / formalności";
  }

  if (normalizedValue.includes("poznam") || normalizedValue.includes("ludzi") || normalizedValue.includes("spolecz")) {
    return "Poznam ludzi";
  }

  return "Inne";
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[normalizeSpaces(country || "")] || "EUR";
}

function updatePriceField() {
  const currency = getCurrencyForCountry(countrySelect?.value);

  if (priceHint) {
    priceHint.textContent = `Wpisz kwotę w ${currency}.`;
  }

  if (priceInput) {
    const exampleValue = currency === "EUR" ? "300" : currency === "SEK" ? "850" : currency === "NOK" ? "1200" : "500";
    priceInput.placeholder = `Np. ${exampleValue} ${currency}`;
  }
}

function validateField(field) {
  const value = field.tagName === "TEXTAREA" ? normalizeDescription(field.value) : normalizeSpaces(field.value);

  switch (field.name) {
    case "title":
      return setFieldState(field.name, value.length >= 5);
    case "category":
      return setFieldState(field.name, value !== "");
    case "price":
      return setFieldState(field.name, value !== "");
    case "country":
      return setFieldState(field.name, value !== "");
    case "city":
      return setFieldState(field.name, value.length >= 2);
    case "contactName":
      return setFieldState(field.name, value.length >= 2);
    case "phone":
      return setFieldState(field.name, value === "" || value.length >= 6);
    case "email":
      return setFieldState(field.name, value === "" || field.validity.valid);
    case "description":
      return setFieldState(field.name, value.length >= 20);
    default:
      return true;
  }
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
    formData.append("image", imageFile);
  }

  const response = await fetchWithApiFallback(API_PATHS.listings, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
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
    reader.onerror = () => reject(new Error("Nie udało się odczytać zdjęcia."));
    reader.readAsDataURL(file);
  });
}

function getSelectedImageFile() {
  return selectedImageFile;
}

function resetImageSelection() {
  selectedImageFile = null;

  if (imageInput) {
    imageInput.value = "";
  }

  if (imageGalleryInput) {
    imageGalleryInput.value = "";
  }

  if (imageFileStatus) {
    imageFileStatus.textContent = "Nie wybrano pliku";
  }

  if (imagePreviewThumb) {
    imagePreviewThumb.removeAttribute("src");
  }

  if (imagePreview) {
    imagePreview.classList.add("hidden");
  }

  console.debug("[TwojBazar WWW] resetImageSelection");
  setFieldState("image", false);
}

async function updateImagePreview(file) {
  if (!file) {
    resetImageSelection();
    return;
  }

  if (!file.type.startsWith("image/")) {
    resetImageSelection();
    setStatus(aiStatus, "Wybrany plik nie jest obrazem. Dodaj zdjęcie produktu lub usługi.", "error");
    return;
  }

  if (imageFileStatus) {
    imageFileStatus.textContent = file.name;
  }

  if (imagePreviewThumb) {
    imagePreviewThumb.src = await readImageAsDataUrl(file);
  }

  if (imagePreview) {
    imagePreview.classList.remove("hidden");
  }

  setFieldState("image", true);
}

function updateFeatures(features = []) {
  if (!featuresList || !featuresDataInput) {
    return;
  }

  featuresList.innerHTML = "";

  if (!features.length) {
    featuresList.classList.add("hidden");
    const emptyItem = document.createElement("li");
    emptyItem.textContent = "Brak wygenerowanych cech";
    featuresList.appendChild(emptyItem);
    featuresDataInput.value = "";
    return;
  }

  featuresList.classList.remove("hidden");

  features.forEach((feature) => {
    const item = document.createElement("li");
    item.textContent = feature;
    featuresList.appendChild(item);
  });

  featuresDataInput.value = JSON.stringify(features);
}

async function moderateListingContent({ title, description }) {
  const response = await fetchWithApiFallback(API_PATHS.moderateListing, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title,
      description,
    }),
  });

  if (!response.ok) {
    throw new Error(await readErrorResponse(response));
  }

  return response.json();
}

function autofillGeneratedContent(payload) {
  if (payload.title && titleInput) {
    titleInput.value = payload.title;
    validateField(titleInput);
  }

  if (payload.category && categorySelect) {
    categorySelect.value = normalizeCategory(payload.category);
    validateField(categorySelect);
  }

  if (payload.description && descriptionInput) {
    descriptionInput.value = payload.description;
    validateField(descriptionInput);
  }

  updateFeatures(Array.isArray(payload.features) ? payload.features : []);

  if (isQuickAiMode) {
    countrySelect?.scrollIntoView({ behavior: "smooth", block: "center" });
    countrySelect?.focus();
  }
}

async function generateListingFromImage() {
  const selectedImage = getSelectedImageFile();
  console.debug("[TwojBazar WWW] generateListingFromImage selected file", {
    hasFile: Boolean(selectedImage),
    fileName: selectedImage?.name || null,
    fileSize: selectedImage?.size || 0,
    fileType: selectedImage?.type || null,
  });

  if (!selectedImage) {
    setFieldState("image", false);
    setStatus(aiStatus, "Dodaj zdjęcie, aby wygenerować opis ze zdjęcia.", "error");
    return;
  }

  setFieldState("image", true);
  setStatus(aiStatus, "Analizuję zdjęcie i przygotowuję propozycję treści...", "");
  generateFromImageButton.disabled = true;
  generateFromImageButton.textContent = "Analizuję zdjęcie...";

  const formData = new FormData();
  formData.append("image", selectedImage);

  try {
    const response = await fetchWithApiFallback(API_PATHS.generateDescription, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(await readErrorResponse(response));
    }

    const data = await response.json();

    autofillGeneratedContent({
      title: data.title || "",
      category: data.category || "",
      description: data.description || "",
      features: Array.isArray(data.features) ? data.features : [],
    });

    setStatus(aiStatus, "AI przygotowało szkic. Sprawdź dane i uzupełnij tylko kraj, miasto, kontakt oraz cenę, jeśli jest potrzebna.", "success");
  } catch (error) {
    const errorMessage = error instanceof Error
      ? error.message
      : "Nie udało się wygenerować opisu ze zdjęcia.";

    setStatus(aiStatus, errorMessage, "error");
    console.error("AI generation error:", {
      error,
    });
  } finally {
    generateFromImageButton.disabled = false;
    generateFromImageButton.textContent = "Uzupełnij ogłoszenie z AI";
  }
}

if (generateFromImageButton) {
  generateFromImageButton.addEventListener("click", generateListingFromImage);
}

async function handleImageSelection(activeInput, otherInput) {
  const selectedFile = activeInput?.files?.[0] || null;
  selectedImageFile = selectedFile;

  console.debug("[TwojBazar WWW] handleImageSelection", {
    activeInputId: activeInput?.id || null,
    otherInputId: otherInput?.id || null,
    hasFile: Boolean(selectedFile),
    fileName: selectedFile?.name || null,
    fileSize: selectedFile?.size || 0,
    fileType: selectedFile?.type || null,
  });

  if (otherInput) {
    otherInput.value = "";
  }

  await updateImagePreview(selectedFile);
  setStatus(aiStatus, "", "");
}

if (imageCameraTrigger && imageInput) {
  imageCameraTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    console.debug("[TwojBazar WWW] camera trigger click");
    imageInput.click();
  });
}

if (imageGalleryTrigger && imageGalleryInput) {
  imageGalleryTrigger.addEventListener("click", (event) => {
    event.preventDefault();
    console.debug("[TwojBazar WWW] gallery trigger click");
    imageGalleryInput.click();
  });
}

if (imageInput) {
  imageInput.addEventListener("change", async () => {
    console.debug("[TwojBazar WWW] camera input change", {
      hasFile: Boolean(imageInput.files?.[0]),
      fileName: imageInput.files?.[0]?.name || null,
    });
    await handleImageSelection(imageInput, imageGalleryInput);
  });
}

if (imageGalleryInput) {
  imageGalleryInput.addEventListener("change", async () => {
    console.debug("[TwojBazar WWW] gallery input change", {
      hasFile: Boolean(imageGalleryInput.files?.[0]),
      fileName: imageGalleryInput.files?.[0]?.name || null,
    });
    await handleImageSelection(imageGalleryInput, imageInput);
  });
}

if (removeImageButton) {
  removeImageButton.addEventListener("click", () => {
    resetImageSelection();
    setStatus(aiStatus, "", "");
  });
}

if (countrySelect) {
  countrySelect.addEventListener("change", updatePriceField);
}

if (form) {
  const fields = [...form.querySelectorAll("input:not([type='file']):not([type='hidden']), select, textarea")];

  fields.forEach((field) => {
    const eventName = field.tagName === "SELECT" ? "change" : "input";
    field.addEventListener(eventName, () => {
      if (field.tagName === "INPUT" && field.type !== "number") {
        field.value = normalizeSpaces(field.value);
      }

      validateField(field);
      setStatus(formStatus, "", "");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    fields.forEach((field) => {
      if (field.tagName === "INPUT" && field.type !== "number") {
        field.value = normalizeSpaces(field.value);
      }
    });

    const isFormValid = fields.every((field) => validateField(field));
    const hasContactMethod = normalizeSpaces(phoneInput?.value || "") || normalizeSpaces(emailInput?.value || "");

    if (!isFormValid || !hasContactMethod) {
      setFieldState("phone", Boolean(hasContactMethod));
      setFieldState("email", Boolean(hasContactMethod));
      setStatus(formStatus, "Uzupełnij poprawnie wymagane pola i podaj telefon albo e-mail.", "error");
      return;
    }

    try {
      const selectedImage = getSelectedImageFile();
      console.debug("[TwojBazar WWW] submit selected file", {
        hasFile: Boolean(selectedImage),
        fileName: selectedImage?.name || null,
        fileSize: selectedImage?.size || 0,
        fileType: selectedImage?.type || null,
      });

      const listing = {
        title: normalizeSpaces(titleInput?.value || ""),
        category: normalizeCategory(categorySelect?.value || ""),
        price: parsePriceValue(priceInput?.value || ""),
        country: countrySelect?.value || "",
        currency: getCurrencyForCountry(countrySelect?.value),
        city: normalizeSpaces(cityInput?.value || ""),
        description: normalizeDescription(descriptionInput?.value || ""),
        contactName: normalizeSpaces(contactNameInput?.value || ""),
        phone: normalizeSpaces(phoneInput?.value || ""),
        email: normalizeSpaces(emailInput?.value || ""),
        showPhone: Boolean(showPhoneInput?.checked),
        showEmail: Boolean(showEmailInput?.checked),
      };

      let moderationResult = { allowed: true };

      try {
        moderationResult = await moderateListingContent({
          title: listing.title,
          description: listing.description,
        });
      } catch (moderationError) {
        console.warn("Moderation unavailable, continuing without moderation.", moderationError);
      }

      if (!moderationResult.allowed) {
        setStatus(formStatus, "Ogłoszenie narusza zasady serwisu.", "error");
        return;
      }

      const createdListing = await createListing(listing, selectedImage);
      const publicUrl = createdListing?.publicUrl || "";
      const managementUrl = createdListing?.managementUrl || createdListing?.manageUrl || "";
      const emailStatus = createdListing?.emailDeliveryStatus?.status || "unknown";

      if (emailStatus === "sent" && publicUrl) {
        setStatus(formStatus, "Ogłoszenie zostało zapisane. Mail z linkami został wysłany.", "success");
        window.location.href = publicUrl;
        return;
      }

      if (publicUrl && managementUrl) {
        setStatusHtml(
          formStatus,
          `Ogłoszenie zostało zapisane, ale mail nie został potwierdzony. Zachowaj linki poniżej:<br><a href="${escapeHtml(publicUrl)}">Zobacz ogłoszenie</a><br><a href="${escapeHtml(managementUrl)}">Zarządzaj ogłoszeniem</a>`,
          "success"
        );
        return;
      }

      if (publicUrl) {
        window.location.href = publicUrl;
        return;
      }

      window.location.href = "index.html";
    } catch (error) {
      console.error("Listing save error:", error);
      setStatus(
        formStatus,
        error instanceof Error ? error.message : "Nie udało się zapisać ogłoszenia. Spróbuj ponownie.",
        "error"
      );
    }
  });
}

updatePriceField();

if (isQuickAiMode && aiQuickStartSection) {
  requestAnimationFrame(() => {
    aiQuickStartSection.scrollIntoView({ behavior: "smooth", block: "start" });
    imageInput?.focus();
    setStatus(aiStatus, "Dodaj zdjęcie lub zrób zdjęcie aparatem, a AI wypełni kategorię, tytuł, opis i najważniejsze cechy.", "");
  });
}
