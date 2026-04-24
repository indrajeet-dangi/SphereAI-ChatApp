import { useEffect, useMemo } from "react";
import { Camera, User } from "lucide-react";

const AvatarUpload = ({ file, onChange }) => {
  const previewUrl = useMemo(() => {
    if (!file) return "";
    return URL.createObjectURL(file);
  }, [file]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 shadow-md transition hover:scale-105 dark:border-slate-700 dark:bg-slate-800">
          {previewUrl ? (
            <img src={previewUrl} alt="Profile preview" className="h-full w-full object-cover" />
          ) : (
            <User size={34} className="text-slate-500 dark:text-slate-300" />
          )}
        </div>

        <label
          htmlFor="profilePicUpload"
          className="absolute -bottom-1 -right-1 cursor-pointer rounded-full border border-slate-200 bg-white p-2 shadow-sm transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:bg-slate-800"
          title="Upload photo"
        >
          <Camera size={14} className="text-slate-700 dark:text-slate-200" />
        </label>
      </div>

      <input
        id="profilePicUpload"
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] || null)}
      />

      <button
        type="button"
        onClick={() => document.getElementById("profilePicUpload")?.click()}
        className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
      >
        Upload photo
      </button>
    </div>
  );
};

export default AvatarUpload;
