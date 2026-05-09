import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../hooks/useAuth";

const Register = () => {
  const { register } = useAuth();
  const navigate     = useNavigate();
  const [form,       setForm]    = useState({ username: "", email: "", password: "" });
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
      await register(form);
      navigate("/chat");
    } catch (err) {
      setError(err.response?.data?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12
                          rounded-xl bg-teal mb-4">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-muted text-sm mt-1">Start chatting in seconds</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-xl p-6">

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
                Username
              </label>
              <input
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="yourname"
                required
                minLength={3}
                maxLength={20}
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-teal focus:outline-none transition-colors"
              />
            </div>

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
                           focus:border-teal focus:outline-none transition-colors"
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
                placeholder="Min 8 characters"
                required
                minLength={8}
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-teal focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="bg-teal hover:bg-teal/90 disabled:opacity-50
                         text-dark font-bold py-3 rounded-lg text-sm
                         transition-colors mt-2 cursor-pointer"
            >
              {loading ? "Creating account..." : "Create account"}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login" className="text-blue hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;