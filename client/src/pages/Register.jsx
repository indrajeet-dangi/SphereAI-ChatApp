import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FileText, Lock, Mail, User, Calendar, Languages } from "lucide-react";
import AuthShell from "../components/AuthShell";
import AvatarUpload from "../components/AvatarUpload";
import { registerUser } from "../services/api";
import { SUPPORTED_LANGUAGES, normalizeLanguage } from "../constants/languages";
import { useUserContext } from "../context/UserContext";
import { t } from "../i18n";

const Register = () => {
  const navigate = useNavigate();
  const { setCurrentUser } = useUserContext();
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    bio: "",
    age: "",
    language: "en",
    profilePic: null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const onChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const onFileChange = (file) => {
    setForm((prev) => ({ ...prev, profilePic: file }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const data = await registerUser(form);
      localStorage.setItem("token", data.token);
      if (data.user) {
        setCurrentUser({ ...data.user, language: normalizeLanguage(data.user.language) });
      }
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.message || t(uiLang, "registrationFailed"));
    } finally {
      setLoading(false);
    }
  };

  const uiLang = normalizeLanguage(form.language);

  return (
    <AuthShell
      title={t(uiLang, "createAccount")}
      subtitle={t(uiLang, "registerSubtitle")}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <AvatarUpload file={form.profilePic} onChange={onFileChange} />

        <div className="relative">
          <User
            size={16}
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
          />
          <input
            className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder={t(uiLang, "fullName")}
            name="name"
            value={form.name}
            onChange={onChange}
            required
          />
        </div>

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
            minLength={6}
          />
        </div>

        <div className="relative">
          <FileText size={16} className="pointer-events-none absolute left-4 top-4 text-slate-400" />
          <textarea
            className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
            placeholder={t(uiLang, "writeBio")}
            name="bio"
            value={form.bio}
            onChange={onChange}
            rows={3}
          />
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="relative">
            <Calendar
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <input
              className="w-full rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:placeholder:text-slate-400"
              type="number"
              placeholder={t(uiLang, "age")}
              name="age"
              value={form.age}
              onChange={onChange}
              min="0"
            />
          </div>

          <div className="relative">
            <Languages
              size={16}
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
            />
            <select
              className="w-full appearance-none rounded-xl border border-slate-300 bg-white px-11 py-3 text-sm text-slate-900 shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
              name="language"
              value={form.language}
              onChange={onChange}
            >
              {SUPPORTED_LANGUAGES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-3 font-semibold text-white shadow-md transition duration-200 hover:scale-[1.01] hover:from-teal-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? t(uiLang, "creatingAccount") : t(uiLang, "register")}
        </button>
      </form>

      <p className="mt-5 text-sm text-slate-600 dark:text-slate-300">
        {t(uiLang, "alreadyHaveAccount")}{" "}
        <Link className="font-semibold text-cyan-700 dark:text-cyan-400" to="/login">
          {t(uiLang, "login")}
        </Link>
      </p>
    </AuthShell>
  );
};

export default Register;
