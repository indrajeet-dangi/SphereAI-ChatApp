import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Auth0Provider } from "@auth0/auth0-react";
import App from "./App";
import { UserProvider } from "./context/UserContext";
import "./index.css";

const auth0Domain = import.meta.env.VITE_AUTH0_DOMAIN;
const auth0ClientId = import.meta.env.VITE_AUTH0_CLIENT_ID;
const isAuth0Configured = Boolean(auth0Domain && auth0ClientId);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {isAuth0Configured ? (
      <Auth0Provider
        domain={auth0Domain}
        clientId={auth0ClientId}
        authorizationParams={{
          redirect_uri: window.location.origin,
        }}
      >
        <UserProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </UserProvider>
      </Auth0Provider>
    ) : (
      <div style={{ padding: "24px", fontFamily: "Segoe UI, sans-serif" }}>
        Missing Auth0 configuration. Set VITE_AUTH0_DOMAIN and VITE_AUTH0_CLIENT_ID in client/.env
      </div>
    )}
  </React.StrictMode>
);
