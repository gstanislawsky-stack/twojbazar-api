import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { mkdirSync, promises as fs } from "node:fs";
import path from "node:path";
import { randomBytes, randomUUID } from "node:crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const listingsFilePath = path.join(__dirname, "listings.json");
const listingsTempFilePath = path.join(__dirname, "listings.json.tmp");
const uploadsDirPath = path.join(__dirname, "uploads");
let listings = [];
let listingsWriteQueue = Promise.resolve();
const managementTokenTtlDays = Math.max(1, Number(process.env.MANAGEMENT_TOKEN_TTL_DAYS || 365));
const ALLOWED_CATEGORIES = [
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
const ALLOWED_COUNTRIES = ["Szwecja", "Norwegia", "Dania"];
const COUNTRY_CURRENCY_MAP = {
  Szwecja: "SEK",
  Norwegia: "NOK",
  Dania: "DKK",
};

const allowedOrigins = new Set([
  "https://twojbazar.com",
  "http://twojbazar.com",
  "https://www.twojbazar.com",
  "http://www.twojbazar.com",
]);

if (!process.env.OPENAI_API_KEY) {
  console.warn("Missing OPENAI_API_KEY. The AI endpoint will return an error until it is configured.");
}

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })
  : null;

function createMailerTransporter() {
  const host = normalizeString(process.env.SMTP_HOST);
  const port = Number(process.env.SMTP_PORT || 0);
  const user = normalizeString(process.env.SMTP_USER);
  const pass = normalizeString(process.env.SMTP_PASS);
  const secure = String(process.env.SMTP_SECURE || "false").toLowerCase() === "true";

  if (!host || !port || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass,
    },
  });
}

const mailerTransporter = createMailerTransporter();
const managementEmailFrom =
  normalizeString(process.env.SMTP_FROM) ||
  normalizeString(process.env.MANAGEMENT_EMAIL_FROM) ||
  normalizeString(process.env.SMTP_USER);

const uploadLimits = {
  fileSize: 10 * 1024 * 1024,
};

function imageFileFilter(_req, file, callback) {
  if (!file.mimetype.startsWith("image/")) {
    callback(new Error("Only image uploads are allowed."));
    return;
  }

  callback(null, true);
}

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      mkdirSync(uploadsDirPath, { recursive: true });
      callback(null, uploadsDirPath);
    },
    filename: (_req, file, callback) => {
      const safeExtension = path.extname(file.originalname || "").slice(0, 10) || ".jpg";
      callback(null, `${Date.now()}-${randomUUID()}${safeExtension}`);
    },
  }),
  limits: uploadLimits,
  fileFilter: imageFileFilter,
});

const aiUpload = multer({
  storage: multer.memoryStorage(),
  limits: uploadLimits,
  fileFilter: imageFileFilter,
});

const listingUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "images", maxCount: 6 },
]);

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  const normalizedValue = normalizeString(value).toLowerCase();
  return normalizedValue === "true" || normalizedValue === "1" || normalizedValue === "yes" || normalizedValue === "on";
}

