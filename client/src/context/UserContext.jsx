import { createContext, useContext, useMemo, useState } from "react";
import { normalizeLanguage } from "../constants/languages";

const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const raw = localStorage.getItem("currentUser");
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const setUser = (nextUser) => {
    setCurrentUser((prev) => {
      const resolvedUser = typeof nextUser === "function" ? nextUser(prev) : nextUser;
      const normalizedUser = resolvedUser
        ? { ...resolvedUser, language: normalizeLanguage(resolvedUser.language) }
        : null;

      if (normalizedUser) {
        localStorage.setItem("currentUser", JSON.stringify(normalizedUser));
      } else {
        localStorage.removeItem("currentUser");
      }

      return normalizedUser;
    });
  };

  const language = normalizeLanguage(currentUser?.language);

  const value = useMemo(
    () => ({
      currentUser,
      setCurrentUser: setUser,
      language,
      setLanguage: (nextLanguage) =>
        setUser(currentUser ? { ...currentUser, language: normalizeLanguage(nextLanguage) } : currentUser),
    }),
    [currentUser, language]
  );

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUserContext = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUserContext must be used inside UserProvider");
  }
  return context;
};
