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
      <a href="#register-form" className="skip-link">Skip to form</a>

      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div
            className="inline-flex items-center justify-center w-12 h-12
                        rounded-xl bg-teal mb-4"
            aria-hidden="true"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="white" strokeWidth="2" aria-hidden="true">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-white">Create account</h1>
          <p className="text-muted text-sm mt-1">Start chatting in seconds</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6">

          {error && (
            <div
              role="alert"
              aria-live="assertive"
              className="bg-pink/10 border border-pink/30 text-pink
                         rounded-lg px-4 py-3 text-sm mb-4"
            >
              {error}
            </div>
          )}

          <form
            id="register-form"
            onSubmit={handleSubmit}
            className="flex flex-col gap-3"
            noValidate
          >
            <div className="flex flex-col gap-1.5">
              <label htmlFor="username"
                className="text-light text-xs font-semibold uppercase
                           tracking-wider">
                Username
              </label>
              <input
                id="username"
                type="text"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="yourname"
                required
                minLength={3}
                maxLength={20}
                autoComplete="username"
                aria-required="true"
                aria-describedby="username-hint"
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-teal focus:outline-none transition-colors"
              />
              <p id="username-hint" className="text-muted text-[10px]">
                3–20 characters, letters and numbers only
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-email"
                className="text-light text-xs font-semibold uppercase
                           tracking-wider">
                Email
              </label>
              <input
                id="reg-email"
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
                autoComplete="email"
                aria-required="true"
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-teal focus:outline-none transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="reg-password"
                className="text-light text-xs font-semibold uppercase
                           tracking-wider">
                Password
              </label>
              <input
                id="reg-password"
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min 8 characters"
                required
                minLength={8}
                autoComplete="new-password"
                aria-required="true"
                aria-describedby="password-hint"
                className="bg-dark border border-border rounded-lg px-4 py-3
                           text-white text-sm placeholder-muted
                           focus:border-teal focus:outline-none transition-colors"
              />
              <p id="password-hint" className="text-muted text-[10px]">
                Minimum 8 characters
              </p>
            </div>

            <button
              type="submit"
              disabled={loading}
              aria-busy={loading}
              className="bg-teal hover:bg-teal/90 disabled:opacity-50
                         text-dark font-bold py-3 rounded-lg text-sm
                         transition-colors mt-2 cursor-pointer"
            >
              {loading ? (
                <span aria-live="polite">Creating account...</span>
              ) : (
                "Create account"
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-muted text-sm mt-4">
          Already have an account?{" "}
          <Link to="/login"
            className="text-blue hover:underline font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;