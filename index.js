// index.js (updated)
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const pdfParse = require("pdf-parse");
const { IncomingForm } = require("formidable");
const { GoogleGenerativeAI } = require("@google/generative-ai");
const PDFDocument = require("pdfkit");

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ================== MongoDB Connection ==================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("✅ MongoDB Connected"))
  .catch((err) => console.log(err));

// ================== Job Schema ==================
const jobSchema = new mongoose.Schema({
  title: String,
  company: String,
  description: String,
  location: String,
  isWFH: Boolean,
  tags: [String],
  applyUrl: String,
  type: {
    type: String,
    enum: ["job", "internship"],
    default: "job",
  },
  postedAt: { type: Date, default: Date.now },
});
const Job = mongoose.model("Job", jobSchema);

// ================== API Routes ==================
app.get("/api/jobs", async (req, res) => {
  const jobs = await Job.find().sort({ postedAt: -1 });
  res.json(jobs);
});

app.post("/api/jobs", async (req, res) => {
  const newJob = new Job(req.body);
  await newJob.save();
  res.json(newJob);
});

app.get("/api/jobs/:id", async (req, res) => {
  const job = await Job.findById(req.params.id);
  res.json(job);
});

app.post("/api/resume-checker", (req, res) => {
  const form = new IncomingForm({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error("File upload parse error:", err);
      return res.status(500).json({ error: "File upload failed" });
    }

    const jobDesc = fields.jobDesc || "";
    let resumeText = "";

    try {
      if (files.resume) {
        const filePath = files.resume.filepath || files.resume[0]?.filepath;
        if (!filePath) throw new Error("Resume file not found");

        const buffer = fs.readFileSync(filePath);
        const pdfData = await pdfParse(buffer);
        resumeText = pdfData.text;
      }

      if (!process.env.GEMINI_API_KEY) {
        console.error("GEMINI_API_KEY is not set.");
        return res.status(500).json({ error: "AI provider not configured" });
      }

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

      const prompt = `
        You are an ATS (Applicant Tracking System) expert.
        Analyze this resume for ATS-friendliness compared to the given job description.

        Resume: ${resumeText}
        Job Description: ${jobDesc}

        Respond ONLY with valid JSON in the following format:
        {
          "ats_score": number (0-100),
          "ats_friendliness": "Excellent | Good | Average | Poor",
          "strengths": [list of strengths],
          "weaknesses": [list of weaknesses],
          "recommendations": [list of actionable recommendations]
        }
      `;

      const result = await model.generateContent(prompt);
      // result.response.text() (your previous usage). keep same approach:
      const text = result.response && typeof result.response.text === "function"
        ? result.response.text()
        : result.response?.text || "";

      const jsonMatch = text.match(/\{[\s\S]*\}/);
      let feedback;

      if (jsonMatch) {
        try {
          feedback = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          console.error("JSON parse error from AI response:", parseErr);
          feedback = {
            ats_score: 0,
            ats_friendliness: "Poor",
            strengths: [],
            weaknesses: ["AI returned invalid JSON"],
            recommendations: [],
          };
        }
      } else {
        feedback = {
          ats_score: 0,
          ats_friendliness: "Poor",
          strengths: [],
          weaknesses: ["AI did not return JSON"],
          recommendations: [],
        };
      }

      res.json(feedback);
    } catch (error) {
      console.error("Resume checker error:", error);
      console.error("Gemini API Error:", error.message || error);
      res.status(500).json({ error: "AI request failed", details: error.message });
    }
  });
});

// ================== NEW: Chat endpoint (for the floating chatbox) ==================
// POST /api/chat
// Body: { message: string, history?: [{ role: "user"|"assistant", content: string }] }
// Returns: { reply: string }
app.post("/api/chat", async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message && !(Array.isArray(history) && history.length)) {
      return res.status(400).json({ error: "message is required" });
    }

    if (!process.env.GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not set.");
      return res.status(500).json({ error: "AI provider not configured" });
    }

    // construct a simple prompt that includes optional history
    let prompt = "";
    if (Array.isArray(history) && history.length) {
      prompt += history
        .map((h) => {
          const role = h.role === "user" ? "User" : "Assistant";
          return `${role}: ${h.content}`;
        })
        .join("\n");
      if (message) prompt += `\nUser: ${message}\nAssistant:`;
    } else {
      prompt = `User: ${message}\nAssistant:`;
    }

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    const result = await model.generateContent(prompt);

    const reply =
      result.response && typeof result.response.text === "function"
        ? result.response.text()
        : result.response?.text || "";

    res.json({ reply });
  } catch (error) {
    console.error("Gemini API Error (chat):", error);
    // send limited details to client; full stack in server logs
    res.status(500).json({ error: "AI request failed", details: error.message });
  }
});

// ================== Serve React Frontend ==================
// Serve static files from React build
app.use(express.static(path.join(__dirname, "client", "build")));

// Fallback route for React (must come after API routes)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// ================== Start Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on http://localhost:${PORT}`));