function normalizeCategoryKey(value) {
  return normalizeString(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeCategory(value) {
  const rawCategory = normalizeString(value);

  if (!rawCategory) {
    return "Inne";
  }

  const directMatch = ALLOWED_CATEGORIES.find((category) => normalizeCategoryKey(category) === normalizeCategoryKey(rawCategory));

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

  if ((normalizedValue.includes("pokoj") || normalizedValue.includes("pok")) && normalizedValue.includes("szuk")) {
    return "Pokój szukam";
  }

  if (normalizedValue.includes("pokoj") || normalizedValue.includes("pok")) {
    return "Pokój wynajmę";
  }

  if (normalizedValue.includes("uslug") && normalizedValue.includes("szuk")) {
    return "Usługi szukam";
  }

  if (normalizedValue.includes("uslug") || normalizedValue.includes("remont") || normalizedValue.includes("ksieg") || normalizedValue.includes("tlumacz")) {
    return "Usługi oferuję";
  }

  if (normalizedValue.includes("sprzed")) {
    return "Sprzedam";
  }

  if (normalizedValue.includes("kupi") || normalizedValue.includes("szukam kup")) {
    return "Kupię";
  }

  if (normalizedValue.includes("transport") || normalizedValue.includes("przewoz") || normalizedValue.includes("bus")) {
    return "Transport";
  }

  if (normalizedValue.includes("formal") || normalizedValue.includes("pomoc")) {
    return "Pomoc / formalności";
  }

  if (normalizedValue.includes("poznam") || normalizedValue.includes("ludzi") || normalizedValue.includes("spolecz")) {
    return "Poznam ludzi";
  }

  return "Inne";
}

function normalizeCountry(value) {
  const rawCountry = normalizeString(value);

  if (!rawCountry) {
    return "";
  }

  const directMatch = ALLOWED_COUNTRIES.find((country) => normalizeCategoryKey(country) === normalizeCategoryKey(rawCountry));
  return directMatch || "";
}

function getCurrencyForCountry(country) {
  return COUNTRY_CURRENCY_MAP[country] || "";
}

function normalizePriceValue(value, { strict = false } = {}) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  const rawValue = normalizeString(value).replace(/\s+/g, "").replace(",", ".");

  if (!rawValue) {
    return strict ? null : "";
  }

  if (/^-?\d+(\.\d+)?$/.test(rawValue)) {
    return Number(rawValue);
  }

  return strict ? null : normalizeString(value);
}

function sanitizeImageValue(value) {
  if (typeof value !== "string") {
    return "";
  }

  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return "";
  }

  if (
    /^https?:\/\//i.test(normalizedValue) ||
    normalizedValue.startsWith("/")
  ) {
    return normalizedValue;
  }

  return "";
}

function normalizeStatus(value) {
  const normalizedValue = normalizeString(value);

  if (normalizedValue === "deleted") {
    return "deleted";
  }

  if (normalizedValue === "inactive") {
    return "inactive";
  }

  return "active";
}

function generateManagementToken() {
  return randomBytes(32).toString("hex");
}

function getManagementTokenExpiresAt(createdAtIso) {
  const createdAt = new Date(createdAtIso);
  createdAt.setUTCDate(createdAt.getUTCDate() + managementTokenTtlDays);
  return createdAt.toISOString();
}

function isManagementTokenExpired(listing) {
  const expiresAt = normalizeString(listing?.managementTokenExpiresAt);

  if (!expiresAt) {
    return false;
  }

  const expiresTime = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiresTime)) {
    return true;
  }

  return Date.now() > expiresTime;
}

function normalizeListing(listing) {
  const safeListing = listing && typeof listing === "object" ? listing : {};
  const normalizedStatus = normalizeStatus(safeListing.status);
  const normalizedCountry = normalizeCountry(safeListing.country);
  const normalizedImage = sanitizeImageValue(safeListing.image);
  const normalizedCreatedAt = normalizeString(safeListing.createdAt);
  const normalizedTokenCreatedAt = normalizeString(safeListing.managementTokenCreatedAt);
  const normalizedTokenExpiresAt = normalizeString(safeListing.managementTokenExpiresAt);
  const normalizedToken = normalizeString(safeListing.managementToken);

  return {
    ...safeListing,
    id: normalizeString(safeListing.id) || safeListing.id,
    title: normalizeString(safeListing.title),
    category: normalizeCategory(safeListing.category),
    price: normalizePriceValue(safeListing.price),
    currency: normalizeString(safeListing.currency) || getCurrencyForCountry(normalizedCountry),
    country: normalizedCountry,
    city: normalizeString(safeListing.city),
    description: normalizeString(safeListing.description),
    contactName: normalizeString(safeListing.contactName),
    phone: normalizeString(safeListing.phone),
    email: normalizeString(safeListing.email),
    showPhone: normalizeBoolean(safeListing.showPhone),
    showEmail: normalizeBoolean(safeListing.showEmail),
    image: normalizedImage,
    images: Array.isArray(safeListing.images) ? safeListing.images.map(sanitizeImageValue).filter(Boolean) : normalizedImage ? [normalizedImage] : [],
    createdAt: normalizedCreatedAt,
    status: normalizedStatus,
    managementToken: normalizedToken,
    managementTokenCreatedAt: normalizedTokenCreatedAt,
    managementTokenExpiresAt: normalizedTokenExpiresAt,
  };
}

function resolveAssetUrl(req, assetPath) {
  const normalizedPath = sanitizeImageValue(assetPath);

  if (!normalizedPath || /^https?:\/\//i.test(normalizedPath)) {
    return normalizedPath;
  }

  return `${getBaseUrl(req)}${normalizedPath}`;
}

