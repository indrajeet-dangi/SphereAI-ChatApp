import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Bell,
  Moon,
  User,
  FileText,
  Cake,
  Languages,
  Lock,
  Mail,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { changePassword, fetchMe, updatePreferences, updateProfile } from "../services/api";
import UserAvatar from "../components/chat/UserAvatar";
import { SUPPORTED_LANGUAGES, normalizeLanguage } from "../constants/languages";
import { useUserContext } from "../context/UserContext";
import { t } from "../i18n";

const Settings = () => {
  const navigate = useNavigate();
  const { currentUser, setCurrentUser } = useUserContext();
  const [form, setForm] = useState({
    name: "",
    email: "",
    bio: "",
    age: "",
    language: "en",
    profilePic: "",
  });
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [darkModePref, setDarkModePref] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const data = await fetchMe();
        const user = data.user;
        setForm({
          name: user.name || "",
          email: user.email || "",
          bio: user.bio || "",
          age: user.age ?? "",
          language: normalizeLanguage(user.language),
          profilePic: user.profilePic || "",
        });
        setCurrentUser(user);
        setDarkModePref(Boolean(user.darkMode));
        setNotificationsEnabled(user.notifications !== false);

        if (user.darkMode) {
          document.documentElement.classList.add("dark");
          localStorage.setItem("theme", "dark");
        } else {
          document.documentElement.classList.remove("dark");
          localStorage.setItem("theme", "light");
        }
      } catch (err) {
        setError(err.response?.data?.message || t(uiLang, "failedToLoadProfile"));
      } finally {
        setLoading(false);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (!showToast) return undefined;
    const timer = setTimeout(() => setShowToast(false), 2500);
    return () => clearTimeout(timer);
  }, [showToast]);

  const displayImage = useMemo(() => previewUrl || form.profilePic, [previewUrl, form.profilePic]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (file) => {
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(t(uiLang, "invalidImageFile"));
      return;
    }

    if (previewUrl) URL.revokeObjectURL(previewUrl);
    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setSelectedFile(file);
    setError("");
    setSuccess("");
  };

  const uploadToCloudinary = async (file) => {
    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

    if (!cloudName || !uploadPreset) {
      throw new Error(t(uiLang, "cloudinaryConfigMissing"));
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
      {
        method: "POST",
        body: formData,
      }
    );

    if (!response.ok) {
      throw new Error(t(uiLang, "profileImageUploadFailed"));
    }

    const data = await response.json();
    return data.secure_url;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      let profilePic = form.profilePic;
      if (selectedFile) {
        profilePic = await uploadToCloudinary(selectedFile);
      }

      const payload = {
        name: form.name,
        bio: form.bio,
        age: form.age,
        language: form.language,
        profilePic,
      };

      const data = await updateProfile(payload);
      const user = data.user;

        setForm({
          name: user.name || "",
          email: user.email || "",
          bio: user.bio || "",
          age: user.age ?? "",
          language: normalizeLanguage(user.language),
          profilePic: user.profilePic || "",
        });
      setCurrentUser(user);

      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }

      setPreviewUrl("");
      setSelectedFile(null);
      setSuccess(t(uiLang, "profileUpdatedSuccessfully"));
      setShowToast(true);

      setTimeout(() => {
        navigate("/dashboard");
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.message || err.message || t(uiLang, "failedToUpdateProfile"));
    } finally {
      setSaving(false);
    }
  };

  const applyThemeLocally = (isDark) => {
    if (isDark) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    }
  };

  const persistPreferences = async (nextDarkMode, nextNotifications) => {
    setSavingPreferences(true);
    try {
      await updatePreferences({
        darkMode: nextDarkMode,
        notifications: nextNotifications,
      });
      setSuccess(t(uiLang, "preferencesUpdatedSuccessfully"));
      setShowToast(true);
    } catch (err) {
      setError(err.response?.data?.message || t(uiLang, "failedToUpdatePreferences"));
      throw err;
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleToggleDarkMode = async () => {
    const prevDark = darkModePref;
    const nextDark = !prevDark;
    setDarkModePref(nextDark);
    applyThemeLocally(nextDark);

    try {
      await persistPreferences(nextDark, notificationsEnabled);
    } catch {
      setDarkModePref(prevDark);
      applyThemeLocally(prevDark);
    }
  };

  const handleToggleNotifications = async () => {
    const prevNotifications = notificationsEnabled;
    const nextNotifications = !prevNotifications;
    setNotificationsEnabled(nextNotifications);

    try {
      await persistPreferences(darkModePref, nextNotifications);
    } catch {
      setNotificationsEnabled(prevNotifications);
    }
  };

  const handleChangePassword = async () => {
    setError("");
    setSuccess("");

    const currentPassword = String(passwordForm.currentPassword || "");
    const newPassword = String(passwordForm.newPassword || "");
    const confirmPassword = String(passwordForm.confirmPassword || "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      setError(t(uiLang, "fillAllPasswordFields"));
      return;
    }

    if (newPassword.length < 6) {
      setError(t(uiLang, "newPasswordMinLength"));
      return;
    }

    if (newPassword !== confirmPassword) {
      setError(t(uiLang, "passwordMismatch"));
      return;
    }

    setChangingPassword(true);
    try {
      await changePassword({ currentPassword, newPassword });
      setPasswordForm({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setSuccess(t(uiLang, "passwordUpdatedSuccessfully"));
      setShowToast(true);
    } catch (err) {
      setError(err.response?.data?.message || t(uiLang, "failedToChangePassword"));
    } finally {
      setChangingPassword(false);
    }
  };

  const uiLang = normalizeLanguage(form.language || currentUser?.language);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <p className="text-sm text-slate-500 dark:text-slate-400">{t(uiLang, "loadingSettings")}</p>
      </div>
    );
  }

  return (
    <div className="h-screen overflow-y-auto bg-slate-100 px-4 py-6 dark:bg-slate-950 sm:px-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-5 flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/dashboard")}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-700 shadow-sm transition hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
            aria-label={t(uiLang, "back")}
            title="Back"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-900 dark:text-slate-100">{t(uiLang, "profileSettings")}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t(uiLang, "manageAccountPreferences")}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-colors dark:border-slate-700 dark:bg-slate-900">
            <div className="flex flex-col items-center text-center">
              <div className="group relative">
                <div className="transition duration-200 group-hover:scale-105">
                  <UserAvatar
                    name={form.name || "User"}
                    src={displayImage}
                    sizeClass="h-28 w-28"
                    textClass="text-3xl"
                  />
                </div>
                <label
                  className="absolute bottom-1 right-1 cursor-pointer rounded-full border border-slate-200 bg-white p-2 shadow-md transition hover:scale-105 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:hover:bg-slate-700"
                  title={t(uiLang, "changePhoto")}
                >
                  <Camera size={14} className="text-slate-700 dark:text-slate-200" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => handleFileChange(e.target.files?.[0])}
                  />
                </label>
              </div>

              <h2 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{form.name || t(uiLang, "yourName")}</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{form.email || t(uiLang, "noEmailFound")}</p>
              {selectedFile ? (
                <p className="mt-2 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  {t(uiLang, "selected")}: {selectedFile.name}
                </p>
              ) : null}
            </div>

            <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60">
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">{t(uiLang, "profileCompletion")}</p>
              <p className="mt-1 text-sm text-slate-700 dark:text-slate-200">
                {t(uiLang, "profileCompletionHint")}
              </p>
            </div>
          </aside>

          <section className="space-y-5 lg:col-span-2">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-colors dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{t(uiLang, "profileInfo")}</h3>
                <div className="space-y-4">
                  <div className="relative">
                    <User size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      name="name"
                      value={form.name}
                      onChange={handleChange}
                      required
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder={t(uiLang, "fullName")}
                    />
                  </div>

                  <div className="relative">
                    <FileText size={16} className="pointer-events-none absolute left-4 top-3.5 text-slate-400" />
                    <textarea
                      name="bio"
                      value={form.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder={t(uiLang, "writeBio")}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="relative">
                      <Cake size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="number"
                        name="age"
                        min="0"
                        value={form.age}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                        placeholder={t(uiLang, "age")}
                      />
                    </div>
                    <div className="relative">
                      <Languages size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                      <select
                        name="language"
                        value={form.language}
                        onChange={handleChange}
                        className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      >
                        {SUPPORTED_LANGUAGES.map((item) => (
                          <option key={item.code} value={item.code}>
                            {item.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-colors dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{t(uiLang, "accountInfo")}</h3>
                <div className="space-y-3">
                  <div className="relative">
                    <Mail size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={form.email}
                      disabled
                      className="w-full cursor-not-allowed rounded-xl border border-slate-300 bg-slate-100 py-2.5 pl-11 pr-4 text-sm text-slate-600 shadow-sm dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300"
                    />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t(uiLang, "emailManagedByProvider")}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-colors dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{t(uiLang, "preferences")}</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Moon size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{t(uiLang, "darkMode")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleDarkMode}
                      disabled={savingPreferences}
                      className={`relative h-6 w-11 rounded-full transition ${darkModePref ? "bg-cyan-600" : "bg-slate-300 dark:bg-slate-600"} disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${darkModePref ? "left-5.5" : "left-0.5"}`} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-slate-500" />
                      <span className="text-sm text-slate-700 dark:text-slate-200">{t(uiLang, "notifications")}</span>
                    </div>
                    <button
                      type="button"
                      onClick={handleToggleNotifications}
                      disabled={savingPreferences}
                      className={`relative h-6 w-11 rounded-full transition ${notificationsEnabled ? "bg-cyan-600" : "bg-slate-300 dark:bg-slate-600"} disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition ${notificationsEnabled ? "left-5.5" : "left-0.5"}`} />
                    </button>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md transition-colors dark:border-slate-700 dark:bg-slate-900">
                <h3 className="mb-4 text-base font-semibold text-slate-900 dark:text-slate-100">{t(uiLang, "changePassword")}</h3>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                  <div className="relative">
                    <Lock size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={passwordForm.currentPassword}
                      onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                      className="w-full rounded-xl border border-slate-300 bg-white py-2.5 pl-11 pr-4 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                      placeholder={t(uiLang, "currentPassword")}
                    />
                  </div>
                  <input
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder={t(uiLang, "newPassword")}
                  />
                  <input
                    type="password"
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm shadow-sm outline-none ring-cyan-200 transition focus:ring dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100"
                    placeholder={t(uiLang, "confirmPassword")}
                  />
                </div>
                <div className="mt-3 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-500 to-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md transition duration-200 hover:scale-[1.01] hover:from-teal-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {changingPassword ? <Loader2 size={14} className="animate-spin" /> : null}
                    {changingPassword ? t(uiLang, "updating") : t(uiLang, "changePassword")}
                  </button>
                </div>
              </div>

              {error ? <p className="text-sm text-red-600">{error}</p> : null}
              {success ? <p className="text-sm text-emerald-600">{success}</p> : null}

              <button
                type="submit"
                disabled={saving}
                className="w-full rounded-full bg-gradient-to-r from-teal-500 to-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-md transition duration-200 hover:scale-[1.01] hover:from-teal-600 hover:to-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? t(uiLang, "updating") : t(uiLang, "updateProfile")}
              </button>
            </form>
          </section>
        </div>

        {showToast ? (
          <div className="fixed right-5 top-5 z-50 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 shadow-lg dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} />
              {t(uiLang, "profileUpdatedSuccessfully")}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Settings;
