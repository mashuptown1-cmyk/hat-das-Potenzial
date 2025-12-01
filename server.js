import express from "express";
import cors from "cors";
import axios from "axios";

const app = express();
app.use(cors());
app.use(express.json());

const OPENAI_API_KEY = process.env.OPENAI_KEY; // env-Variable auf Render: OPENAI_KEY

app.post("/bewerten", async (req, res) => {
  const { text: idee, mode } = req.body;
  const selectedMode = mode === "pickup" ? "pickup" : "business";

  if (!idee || typeof idee !== "string") {
    return res.status(400).json({ error: "Kein Text übergeben." });
  }

  try {
    // Prompt je nach Modus
    let prompt;

    if (selectedMode === "pickup") {
      // 🥂 Modus: Anmachsprüche
      prompt = `
Antworte nur mit gültigem JSON. Kein Kommentar, keine Erklärung, kein Text davor oder danach.

Erzeuge ein JSON in exakt diesem Format:

{
  "humor": 0,
  "humorReason": "Text",
  "originality": 0,
  "originalityReason": "Text",
  "cringe": 0,
  "cringeReason": "Text",
  "successChance": 0,
  "successChanceReason": "Text",
  "totalScore": 0,
  "summary": "Text"
}

Bedeutung:
- Alle Zahlen sind ganze Zahlen zwischen 0 und 10.
- "totalScore" ist die Summe von humor + originality + cringe + successChance (also 0–40).
- "summary" ist ein kurzes Fazit (1–3 Sätze, auf Deutsch).
- In den *Reason*-Feldern kurz und knackig erklären, warum du den Wert vergeben hast (Deutsch).
- "cringe" darf auch hoch sein, wenn der Spruch sehr unangenehm ist.
- Nur den Anmachspruch bewerten, keine Moralpredigt.

Anmachspruch:
${idee}
      `;
    } else {
      // 💼 Modus: Geschäftsidee (wie bisher)
      prompt = `
Antworte nur mit gültigem JSON. Kein Kommentar, keine Erklärung, kein Text davor oder danach.

Erzeuge ein JSON in exakt diesem Format:

{
  "market": 0,
  "marketReason": "Text",
  "competition": 0,
  "competitionReason": "Text",
  "scalability": 0,
  "scalabilityReason": "Text",
  "capital": 0,
  "capitalReason": "Text",
  "totalScore": 0,
  "summary": "Text"
}

Bedeutung:
- Alle Zahlen sind ganze Zahlen zwischen 0 und 10.
- "totalScore" ist die Summe von market + competition + scalability + capital (also 0–40).
- "summary" ist ein kurzes Fazit (1–3 Sätze, auf Deutsch).
- In den *Reason*-Feldern kurz und knackig erklären, warum du den Wert vergeben hast (Deutsch).
- Risiko soll nur in den Begründungen / im summary berücksichtigt werden, aber **keinen eigenen Zahlenwert bekommen**.

Geschäftsidee:
${idee}
      `;
    }

    const response = await axios.post(
      "https://api.openai.com/v1/responses",
      {
        model: "gpt-4.1-mini",
        input: prompt
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
          "Content-Type": "application/json"
        },
      }
    );

    const output = response.data?.output?.[0]?.content?.[0]?.text;

    if (!output) {
      console.error("Unerwartete OpenAI-Response:", response.data);
      return res.status(500).json({
        error: "Antwort der KI war leer oder im unerwarteten Format.",
        raw: response.data
      });
    }

    let raw = output.trim();

    // ```json und ``` entfernen
    let cleaned = raw
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();

    // Nur den Teil zwischen erstem { und letztem } nehmen
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