function serializePublicListing(req, listing) {
  const { managementToken, ...publicListing } = normalizeListing(listing);
  return {
    ...publicListing,
    image: resolveAssetUrl(req, publicListing.image),
    images: Array.isArray(publicListing.images) ? publicListing.images.map((item) => resolveAssetUrl(req, item)).filter(Boolean) : [],
  };
}

function getBaseUrl(req) {
  const origin = normalizeString(req.headers.origin);

  if (origin) {
    return origin.replace(/\/$/, "");
  }

  return `${req.protocol}://${req.get("host")}`;
}

function getManagementUrl(req, token) {
  return `${getBaseUrl(req)}/manage.html?token=${encodeURIComponent(token)}`;
}

function getPublicListingUrl(req, listingId) {
  return `${getBaseUrl(req)}/listing.html?id=${encodeURIComponent(listingId)}`;
}

function serializeManagedListing(req, listing) {
  return {
    ...serializePublicListing(req, listing),
    publicUrl: getPublicListingUrl(req, listing.id),
    manageUrl: getManagementUrl(req, listing.managementToken),
    managementUrl: getManagementUrl(req, listing.managementToken),
    managementToken: listing.managementToken,
    managementTokenCreatedAt: listing.managementTokenCreatedAt,
    managementTokenExpiresAt: listing.managementTokenExpiresAt,
  };
}

async function sendManagementLinkEmail({ to, publicUrl, managementUrl, listingTitle, tokenExpiresAt }) {
  if (!to || !mailerTransporter || !managementEmailFrom) {
    return {
      status: "skipped",
      reason: "missing_mail_config",
    };
  }

  const subject = "Link do edycji Twojego ogłoszenia";
  const expiryInfo = tokenExpiresAt
    ? `Link ważny do: ${new Date(tokenExpiresAt).toLocaleString("pl-PL", { timeZone: "UTC" })} UTC.`
    : "Link nie ma ustawionej daty wygaśnięcia.";
  const text = [
    "Dziękujemy za dodanie ogłoszenia w TwojBazar.",
    "",
    "Publiczny link do ogłoszenia:",
    publicUrl || "(brak linku publicznego)",
    "",
    "To jest Twój prywatny link do zarządzania ogłoszeniem:",
    managementUrl,
    "",
    `Tytuł ogłoszenia: ${listingTitle || "(bez tytułu)"}`,
    expiryInfo,
    "",
    "Zachowaj ten link - tylko on umożliwia edycję, wstrzymanie lub usunięcie ogłoszenia.",
  ].join("\n");

  await mailerTransporter.sendMail({
    from: managementEmailFrom,
    to,
    subject,
    text,
  });

  return {
    status: "sent",
  };
}

function findListingIndexByManagementToken(token) {
  return listings.findIndex((item) => item.managementToken && item.managementToken === token);
}

function validateListingPayload(payload, options = {}) {
  const normalizedListing = normalizeListing(payload);
  const errors = [];

  if (!normalizedListing.title) {
    errors.push("Tytuł jest wymagany.");
  }

  if (!normalizedListing.category) {
    errors.push("Kategoria jest wymagana.");
  }

  if (normalizedListing.price === "" || normalizedListing.price === null) {
    errors.push("Cena jest wymagana.");
  } else if (typeof normalizedListing.price !== "number" || !Number.isFinite(normalizedListing.price)) {
    errors.push("Cena musi być liczbą.");
  }

  if (!normalizedListing.country || !ALLOWED_COUNTRIES.includes(normalizedListing.country)) {
    errors.push("Kraj musi mieć wartość: Szwecja, Norwegia albo Dania.");
  }

  if (!normalizedListing.city) {
    errors.push("Miasto jest wymagane.");
  }

  if (!normalizedListing.description) {
    errors.push("Opis jest wymagany.");
  }

  if (!normalizedListing.contactName) {
    errors.push("Imię kontaktowe jest wymagane.");
  }

  if (!normalizedListing.phone && !normalizedListing.email) {
    errors.push("Podaj telefon albo e-mail kontaktowy.");
  }

  if (normalizedListing.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedListing.email)) {
    errors.push("Adres e-mail ma niepoprawny format.");
  }

  if (normalizedListing.phone && normalizedListing.phone.replace(/[^\d+]/g, "").length < 6) {
    errors.push("Telefon ma niepoprawny format.");
  }

  if (options.requireId !== false && !normalizedListing.id && options.existingId) {
    normalizedListing.id = options.existingId;
  }

  return {
    listing: normalizedListing,
    errors,
  };
}

