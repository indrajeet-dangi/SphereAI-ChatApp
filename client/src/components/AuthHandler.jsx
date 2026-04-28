import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth0 } from "@auth0/auth0-react";
import { auth0LoginUser } from "../services/api";
import { normalizeLanguage } from "../constants/languages";
import { useUserContext } from "../context/UserContext";

const AuthHandler = ({ children }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCurrentUser } = useUserContext();
  const { isAuthenticated, isLoading, user, getAccessTokenSilently } = useAuth0();
  const syncInFlightRef = useRef(false);

  useEffect(() => {
    const syncAuth0Session = async () => {
      if (isLoading || !isAuthenticated || !user) return;
      if (localStorage.getItem("token")) return;
      if (syncInFlightRef.current) return;

      syncInFlightRef.current = true;
      try {
        let auth0Token = "";
        try {
          auth0Token = await getAccessTokenSilently();
        } catch {
          auth0Token = "";
        }

        if (auth0Token) {
          localStorage.setItem("auth0_access_token", auth0Token);
        }

        const data = await auth0LoginUser({
          name: user.name,
          email: user.email,
          picture: user.picture,
          sub: user.sub,
        });

        if (data?.token) {
          localStorage.setItem("token", data.token);
        }

        if (data?.user) {
          setCurrentUser({
            ...data.user,
            language: normalizeLanguage(data.user.language),
          });
        }

        if (location.pathname === "/login" || location.pathname === "/") {
          navigate("/dashboard", { replace: true });
        }
      } finally {
        syncInFlightRef.current = false;
      }
    };

    syncAuth0Session();
  }, [
    isLoading,
    isAuthenticated,
    user,
    getAccessTokenSilently,
    location.pathname,
    navigate,
    setCurrentUser,
  ]);

  return children;
};

export default AuthHandler;
