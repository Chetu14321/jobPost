import { useState } from "react";
import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

export default function JobForm() {
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    description: "",
    location: "",
    isWFH: false,
    tags: "",
    applyUrl: "",
    type: "job",
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const jobData = {
      ...formData,
      tags: formData.tags.split(",").map((tag) => tag.trim()),
    };

    try {
      const res = await axios.post("http://localhost:5000/api/jobs", jobData);
      alert("✅ Job posted successfully!");
      console.log(res.data);

      setFormData({
        title: "",
        company: "",
        description: "",
        location: "",
        isWFH: false,
        tags: "",
        applyUrl: "",
        type: "job",
      });
    } catch (err) {
      console.error(err);
      alert("❌ Failed to post job");
    }
  };

  return (
    <div className="container mt-5">
      <div className="card shadow-lg p-4 border-0 rounded-4">
        <h2 className="mb-4 text-center fw-bold text-primary">
          🚀 Post a Job
        </h2>
        <form onSubmit={handleSubmit}>
          {/* Job Title */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Job Title</label>
            <input
              type="text"
              name="title"
              className="form-control"
              placeholder="e.g. Frontend Developer"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>

          {/* Company */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Company</label>
            <input
              type="text"
              name="company"
              className="form-control"
              placeholder="e.g. Google"
              value={formData.company}
              onChange={handleChange}
              required
            />
          </div>

          {/* Description */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Job Description</label>
            <div className="border rounded p-2">
              <CKEditor
                editor={ClassicEditor}
                data={formData.description}
                onChange={(event, editor) => {
                  const data = editor.getData();
                  setFormData({ ...formData, description: data });
                }}
              />
            </div>
          </div>

          {/* Location */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Location</label>
            <input
              type="text"
              name="location"
              className="form-control"
              placeholder="e.g. Bangalore, India"
              value={formData.location}
              onChange={handleChange}
              required
            />
          </div>

          {/* Remote */}
          <div className="form-check mb-3">
            <input
              type="checkbox"
              name="isWFH"
              className="form-check-input"
              id="remoteCheck"
              checked={formData.isWFH}
              onChange={handleChange}
            />
            <label className="form-check-label" htmlFor="remoteCheck">
              Remote (Work From Home)
            </label>
          </div>

          {/* Tags */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Tags</label>
            <input
              type="text"
              name="tags"
              className="form-control"
              placeholder="e.g. React, Node.js, MongoDB"
              value={formData.tags}
              onChange={handleChange}
            />
            <small className="text-muted">
              Enter tags separated by commas
            </small>
          </div>

          {/* Apply URL */}
          <div className="mb-3">
            <label className="form-label fw-semibold">Apply URL</label>
            <input
              type="url"
              name="applyUrl"
              className="form-control"
              placeholder="https://apply.here"
              value={formData.applyUrl}
              onChange={handleChange}
              required
            />
          </div>

          {/* Job Type */}
          <div className="mb-4">
            <label className="form-label fw-semibold">Job Type</label>
            <select
              name="type"
              className="form-select"
              value={formData.type}
              onChange={handleChange}
            >
              <option value="job">Job</option>
              <option value="internship">Internship</option>
            </select>
          </div>

          {/* Submit */}
          <div className="text-center">
            <button type="submit" className="btn btn-primary px-5 py-2 rounded-3">
              ✅ Post Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