async function ensureListingsFileExists() {
  await fs.mkdir(uploadsDirPath, { recursive: true });

  try {
    await fs.access(listingsFilePath);
  } catch (error) {
    if (error?.code !== "ENOENT") {
      throw error;
    }

    await fs.writeFile(listingsFilePath, "[]\n", "utf8");
  }
}

async function loadListings() {
  try {
    await ensureListingsFileExists();
    const raw = await fs.readFile(listingsFilePath, "utf8");
    const safeRaw = raw.replace(/^\uFEFF/, "");

    if (!safeRaw.trim()) {
      listings = [];
      await fs.writeFile(listingsFilePath, "[]\n", "utf8");
      return;
    }

    const parsed = JSON.parse(safeRaw);
    listings = Array.isArray(parsed) ? parsed.map(normalizeListing) : [];
  } catch (error) {
    if (error?.code === "ENOENT") {
      listings = [];
      await fs.writeFile(listingsFilePath, "[]\n", "utf8");
      return;
    }

    console.error("[Listings] Failed to load listings file", {
      message: error?.message,
      stack: error?.stack,
    });
    listings = [];

    try {
      const backupPath = path.join(__dirname, `listings.corrupt.${Date.now()}.json`);
      const existingRaw = await fs.readFile(listingsFilePath, "utf8").catch(() => "");

      if (existingRaw) {
        await fs.writeFile(backupPath, existingRaw, "utf8");
      }

      await fs.writeFile(listingsFilePath, "[]\n", "utf8");
    } catch (repairError) {
      console.error("[Listings] Failed to repair listings file", {
        message: repairError?.message,
      });
    }
  }
}

async function saveListings() {
  const snapshot = JSON.stringify(listings.map(normalizeListing), null, 2);

  listingsWriteQueue = listingsWriteQueue.catch(() => undefined).then(async () => {
    try {
      await fs.writeFile(listingsTempFilePath, `${snapshot}\n`, "utf8");
      await fs.rename(listingsTempFilePath, listingsFilePath);
    } catch (error) {
      console.warn("[Listings] Atomic save failed, falling back to direct write", {
        message: error?.message,
      });

      await fs.writeFile(listingsFilePath, `${snapshot}\n`, "utf8");
    }
  });

  return listingsWriteQueue;
}

await loadListings();

app.use((_req, res, next) => {
  res.charset = "utf-8";
  next();
});

app.use((req, res, next) => {
  res.charset = "utf-8";
  next();
});

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "12mb" }));
app.use("/uploads", express.static(uploadsDirPath));
app.use(express.static(__dirname, {
  setHeaders: (res, filePath) => {
    const extension = path.extname(filePath).toLowerCase();
    const textContentTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".txt": "text/plain",
    };

    if (textContentTypes[extension]) {
      res.setHeader("Content-Type", `${textContentTypes[extension]}; charset=utf-8`);
    }
  },
}));

app.get("/", (_req, res) => {
  res.type("text/plain").send("API działa");
});

app.get("/api/listings", (_req, res) => {
  return res.json(
    listings
      .filter((listing) => normalizeStatus(listing.status) === "active")
      .map((listing) => serializePublicListing(res.req, listing))
  );
});

app.get("/api/listings/:id", (req, res) => {
  const listing = listings.find((item) => String(item.id) === String(req.params.id));

  if (!listing || normalizeStatus(listing.status) !== "active") {
    return res.status(404).json({
      error: "Nie znaleziono ogłoszenia.",
    });
  }

  return res.json(serializePublicListing(req, listing));
});

