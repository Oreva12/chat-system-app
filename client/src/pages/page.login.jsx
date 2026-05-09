import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Login = () => {
  const { login }    = useAuth();
  const navigate     = useNavigate();
  const [form,       setForm]    = useState({ email: "", password: "" });
  const [error,      setError]   = useState("");
  const [loading,    setLoading] = useState(false);

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
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-muted text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6">

          {/* Error */}
          {error && (
            <div className="bg-pink/10 border border-pink/30 text-pink
                            rounded-lg px-4 py-3 text-sm mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-light text-xs font-semibold uppercase
                                tracking-wider">
                Email
              </label>
              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-blue focus:outline-none
                           transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-light text-xs font-semibold uppercase
                                tracking-wider">
                Password
              </label>
              <input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-blue focus:outline-none
                           transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-blue hover:bg-blue/90 disabled:opacity-50
                         text-white font-bold py-3 rounded-lg text-sm
                         transition-colors mt-2 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-4">
          Don't have an account?{" "}
          <Link to="/register" className="text-blue hover:underline font-medium">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Login;