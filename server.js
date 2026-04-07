import "dotenv/config";
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = Number(process.env.PORT || 3000);
const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

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

app.use(express.json());
app.use(express.static(__dirname));

app.post("/api/listings/generate-from-image", upload.single("image"), async (req, res) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(500).json({
        error: "Server is missing OPENAI_API_KEY.",
      });
    }

    if (!req.file) {
      return res.status(400).json({
        error: "Image file is required.",
      });
    }

    const base64Image = req.file.buffer.toString("base64");
    const imageDataUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const response = await openai.responses.create({
      model,
      instructions:
        "You generate listing suggestions for a marketplace. Return concise, realistic Polish copy. Prefer practical categories commonly used in classified listings.",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text:
                "Analyze this image and generate marketplace listing data in Polish. Return only structured data matching the required schema.",
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
              title: {
                type: "string",
              },
              category: {
                type: "string",
              },
              description: {
                type: "string",
              },
              features: {
                type: "array",
                items: {
                  type: "string",
                },
              },
            },
            required: ["title", "category", "description", "features"],
          },
        },
      },
    });

    const outputText = response.output_text;

    if (!outputText) {
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
    console.error("Image generation endpoint error:", error);

    return res.status(500).json({
      error: "Failed to generate listing data from image.",
    });
  }
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    return res.status(400).json({
      error: error.message,
    });
  }

  if (error?.message === "Only image uploads are allowed.") {
    return res.status(400).json({
      error: error.message,
    });
  }

  console.error("Unhandled server error:", error);

  return res.status(500).json({
    error: "Unexpected server error.",
  });
});

app.listen(port, () => {
  console.log(`TwojBazar server running at http://localhost:${port}`);
});