app.post("/api/listings", listingUpload, async (req, res) => {
  try {
    const payload = req.body && typeof req.body === "object" ? { ...req.body } : {};
    const uploadedImages = [
      ...((req.files?.image || []).map((file) => `/uploads/${file.filename}`)),
      ...((req.files?.images || []).map((file) => `/uploads/${file.filename}`)),
    ];

    if (uploadedImages.length) {
      payload.image = uploadedImages[0];
      payload.images = uploadedImages;
    }

    const { listing: normalizedPayload, errors } = validateListingPayload(payload, { requireId: false });

    if (errors.length) {
      return res.status(400).json({
        error: errors[0],
        details: errors,
      });
    }

    const createdAt = new Date().toISOString();
    const managementToken = generateManagementToken();
    const managementTokenCreatedAt = createdAt;
    const managementTokenExpiresAt = getManagementTokenExpiresAt(createdAt);
    const listing = {
      ...normalizedPayload,
      id: randomUUID(),
      createdAt,
      managementToken,
      managementTokenCreatedAt,
      managementTokenExpiresAt,
      status: "active",
    };

    listings.unshift(listing);
    await saveListings();

    const managementUrl = getManagementUrl(req, listing.managementToken);
    let emailDeliveryStatus = { status: "not_requested" };

    if (listing.email) {
      try {
        emailDeliveryStatus = await sendManagementLinkEmail({
          to: listing.email,
          publicUrl: getPublicListingUrl(req, listing.id),
          managementUrl,
          listingTitle: listing.title,
          tokenExpiresAt: listing.managementTokenExpiresAt,
        });
      } catch (emailError) {
        console.error("[Listings] Failed to send management email", {
          listingId: listing.id,
          message: emailError?.message,
        });

        emailDeliveryStatus = {
          status: "failed",
          reason: "send_error",
        };
      }
    }

    console.log("[Listings] Created listing", {
      id: listing.id,
      title: listing.title,
      category: listing.category,
      country: listing.country,
      city: listing.city,
      emailDeliveryStatus: emailDeliveryStatus.status,
    });

    return res.status(201).json({
      ...serializeManagedListing(req, listing),
      emailDeliveryStatus,
    });
  } catch (error) {
    console.error("[Listings] Failed to create listing", {
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Nie udało się zapisać ogłoszenia.",
    });
  }
});

app.get("/api/manage/:token", (req, res) => {
  const token = normalizeString(req.params.token);
  const listing = listings.find((item) => item.managementToken === token);

  if (!listing) {
    return res.status(404).json({
      error: "Nie znaleziono ogłoszenia do zarządzania.",
    });
  }

  if (isManagementTokenExpired(listing)) {
    return res.status(410).json({
      error: "Link do zarządzania ogłoszeniem wygasł.",
    });
  }

  return res.json(serializeManagedListing(req, listing));
});

app.put("/api/manage/:token", listingUpload, async (req, res) => {
  try {
    const token = normalizeString(req.params.token);
    const listingIndex = findListingIndexByManagementToken(token);

    if (listingIndex === -1) {
      return res.status(404).json({
        error: "Nie znaleziono ogłoszenia do edycji.",
      });
    }

    if (isManagementTokenExpired(listings[listingIndex])) {
      return res.status(410).json({
        error: "Link do edycji ogłoszenia wygasł.",
      });
    }

    const existingListing = listings[listingIndex];
    const payload = req.body && typeof req.body === "object" ? { ...req.body } : {};
    const uploadedImages = [
      ...((req.files?.image || []).map((file) => `/uploads/${file.filename}`)),
      ...((req.files?.images || []).map((file) => `/uploads/${file.filename}`)),
    ];
    const shouldClearImages = normalizeBoolean(payload.clearImage);

    if (uploadedImages.length) {
      payload.image = uploadedImages[0];
      payload.images = uploadedImages;
    } else if (shouldClearImages) {
      payload.image = "";
      payload.images = [];
    } else {
      payload.image = existingListing.image;
      payload.images = existingListing.images;
    }

    delete payload.clearImage;

    const { listing: normalizedPayload, errors } = validateListingPayload({
      ...existingListing,
      ...payload,
    }, {
      existingId: existingListing.id,
    });

    if (errors.length) {
      return res.status(400).json({
        error: errors[0],
        details: errors,
      });
    }

    const updatedListing = {
      ...existingListing,
      ...normalizedPayload,
      id: existingListing.id,
      createdAt: existingListing.createdAt,
      managementToken: existingListing.managementToken,
      status: existingListing.status,
    };

    listings[listingIndex] = updatedListing;
    await saveListings();

    return res.json(serializeManagedListing(req, updatedListing));
  } catch (error) {
    console.error("[Listings] Failed to update listing", {
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Nie udało się zaktualizować ogłoszenia.",
    });
  }
});

