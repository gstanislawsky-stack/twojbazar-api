const API_BASE_URL = "https://twojbazar-api.onrender.com";
const AI_GENERATE_ENDPOINT = `${API_BASE_URL}/api/generate-description`;
const MODERATION_ENDPOINT = `${API_BASE_URL}/api/moderate-listing`;
const LISTINGS_ENDPOINT = `${API_BASE_URL}/api/listings`;

const menuToggle = document.querySelector(".menu-toggle");
const navLinks = document.querySelector(".nav-links");
const navActions = document.querySelector(".nav-actions");
const form = document.getElementById("addListingForm");
const formStatus = document.getElementById("formStatus");
const aiStatus = document.getElementById("aiStatus");
const generateFromImageButton = document.getElementById("generateFromImageButton");
const imageInput = document.getElementById("listingImage");
const imageFileStatus = document.getElementById("imageFileStatus");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewThumb = document.getElementById("imagePreviewThumb");
const removeImageButton = document.getElementById("removeImageButton");
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
const COUNTRY_CURRENCY_MAP = {
  Sweden: "SEK",
  Norway: "NOK",
  Denmark: "DKK",
};

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

function normalizeSpaces(value) {
  return value.trim().replace(/\s+/g, " ");
}

function normalizeDescription(value) {
  return String(value || "").trim();
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
      return setFieldState(field.name, value !== "" && Number(value) >= 0);
    case "country":
      return setFieldState(field.name, value !== "");
    case "city":
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

async function createListing(listing) {
  const response = await fetch(LISTINGS_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(listing),
  });

  if (!response.ok) {
    throw new Error(`Błąd zapisu ogłoszenia: ${response.status}`);
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

function resetImageSelection() {
  if (imageInput) {
    imageInput.value = "";
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
  const response = await fetch(MODERATION_ENDPOINT, {
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
    throw new Error(`Błąd moderacji: ${response.status}`);
  }

  return response.json();
}

function ensureCategoryOption(category) {
  if (!categorySelect || !category) {
    return;
  }

  const existingOption = [...categorySelect.options].find((option) => option.value === category);

  if (!existingOption) {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    categorySelect.appendChild(option);
  }
}

function autofillGeneratedContent(payload) {
  if (payload.title && titleInput) {
    titleInput.value = payload.title;
    validateField(titleInput);
  }

  if (payload.category && categorySelect) {
    ensureCategoryOption(payload.category);
    categorySelect.value = payload.category;
    validateField(categorySelect);
  }

  if (payload.description && descriptionInput) {
    descriptionInput.value = payload.description;
    validateField(descriptionInput);
  }

  updateFeatures(Array.isArray(payload.features) ? payload.features : []);
}

async function generateListingFromImage() {
  if (!imageInput?.files?.length) {
    setFieldState("image", false);
    setStatus(aiStatus, "Dodaj zdjęcie, aby wygenerować opis ze zdjęcia.", "error");
    return;
  }

  setFieldState("image", true);
  setStatus(aiStatus, "Analizuję zdjęcie i przygotowuję propozycję treści...", "");
  generateFromImageButton.disabled = true;
  generateFromImageButton.textContent = "⏳ Analizuję zdjęcie...";

  const formData = new FormData();
  formData.append("image", imageInput.files[0]);

  try {
    const response = await fetch(AI_GENERATE_ENDPOINT, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Błąd serwera: ${response.status}`);
    }

    const data = await response.json();

    autofillGeneratedContent({
      title: data.title || "",
      category: data.category || "",
      description: data.description || "",
      features: Array.isArray(data.features) ? data.features : [],
    });

    setStatus(aiStatus, "AI uzupełniło formularz. Sprawdź wynik i dopracuj treść.", "success");
  } catch (error) {
    setStatus(
      aiStatus,
      "Nie udało się wygenerować opisu ze zdjęcia. Sprawdź połączenie z backendem i spróbuj ponownie.",
      "error"
    );
    console.error("AI generation error:", error);
  } finally {
    generateFromImageButton.disabled = false;
    generateFromImageButton.textContent = "✨ Uzupełnij ogłoszenie z AI";
  }
}

if (generateFromImageButton) {
  generateFromImageButton.addEventListener("click", generateListingFromImage);
}

if (imageInput) {
  imageInput.addEventListener("change", async () => {
    await updateImagePreview(imageInput.files[0]);
    setStatus(aiStatus, "", "");
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

    if (!isFormValid) {
      setStatus(formStatus, "Uzupełnij poprawnie wymagane pola formularza.", "error");
      return;
    }

    try {
      const listing = {
        title: normalizeSpaces(titleInput?.value || ""),
        category: categorySelect?.value || "",
        price: String(priceInput?.value || ""),
        country: countrySelect?.value || "",
        currency: getCurrencyForCountry(countrySelect?.value),
        city: normalizeSpaces(cityInput?.value || ""),
        description: normalizeDescription(descriptionInput?.value || ""),
        contactName: normalizeSpaces(contactNameInput?.value || ""),
        phone: normalizeSpaces(phoneInput?.value || ""),
        email: normalizeSpaces(emailInput?.value || ""),
        showPhone: Boolean(showPhoneInput?.checked),
        showEmail: Boolean(showEmailInput?.checked),
        image: await readImageAsDataUrl(imageInput?.files?.[0]),
      };

      listing.images = listing.image ? [listing.image] : [];

      const moderationResult = await moderateListingContent({
        title: listing.title,
        description: listing.description,
      });

      if (!moderationResult.allowed) {
        setStatus(formStatus, "Ogłoszenie narusza zasady serwisu.", "error");
        return;
      }

      await createListing(listing);
      setStatus(formStatus, "Ogłoszenie zostało zapisane. Przenoszę na stronę główną...", "success");
      window.location.href = "index.html";
    } catch (error) {
      console.error("Listing save error:", error);
      setStatus(formStatus, "Nie udało się zapisać ogłoszenia. Spróbuj ponownie.", "error");
    }
  });
}

updatePriceField();



