import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { Lock, Mail } from "lucide-react";
import AuthShell from "../components/AuthShell";
import { loginUser } from "../services/api";
import { normalizeLanguage } from "../constants/languages";
import { useUserContext } from "../context/UserContext";
import { t } from "../i18n";

const AUTH_DEBUG = String(import.meta.env.VITE_DEBUG_AUTH0 || "").toLowerCase() === "true";

const Login = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUserContext();
  const { loginWithRedirect, isAuthenticated, isLoading: auth0Loading } = useAuth0();
  const [form, setForm] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await loginUser(form);
      localStorage.setItem("token", data.token);
      if (data.user) {
        setCurrentUser({ ...data.user, language: normalizeLanguage(data.user.language) });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || t(uiLang, "loginFailed"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (AUTH_DEBUG) {
      console.debug("[Login] auth state", {
        url: window.location.href,
        isAuthenticated,
        isLoading: auth0Loading,
        hasAppToken: Boolean(localStorage.getItem("token")),
      });
    }

    if (!auth0Loading && isAuthenticated) {
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, auth0Loading, navigate]);

  useEffect(() => {
    const syncError = sessionStorage.getItem("auth_sync_error");
    if (!syncError) return;
    setError(syncError);
    sessionStorage.removeItem("auth_sync_error");
    setGoogleLoading(false);
  }, []);

  const handleGoogleLogin = async () => {
    setError("");
    setGoogleLoading(true);
    try {
      await loginWithRedirect({
        appState: { returnTo: "/dashboard" },
        authorizationParams: {
          connection: "google-oauth2",
        },
      });
    } catch (err) {
      setGoogleLoading(false);
      setError(err.message || t(uiLang, "unableToStartGoogleLogin"));
    }
  };

  const uiLang = normalizeLanguage(currentUser?.language);

  if (auth0Loading) {
    return (
      <AuthShell title={t(uiLang, "welcomeBack")} subtitle={t(uiLang, "loginSubtitle")}>
        <div className="py-8 text-center text-sm text-slate-500 dark:text-slate-300">Loading...</div>
      </AuthShell>
    );
  }

  return (
    <AuthShell title={t(uiLang, "welcomeBack")} subtitle={t(uiLang, "loginSubtitle")}>
      <form className="space-y-4" onSubmit={onSubmit}>
        <div className="relative">
          <Mail
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            type="email"
            placeholder={t(uiLang, "emailAddress")}
            name="email"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        <div className="relative">
          <Lock
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            type="password"
            placeholder={t(uiLang, "password")}
            name="password"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-md transition duration-200 hover:scale-[1.01] hover:from-teal-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t(uiLang, "loggingIn") : t(uiLang, "login")}
        </button>
      </form>

      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
        <span className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500">{t(uiLang, "or")}</span>
        <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading || auth0Loading}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700"
      >
        <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" aria-hidden="true">
          <path
            fill="#4285F4"
            d="M23.49 12.27c0-.79-.07-1.55-.2-2.27H12v4.3h6.44a5.51 5.51 0 0 1-2.39 3.62v3h3.86c2.25-2.07 3.58-5.12 3.58-8.65Z"
          />
          <path
            fill="#34A853"
            d="M12 24c3.24 0 5.96-1.07 7.95-2.9l-3.86-3c-1.07.72-2.44 1.15-4.09 1.15-3.14 0-5.8-2.12-6.75-4.97h-3.99v3.12A12 12 0 0 0 12 24Z"
          />
          <path
            fill="#FBBC05"
            d="M5.25 14.28A7.19 7.19 0 0 1 4.87 12c0-.79.14-1.55.38-2.28V6.6h-4A12 12 0 0 0 0 12c0 1.94.46 3.77 1.25 5.4l4-3.12Z"
          />
          <path
            fill="#EA4335"
            d="M12 4.77c1.77 0 3.36.6 4.61 1.79l3.45-3.45C17.95 1.14 15.23 0 12 0A12 12 0 0 0 1.25 6.6l4 3.12C6.2 6.88 8.86 4.77 12 4.77Z"
          />
        </svg>
        {googleLoading || auth0Loading ? t(uiLang, "connectingGoogle") : t(uiLang, "continueWithGoogle")}
      </button>

      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        {t(uiLang, "newHere")}{" "}
        <Link className="font-semibold text-cyan-700 dark:text-cyan-400" to="/register">
          {t(uiLang, "createAccount")}
        </Link>
      </p>
    </AuthShell>
  );
};

export default Login;
