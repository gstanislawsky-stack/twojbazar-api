import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const listingsFilePath = path.join(__dirname, "listings.json");
let listings = [];

const allowedOrigins = new Set([
  "https://twojbazar.com",
  "http://twojbazar.com",
  "https://www.twojbazar.com",
  "http://www.twojbazar.com",
]);

if (!process.env.OPENAI_API_KEY) {
  console.warn("Missing OPENAI_API_KEY. The AI endpoint will return an error until it is configured.");
}

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    if (!file.mimetype.startsWith("image/")) {
      callback(new Error("Only image uploads are allowed."));
      return;
    }

    callback(null, true);
  },
});

function normalizeString(value) {
  return typeof value === "string" ? value.trim() : "";
}

async function loadListings() {
  try {
    const raw = await fs.readFile(listingsFilePath, "utf8");
    const parsed = JSON.parse(raw);
    listings = Array.isArray(parsed) ? parsed : [];
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
  }
}

async function saveListings() {
  await fs.writeFile(listingsFilePath, `${JSON.stringify(listings, null, 2)}\n`, "utf8");
}

await loadListings();

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
  }

  res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.sendStatus(204);
  }

  next();
});

app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));

app.get("/", (_req, res) => {
  res.type("text/plain").send("API działa");
});

app.get("/api/listings", (_req, res) => {
  return res.json(listings);
});

app.get("/api/listings/:id", (req, res) => {
  const listing = listings.find((item) => String(item.id) === String(req.params.id));

  if (!listing) {
    return res.status(404).json({
      error: "Nie znaleziono ogłoszenia.",
    });
  }

  return res.json(listing);
});

app.post("/api/listings", async (req, res) => {
  const payload = req.body && typeof req.body === "object" ? req.body : {};
  const listing = {
    id: Date.now(),
    title: normalizeString(payload.title),
    category: normalizeString(payload.category),
    price: typeof payload.price === "string" ? payload.price.trim() : String(payload.price || "").trim(),
    currency: normalizeString(payload.currency),
    country: normalizeString(payload.country),
    city: normalizeString(payload.city),
    description: normalizeString(payload.description),
    contactName: normalizeString(payload.contactName),
    phone: normalizeString(payload.phone),
    email: normalizeString(payload.email),
    showPhone: Boolean(payload.showPhone),
    showEmail: Boolean(payload.showEmail),
    image: typeof payload.image === "string" ? payload.image : "",
    images: Array.isArray(payload.images) ? payload.images.filter((item) => typeof item === "string" && item) : [],
    createdAt: new Date().toISOString(),
  };

  if (!listing.title || !listing.category || !listing.country || !listing.city || !listing.description) {
    return res.status(400).json({
      error: "Brakuje wymaganych pól ogłoszenia.",
    });
  }

  listings.unshift(listing);
  await saveListings();

  console.log("[Listings] Created listing", {
    id: listing.id,
    title: listing.title,
    category: listing.category,
    country: listing.country,
    city: listing.city,
  });

  return res.status(201).json(listing);
});

async function handleGenerateDescription(req, res) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[AI] Missing OPENAI_API_KEY");

      return res.status(500).json({
        error: "Server is missing OPENAI_API_KEY.",
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
        "Generate realistic marketplace listings in natural, user-friendly Polish. The output must sound like a real classified ad written by a person, not like marketing copy. Keep the description practical, clear and easy to scan. The description must be 3 to 5 sentences long. Do not invent brands, technical specifications, dimensions, defects, accessories, locations, prices or condition details unless they are clearly visible in the image. If something is uncertain, keep the wording general and cautious. Use marketplace-friendly language suitable for classifieds. The category must be one of: Praca, Mieszkania, Usługi, Sprzedam, Kupię, Transport.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Przeanalizuj zdjęcie i wygeneruj dane ogłoszenia po polsku. Tytuł ma być krótki, naturalny i wiarygodny. Kategoria ma być realistycznie dobrana z listy: Praca, Mieszkania, Usługi, Sprzedam, Kupię, Transport. Opis ma mieć od 3 do 5 zdań, brzmieć naturalnie i nadawać się do portalu ogłoszeniowego. Pisz jasno, konkretnie i przyjaźnie dla użytkownika. Nie dopisuj informacji, których nie da się rozsądnie wywnioskować ze zdjęcia. Lista features powinna zawierać krótkie, praktyczne cechy widoczne na zdjęciu lub bardzo ostrożne obserwacje. Zwróć wyłącznie dane zgodne z wymaganym schematem JSON.",
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
      category: parsed.category || "",
      description: parsed.description || "",
      features: Array.isArray(parsed.features) ? parsed.features : [],
    });
  } catch (error) {
    console.error("[AI] Image generation endpoint error", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Failed to generate listing data from image.",
    });
  }
}

async function handleModerateListing(req, res) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      console.error("[Moderation] Missing OPENAI_API_KEY");

      return res.status(500).json({
        error: "Server is missing OPENAI_API_KEY.",
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
    console.error("[Moderation] Listing moderation error", {
      message: error?.message,
      status: error?.status,
      code: error?.code,
      stack: error?.stack,
    });

    return res.status(500).json({
      error: "Failed to moderate listing content.",
    });
  }
}

app.post("/api/generate-description", upload.single("image"), handleGenerateDescription);
app.post("/api/listings/generate-from-image", upload.single("image"), handleGenerateDescription);
app.post("/api/moderate-listing", handleModerateListing);

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    console.error("[Upload] Multer error", {
      code: error.code,
      message: error.message,
    });

    return res.status(400).json({
      error: error.message,
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

  console.error("[Server] Unhandled server error", {
    message: error?.message,
    stack: error?.stack,
  });

  return res.status(500).json({
    error: "Unexpected server error.",
  });
});

app.listen(port, () => {
  console.log(`TwojBazar server running on port ${port}`);
});
