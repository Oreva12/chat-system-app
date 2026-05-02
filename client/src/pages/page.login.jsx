import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const { login } = useAuth();
  const navigate  = useNavigate();

  const [form,    setForm]    = useState({ email: "", password: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(form);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Sign in to your account</p>

        {error && <div style={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit} style={styles.form}>
          <input
            style={styles.input}
            type="email"
            name="email"
            placeholder="Email address"
            value={form.email}
            onChange={handleChange}
            required
          />
          <input
            style={styles.input}
            type="password"
            name="password"
            placeholder="Password"
            value={form.password}
            onChange={handleChange}
            required
          />
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>

        <p style={styles.link}>
          Don't have an account? <Link to="/register">Create one</Link>
        </p>
      </div>
    </div>
  );
};

const styles = {
  container: { minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#0D0F14" },
  card:      { background: "#141720", padding: "40px", borderRadius: "12px", width: "100%", maxWidth: "400px", border: "1px solid #1E2130" },
  title:     { color: "#E8EAF0", fontSize: "24px", fontWeight: 700, margin: "0 0 4px" },
  subtitle:  { color: "#6B7280", fontSize: "14px", margin: "0 0 24px" },
  error:     { background: "#2D1515", border: "1px solid #E05C8A", color: "#E05C8A", padding: "10px 14px", borderRadius: "6px", fontSize: "13px", marginBottom: "16px" },
  form:      { display: "flex", flexDirection: "column", gap: "12px" },
  input:     { background: "#0D0F14", border: "1px solid #1E2130", borderRadius: "6px", padding: "12px 14px", color: "#E8EAF0", fontSize: "14px", outline: "none" },
  button:    { background: "#4F8EF7", color: "#fff", border: "none", borderRadius: "6px", padding: "12px", fontSize: "14px", fontWeight: 700, cursor: "pointer", marginTop: "4px" },
  link:      { color: "#6B7280", fontSize: "13px", textAlign: "center", marginTop: "20px" },
};

export default Login;