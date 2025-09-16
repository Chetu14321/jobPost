import { useEffect, useState } from "react";
import axios from "axios";
import { CKEditor } from "@ckeditor/ckeditor5-react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";

export default function JobManager() {
  const [jobs, setJobs] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    company: "",
    img: "",
    description: "",
    location: "",
    isWFH: false,
    tags: "",
    applyUrl: "",
    type: "job",
    role: "",
    qualification: "",
    batch: "",
    experience: "",
    salary: "",
    lastDate: "",
  });
  const [editingJob, setEditingJob] = useState(null);

  // Fetch all jobs
  const fetchJobs = async () => {
    try {
      const res = await axios.get("/api/jobs");
      setJobs(res.data);
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    fetchJobs();
  }, []);

  // Handle input
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  // Submit form (Add / Edit)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingJob) {
        // Update
        await axios.put(`/api/jobs/${editingJob._id}`, {
          ...formData,
          tags: formData.tags.split(",").map((t) => t.trim()),
        });
      } else {
        // Create
        await axios.post("/api/jobs", {
          ...formData,
          tags: formData.tags.split(",").map((t) => t.trim()),
        });
      }
      fetchJobs();
      resetForm();
    } catch (error) {
      console.error(error);
    }
  };

  // Edit job (prefill form)
  const handleEdit = (job) => {
    setEditingJob(job);
    setFormData({
      ...job,
      tags: job.tags?.join(", ") || "",
      lastDate: job.lastDate ? job.lastDate.split("T")[0] : "",
    });
  };

  // Delete job
  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this job?")) {
      try {
        await axios.delete(`/api/jobs/${id}`);
        fetchJobs();
      } catch (error) {
        console.error(error);
      }
    }
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      title: "",
      company: "",
      img: "",
      description: "",
      location: "",
      isWFH: false,
      tags: "",
      applyUrl: "",
      type: "job",
      role: "",
      qualification: "",
      batch: "",
      experience: "",
      salary: "",
      lastDate: "",
    });
    setEditingJob(null);
  };

  return (
    <div className="container my-5">
      <h2 className="mb-4">{editingJob ? "✏️ Edit Job" : "➕ Add Job"}</h2>

      {/* Job Form */}
      <form onSubmit={handleSubmit} className="mb-5">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Job Title</label>
            <input
              type="text"
              name="title"
              className="form-control"
              value={formData.title}
              onChange={handleChange}
              required
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Company</label>
            <input
              type="text"
              name="company"
              className="form-control"
              value={formData.company}
              onChange={handleChange}
              required
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Company Logo URL</label>
            <input
              type="url"
              name="img"
              className="form-control"
              value={formData.img}
              onChange={handleChange}
            />
            {formData.img && (
              <img
                src={formData.img}
                alt="logo"
                style={{ height: "40px", marginTop: "5px" }}
              />
            )}
          </div>

          <div className="col-md-6">
            <label className="form-label">Location</label>
            <input
              type="text"
              name="location"
              className="form-control"
              value={formData.location}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-12">
            <label className="form-label">Description</label>
            <CKEditor
              editor={ClassicEditor}
              data={formData.description}
              onChange={(event, editor) => {
                const data = editor.getData();
                setFormData({ ...formData, description: data });
              }}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Tags (comma separated)</label>
            <input
              type="text"
              name="tags"
              className="form-control"
              value={formData.tags}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Apply URL</label>
            <input
              type="url"
              name="applyUrl"
              className="form-control"
              value={formData.applyUrl}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-4">
            <label className="form-label">Type</label>
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
          <div className="col-md-4">
            <label className="form-label">Experience</label>
            <input
              type="text"
              name="experience"
              className="form-control"
              value={formData.experience}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-4">
            <label className="form-label">Salary</label>
            <input
              type="text"
              name="salary"
              className="form-control"
              value={formData.salary}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Qualification</label>
            <input
              type="text"
              name="qualification"
              className="form-control"
              value={formData.qualification}
              onChange={handleChange}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Batch</label>
            <input
              type="text"
              name="batch"
              className="form-control"
              value={formData.batch}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6">
            <label className="form-label">Last Date</label>
            <input
              type="date"
              name="lastDate"
              className="form-control"
              value={formData.lastDate}
              onChange={handleChange}
            />
          </div>

          <div className="col-md-6 d-flex align-items-center">
            <div className="form-check mt-4">
              <input
                type="checkbox"
                name="isWFH"
                className="form-check-input"
                checked={formData.isWFH}
                onChange={handleChange}
              />
              <label className="form-check-label">Work From Home</label>
            </div>
          </div>
        </div>

        <div className="mt-4">
          <button type="submit" className="btn btn-primary me-2">
            {editingJob ? "Update Job" : "Add Job"}
          </button>
          {editingJob && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={resetForm}
            >
              Cancel
            </button>
          )}
        </div>
      </form>

      {/* Job List */}
      <h3>📋 Job List</h3>
      <table className="table table-bordered mt-3">
        <thead className="table-light">
          <tr>
            <th>Logo</th>
            <th>Title</th>
            <th>Company</th>
            <th>Location</th>
            <th>Type</th>
            <th>Salary</th>
            <th>Last Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr key={job._id}>
              <td>
                {job.img && (
                  <img
                    src={job.img}
                    alt="logo"
                    style={{ height: "30px", borderRadius: "4px" }}
                  />
                )}
              </td>
              <td>{job.title}</td>
              <td>{job.company}</td>
              <td>{job.location}</td>
              <td>{job.type}</td>
              <td>{job.salary}</td>
              <td>
                {job.lastDate
                  ? new Date(job.lastDate).toLocaleDateString()
                  : "—"}
              </td>
              <td>
                <button
                  className="btn btn-sm btn-warning me-2"
                  onClick={() => handleEdit(job)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleDelete(job._id)}
                >
                  🗑️ Delete
                </button>
              </td>
            </tr>
          ))}
          {jobs.length === 0 && (
            <tr>
              <td colSpan="8" className="text-center">
                No jobs found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
