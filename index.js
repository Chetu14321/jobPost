// ================== Imports ==================
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
const nodemailer = require("nodemailer");
const cron = require("node-cron");

dotenv.config();
console.log("EMAIL_USER:", process.env.MAIL_USER);
console.log("EMAIL_PASS:", process.env.MAIL_PASS ? "Loaded ✅" : "❌ Missing");

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
  title: { type: String, required: true },
  company: { type: String, required: true },
  img: String,
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

  // NEW structured fields for table display
  role: String,             // Job Role
  qualification: String,    // B.E/B.Tech/M.E/M.Tech/M.Sc/MCA
  batch: String,            // Eligible batches
  experience: String,       // e.g., Freshers / 1-2 years
  salary: String,           // Salary / CTC
  lastDate: Date,           // Last date to apply
});

const Job = mongoose.model("Job", jobSchema);


// ================== Subscriber Schema ==================
const subscriberSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  subscribedAt: { type: Date, default: Date.now },
});
const Subscriber = mongoose.model("Subscriber", subscriberSchema);

// ================== Email Transporter ==================
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

// verify transporter
transporter.verify((error, success) => {
  if (error) {
    console.error("❌ SMTP Error:", error);
  } else {
    console.log("✅ SMTP Server is ready to send messages");
  }
});


// ================== API Routes ==================
// Jobs
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

// Subscribe
app.post("/api/subscribe", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }

    // Check if already subscribed
    const existing = await Subscriber.findOne({ email });
    if (existing) {
      return res.status(400).json({ error: "Already subscribed" });
    }

    // Save subscriber
    const subscriber = new Subscriber({ email });
    await subscriber.save();

    // Send confirmation email
    await transporter.sendMail({
      // from: `"Freshers Jobs" <${process.env.MAIL_USER}>`,
      from: `"Freshers Jobs" <${process.env.MAIL_USER}>`,
      to: email,
      subject: "🎉 Subscription Confirmed - Freshers Jobs Updates",
      html: `
        <h2>Welcome to FreshersJobs.shop 🚀</h2>
        <p>Hi there 👋,</p>
        <p>Thanks for subscribing! 🎯</p>
        <p>You’ll now receive <b>daily job updates</b> (last 24 hours) directly in your inbox.</p>
        <br/>
        <p>👉 Stay tuned for the latest <b>Freshers Jobs & Internships</b>.</p>
        <br/>
        <p style="font-size:12px;color:gray;">
          If this wasn’t you, you can ignore this email.
        </p>
      `,
    });

    res.json({ message: "✅ Subscribed successfully! Confirmation email sent." });
  } catch (err) {
    console.error("Subscribe error:", err);
    res.status(500).json({ error: "Failed to subscribe" });
  }
});


// Resume Checker
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
      const text =
        result.response && typeof result.response.text === "function"
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
      res
        .status(500)
        .json({ error: "AI request failed", details: error.message });
    }
  });
});

// Chat endpoint
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
    res
      .status(500)
      .json({ error: "AI request failed", details: error.message });
  }
});

// ================== Cron Job (Daily Job Emails) ==================
cron.schedule("25 10 * * *", async () => {
  try {
    const since = new Date();
    since.setDate(since.getDate() - 1);

    const jobs = await Job.find({ postedAt: { $gte: since } }).sort({
      postedAt: -1,
    });
    if (jobs.length === 0) {
      console.log("No new jobs in last 24h.");
      return;
    }

    const subscribers = await Subscriber.find();

    const jobListHtml = jobs
      .map(
        (job) =>
          `<li><a href="${job.applyUrl}">${job.title} at ${job.company}</a> (${job.location})</li>`
      )
      .join("");

    for (let sub of subscribers) {
      await transporter.sendMail({
        from: `"Freshers Jobs" <${process.env.MAIL_USER}>`,
        to: sub.email,
        subject: "🔥 Daily Freshers Jobs Updates",
        html: `
          <h3>Latest Jobs (Last 24 Hours)</h3>
          <ul>${jobListHtml}</ul>
          <p>Visit <a href="https://freshersjobs.shop">freshersjobs.shop</a> for more.</p>
        `,
      });
    }

    console.log(`📧 Sent job updates to ${subscribers.length} subscribers`);
  } catch (err) {
    console.error("Cron job error:", err);
  }
});

// ================== Serve React Frontend ==================
// app.use(express.static(path.join(__dirname, "client", "build")));

// app.get("*", (req, res) => {
//   res.sendFile(path.join(__dirname, "client", "build", "index.html"));
// });
app.get("/", (req, res) => {
  res.send("✅ FreshersJobs Backend is running...");
});


// ================== Start Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
