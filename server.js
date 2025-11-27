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
} catch (err) {
  console.error(err.response?.data || err.message);

  return res.status(500).json({
    error: err?.response?.data?.error?.message || err.message || "Unbekannter Fehler"
  });
}


const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("Server läuft auf Port " + PORT));

