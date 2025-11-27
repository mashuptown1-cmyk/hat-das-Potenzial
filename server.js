import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_KEY;

app.post("/bewerten", async (req, res) => {
  const idee = req.body.text;

  try {
    const response = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: "gpt-4.1-mini",
        input: `
Antworte *nur* mit gültigem JSON. Kein Kommentar, keine Erklärung, kein Text davor oder danach.

Erzeuge ein JSON in *exakt* diesem Format:

{
  "market": 0,
  "competition": 0,
  "scalability": 0,
  "risk": 0,
  "capital": 0,
  "totalScore": 0,
  "summary": "Text"
}

Alle Werte 0–10 (ganze Zahlen).
"summary" nur 1–3 Sätze, deutsch.

Geschäftsidee:
${idee}
`
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    let raw = response.data.output[0].content[0].text || "";
    raw = raw.trim();

    // 1. ```json und ``` entfernen
    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // 2. Nur den Teil zwischen erstem { und letztem } nehmen
    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");

    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
      console.error("Kein gültiger JSON-Block gefunden:", cleaned);
      return res.status(500).json({
        error: "Antwort der KI war kein gültiges JSON (kein JSON-Block gefunden).",
        raw: cleaned
      });
    }

    const jsonString = cleaned.slice(firstBrace, lastBrace + 1);

    let parsed;
    try {
      parsed = JSON.parse(jsonString);
    } catch (e) {
      console.error("Konnte JSON nicht parsen:", jsonString);
      return res.status(500).json({
        error: "Antwort der KI war kein gültiges JSON (Parse-Fehler).",
        raw: jsonString
      });
    }

    return res.json({ result: parsed });

  } catch (err) {
    console.error(err.response?.data || err.message);

    return res.status(500).json({
      error:
        err?.response?.data?.error?.message ||
        err.message ||
        "Unbekannter Fehler"
    });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server läuft auf Port " + PORT));
