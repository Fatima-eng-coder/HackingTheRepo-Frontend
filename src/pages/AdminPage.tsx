import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import StatusBadge from "../components/StatusBadge";
import api from "../utils/api";
import type { AdminUser, Job, UserRole } from "../types";
import "./AdminPage.css";

function repoName(url: string): string {
  try {
    return url.split("github.com/")[1] || url;
  } catch {
    return url;
  }
}

function jobOwnerLabel(job: Job): string {
  const owner = job.userId;
  if (owner && typeof owner === "object") {
    return owner.username || owner.email || "Unknown";
  }
  return "Unknown";
}

export default function AdminPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [tab, setTab] = useState<"users" | "jobs">("users");

  const load = async (): Promise<void> => {
    setLoading(true);
    setError("");
    try {
      const [usersRes, jobsRes] = await Promise.all([
        api.get("/admin/users"),
        api.get("/jobs"),
      ]);
      setUsers(usersRes.data as AdminUser[]);
      setJobs(jobsRes.data as Job[]);
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to load admin data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const changeRole = async (id: string, role: UserRole): Promise<void> => {
    setBusyUserId(id);
    setError("");
    try {
      const { data } = await api.patch(`/admin/users/${id}/role`, { role });
      setUsers((prev) => prev.map((u) => (u._id === id ? (data as AdminUser) : u)));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to update role");
    } finally {
      setBusyUserId(null);
    }
  };

  const removeUser = async (id: string, username: string): Promise<void> => {
    if (!window.confirm(`Delete ${username}? This also deletes their jobs.`)) {
      return;
    }
    setBusyUserId(id);
    setError("");
    try {
      await api.delete(`/admin/users/${id}`);
      setUsers((prev) => prev.filter((u) => u._id !== id));
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setError(error.response?.data?.message || "Failed to delete user");
    } finally {
      setBusyUserId(null);
    }
  };

  return (
    <div className="page fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-sub">Manage users and review every job across RepoMind.</p>
        </div>
      </div>

      <div className="admin-tabs">
        <button
          type="button"
          className={`admin-tab ${tab === "users" ? "active" : ""}`}
          onClick={() => setTab("users")}
        >
          Users <span className="admin-tab-count">{users.length}</span>
        </button>
        <button
          type="button"
          className={`admin-tab ${tab === "jobs" ? "active" : ""}`}
          onClick={() => setTab("jobs")}
        >
          All Jobs <span className="admin-tab-count">{jobs.length}</span>
        </button>
      </div>

      {error && <div className="auth-error" style={{ marginBottom: 16 }}>{error}</div>}

      {loading && (
        <div className="empty-state">
          <div className="spinner"></div>
          <span>Loading admin data...</span>
        </div>
      )}

      {!loading && tab === "users" && (
        <div className="card admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Email</th>
                <th>Role</th>
                <th>Jobs</th>
                <th>PRs</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u._id}>
                  <td className="admin-user-cell">
                    <div className="admin-avatar">{u.username?.[0]?.toUpperCase()}</div>
                    {u.username}
                    {u._id === user?.id && <span className="admin-you-tag">you</span>}
                  </td>
                  <td className="admin-muted">{u.email}</td>
                  <td>
                    <span className={`admin-role-badge admin-role-${u.role}`}>{u.role}</span>
                  </td>
                  <td>{u.totalJobs ?? 0}</td>
                  <td>{u.successfulPRs ?? 0}</td>
                  <td className="admin-actions-cell">
                    {u.role === "admin" ? (
                      <button
                        type="button"
                        className="btn-ghost admin-action-btn"
                        disabled={busyUserId === u._id}
                        onClick={() => changeRole(u._id, "user")}
                      >
                        Demote
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn-ghost admin-action-btn"
                        disabled={busyUserId === u._id}
                        onClick={() => changeRole(u._id, "admin")}
                      >
                        Make admin
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn-ghost admin-action-btn admin-danger"
                      disabled={busyUserId === u._id || u._id === user?.id}
                      onClick={() => removeUser(u._id, u.username)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && tab === "jobs" && (
        <div className="jobs-list">
          {jobs.length === 0 && (
            <div className="empty-state card">
              <div className="empty-icon">📭</div>
              <h3>No jobs yet</h3>
            </div>
          )}
          {jobs.map((job) => (
            <div
              key={job._id}
              className="job-row card"
              onClick={() => navigate(`/jobs/${job._id}`)}
            >
              <div className="job-main">
                <div className="job-repo">
                  <code className="repo-name">{repoName(job.repoUrl)}</code>
                  <span className="admin-owner-tag">{jobOwnerLabel(job)}</span>
                </div>
                <p className="job-instruction">{job.instruction}</p>
              </div>
              <div className="job-right">
                <StatusBadge status={job.status} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}