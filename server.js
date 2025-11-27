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
        input: `Bewerte diese Geschäftsidee: ${idee}`
      },
      {
        headers: {
          Authorization: `Bearer ${OPENAI_API_KEY}`,
        },
      }
    );

    res.json(response.data.output[0].content[0].text);
  } catch {
    res.status(500).json({ error: "API Fehler" });
  }
});

app.listen(10000, () => console.log("Server läuft"));