app.patch("/api/manage/:token/status", async (req, res) => {
  try {
    const token = normalizeString(req.params.token);
    const listingIndex = findListingIndexByManagementToken(token);

    if (listingIndex === -1) {
      return res.status(404).json({
        error: "Nie znaleziono ogłoszenia do zmiany statusu.",
      });
    }

    if (isManagementTokenExpired(listings[listingIndex])) {
      return res.status(410).json({
        error: "Link do zarządzania ogłoszeniem wygasł.",
      });
    }

    const requestedStatus = normalizeString(req.body?.status);
    const allowedStatuses = ["active", "inactive", "deleted"];

    if (!allowedStatuses.includes(requestedStatus)) {
      return res.status(400).json({
        error: "Nieprawidłowy status ogłoszenia.",
        details: ["Dozwolone statusy: active, inactive, deleted."],
      });
    }

    const nextStatus = requestedStatus;
    listings[listingIndex] = {
      ...listings[listingIndex],
      status: nextStatus,
    };

    await saveListings();

    return res.json(serializeManagedListing(req, listings[listingIndex]));
  } catch (error) {
    console.error("[Listings] Failed to update listing status", {
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Nie udało się zmienić statusu ogłoszenia.",
    });
  }
});

app.delete("/api/manage/:token", async (req, res) => {
  try {
    const token = normalizeString(req.params.token);
    const listingIndex = findListingIndexByManagementToken(token);

    if (listingIndex === -1) {
      return res.status(404).json({
        error: "Nie znaleziono ogłoszenia do usunięcia.",
      });
    }

    if (isManagementTokenExpired(listings[listingIndex])) {
      return res.status(410).json({
        error: "Link do zarządzania ogłoszeniem wygasł.",
      });
    }

    listings[listingIndex] = {
      ...listings[listingIndex],
      status: "deleted",
    };
    await saveListings();

    return res.json(serializeManagedListing(req, listings[listingIndex]));
  } catch (error) {
    console.error("[Listings] Failed to delete listing", {
      message: error?.message,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Nie udało się usunąć ogłoszenia.",
    });
  }
});

async function handleGenerateDescription(req, res) {
  try {
    if (!openai) {
      console.error("[AI] Missing OPENAI_API_KEY");

      return res.status(503).json({
        error: "Funkcja AI jest chwilowo niedostępna (brak konfiguracji OPENAI_API_KEY).",
      });
    }

    if (!req.file) {
      console.error("[AI] Missing uploaded image");

      return res.status(400).json({
        error: "Image file is required.",
      });
    }

    if (!req.file.buffer?.length) {
      console.error("[AI] Uploaded file is empty", {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
      });

      return res.status(400).json({
        error: "Uploaded image is empty.",
      });
    }

    console.log("[AI] Received image upload", {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      origin: req.headers.origin || "unknown",
    });

    const base64Image = req.file.buffer.toString("base64");
    const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const response = await openai.responses.create({
      model,
      instructions:
        "Generate realistic marketplace listings in natural, user-friendly Polish. The output must sound like a real classified ad written by a person, not like marketing copy. Keep the description practical, clear and easy to scan. The description must be 3 to 5 sentences long. Do not invent brands, technical specifications, dimensions, defects, accessories, locations, prices or condition details unless they are clearly visible in the image. If something is uncertain, keep the wording general and cautious. Use marketplace-friendly language suitable for classifieds. The category must be exactly one of: Praca dam, Praca szukam, Mieszkanie wynajmę, Mieszkanie szukam, Pokój wynajmę, Pokój szukam, Usługi oferuję, Usługi szukam, Sprzedam, Kupię, Transport, Pomoc / formalności, Poznam ludzi, Inne. If no category clearly fits, use Inne.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Przeanalizuj zdjęcie i wygeneruj dane ogłoszenia po polsku. Tytuł ma być krótki, naturalny i wiarygodny. Kategoria ma być wybrana dokładnie z tej listy: Praca dam, Praca szukam, Mieszkanie wynajmę, Mieszkanie szukam, Pokój wynajmę, Pokój szukam, Usługi oferuję, Usługi szukam, Sprzedam, Kupię, Transport, Pomoc / formalności, Poznam ludzi, Inne. Nie twórz nowych kategorii i nie zmieniaj nazw. Jeśli nic nie pasuje, ustaw Inne. Opis ma mieć od 3 do 5 zdań, brzmieć naturalnie i nadawać się do portalu ogłoszeniowego. Pisz jasno, konkretnie i przyjaźnie dla użytkownika. Nie dopisuj informacji, których nie da się rozsądnie wywnioskować ze zdjęcia. Lista features powinna zawierać krótkie, praktyczne cechy widoczne na zdjęciu lub bardzo ostrożne obserwacje. Zwróć wyłącznie dane zgodne z wymaganym schematem JSON.",
            },
            {
              type: "input_image",
              image_url: imageDataUrl,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "listing_generation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              title: { type: "string" },
              category: { type: "string" },
              description: { type: "string" },
              features: {
                type: "array",
                items: { type: "string" },
              },
            },
            required: ["title", "category", "description", "features"],
          },
        },
      },
    });

    const outputText = response.output_text;

    if (!outputText) {
      console.error("[AI] Missing structured output from OpenAI response");

      return res.status(502).json({
        error: "OpenAI did not return structured output.",
      });
    }

    const parsed = JSON.parse(outputText);

    return res.json({
      title: parsed.title || "",
      category: normalizeCategory(parsed.category),
      description: parsed.description || "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
    });
  } catch (error) {
    const errorMessage =
      error?.message ||
      error?.error?.message ||
      error?.cause?.message ||
      "Failed to generate listing data from image.";

    console.error("[AI] Image generation endpoint error", {
      message: errorMessage,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: errorMessage,
    });
  }
}

