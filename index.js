// ================== Imports ==================
const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const dotenv = require("dotenv");
const path=require('path')

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

// ================== Create Job (POST) ==================
app.post("/api/jobs", async (req, res) => {
  try {
    const job = new Job(req.body);
    await job.save();
    res.status(201).json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================== Get All Jobs (GET) ==================
app.get("/api/jobs", async (req, res) => {
  try {
    const jobs = await Job.find().sort({ postedAt: -1 });
    res.json(jobs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ================== Get Single Job by ID (GET) ==================
app.get("/api/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================== Update Job (PUT) ==================
app.put("/api/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json(job);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// ================== Delete Job (DELETE) ==================
app.delete("/api/jobs/:id", async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });
    res.json({ message: "✅ Job deleted successfully" });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});


// ================== Serve React Frontend ==================
app.use(express.static(path.join(__dirname, "client", "build")));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// ================== Root ==================
app.get("/", (req, res) => {
  res.send("✅ FreshersJobs Backend is running...");
});

// ================== Start Server ==================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () =>
  console.log(`🚀 Server running on http://localhost:${PORT}`)
);
