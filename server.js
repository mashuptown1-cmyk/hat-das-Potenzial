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
Du bist ein Analysesystem für Geschäftsideen.
Bewerte die folgende Idee mit Zahlen von 1 bis 10 und einem kurzen Fazit.

Gib deine Antwort IMMER als gültiges JSON im folgenden Format zurück:

{
  "market": Zahl von 1 bis 10,
  "competition": Zahl von 1 bis 10,
  "scalability": Zahl von 1 bis 10,
  "risk": Zahl von 1 bis 10,
  "capital": Zahl von 1 bis 10,
  "totalScore": Zahl von 1 bis 10,
  "summary": "kurzer deutscher Text als Fazit"
}

Antwort NUR mit JSON, ohne Erklärung, ohne weiteren Text.

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

    const raw = response.data.output[0].content[0].text?.trim();
    let parsed;

    try {
      parsed = JSON.parse(raw);
    } catch (e) {
      console.error("Konnte JSON nicht parsen:", raw);
      return res.status(500).json({
        error: "Antwort der KI war kein gültiges JSON.",
        raw: raw
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
