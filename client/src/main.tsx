import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { I18nProvider } from "./i18n";
import "./styles/global.css";

const isDesktop = Boolean(window.stackcraft?.isDesktop);

if (window.stackcraft?.notifyReady) {
  void window.stackcraft.notifyReady();
}

const app = (
  <I18nProvider>
    <App />
  </I18nProvider>
);

createRoot(document.getElementById("root")!).render(
  isDesktop ? app : <StrictMode>{app}</StrictMode>,
);