async function handleModerateListing(req, res) {
  try {
    if (!openai) {
      console.error("[Moderation] Missing OPENAI_API_KEY");

      return res.json({
        label: "allowed",
        allowed: true,
        skipped: true,
        reason: "missing_openai_api_key",
      });
    }

    const title = normalizeString(req.body?.title);
    const description = normalizeString(req.body?.description);

    if (!title && !description) {
      return res.status(400).json({
        error: "Title or description is required.",
      });
    }

    const response = await openai.responses.create({
      model,
      instructions:
        "Classify marketplace listing content. Return one label only using the required schema: allowed, spam, scam, adult, unsafe. Use allowed only when the content looks acceptable for a normal classifieds website. Mark spam for repetitive promotional junk or nonsense. Mark scam for fraud-like offers, deception, unrealistic promises, fake payment or suspicious financial behavior. Mark adult for sexual services, explicit erotic content or adult solicitation. Mark unsafe for illegal goods, violence, dangerous items, self-harm, hate or other unsafe content.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `Tytuł: ${title}\nOpis: ${description}`,
            },
          ],
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "listing_moderation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              label: {
                type: "string",
                enum: ["allowed", "spam", "scam", "adult", "unsafe"],
              },
            },
            required: ["label"],
          },
        },
      },
    });

    const outputText = response.output_text;

    if (!outputText) {
      console.error("[Moderation] Missing structured output from OpenAI response");

      return res.status(502).json({
        error: "OpenAI did not return moderation output.",
      });
    }

    const parsed = JSON.parse(outputText);
    const label = parsed.label || "unsafe";

    return res.json({
      label,
      allowed: label === "allowed",
    });
  } catch (error) {
    const errorMessage =
      error?.message ||
      error?.error?.message ||
      error?.cause?.message ||
      "Failed to moderate listing content.";

    console.error("[Moderation] Listing moderation error", {
      message: errorMessage,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: errorMessage,
    });
  }
}

app.post("/api/generate-description", aiUpload.single("image"), handleGenerateDescription);
app.post("/api/listings/generate-from-image", aiUpload.single("image"), handleGenerateDescription);
app.post("/api/moderate-listing", handleModerateListing);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    console.error("[Upload] Multer error", {
      code: error.code,
      message: error.message,
    });

    return res.status(400).json({
      error: "Nie udało się przetworzyć przesłanego pliku.",
      details: [error.message],
    });
  }

  if (error?.message === "Only image uploads are allowed.") {
    console.error("[Upload] Invalid file type", {
      message: error.message,
    });

    return res.status(400).json({
      error: error.message,
    });
  }

  if (error instanceof SyntaxError && "body" in (error || {})) {
    console.error("[Request] Invalid JSON payload", {
      message: error.message,
    });

    return res.status(400).json({
      error: "Nieprawidłowy format danych JSON.",
    });
  }

  console.error("[Server] Unhandled server error", {
    message: error?.message,
    stack: error?.stack,
  });

  return res.status(500).json({
    error: "Wystąpił nieoczekiwany błąd serwera.",
  });
});

app.listen(port, () => {
  console.log(`TwojBazar server running on port ${port}`);
});







