import React from "react";
import { getTranslation } from "../utils/i18n";

export default function Navbar({ 
  user, 
  role, 
  onLogout, 
  lang, 
  setLang, 
  theme, 
  setTheme, 
  config 
}) {
  const handleLangChange = (e) => {
    const selectedLang = e.target.value;
    setLang(selectedLang);
    document.documentElement.dir = selectedLang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = selectedLang;
  };

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
  };

  return (
    <nav className="navbar">
      <div className="brand-section">
        <span className="brand-logo" role="img" aria-label="logo">
          {config.appLogo || "🕌"}
        </span>
        <div>
          <span className="brand-name">{config.appName || "Chaml"}</span>
          <p style={{ fontSize: "0.75rem", opacity: 0.8, fontWeight: 500, margin: 0 }}>
            {getTranslation(lang, "brand_tagline")}
          </p>
        </div>
      </div>

      <div className="nav-controls">
        {/* Language selector */}
        <select 
          className="select-dropdown" 
          value={lang} 
          onChange={handleLangChange}
          style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}
        >
          <option value="fr">Français</option>
          <option value="ar">العربية</option>
          <option value="en">English</option>
        </select>

        {/* Theme Toggler */}
        <button 
          className="btn btn-secondary" 
          onClick={toggleTheme}
          style={{ padding: "0.4rem 0.8rem", fontSize: "1.1rem" }}
          title="Toggle Light/Dark Theme"
        >
          {theme === "light" ? "🌙" : "☀️"}
        </button>

        {/* Logged in Info */}
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span style={{ fontSize: "0.9rem", fontWeight: 600 }}>
              👤 {user.firstName} ({role === "admin" ? getTranslation(lang, "nav_admin") : role === "demandeur" ? "France" : "Maroc"})
            </span>
            <button className="btn btn-danger" onClick={onLogout} style={{ padding: "0.4rem 0.8rem", fontSize: "0.85rem" }}>
              {getTranslation(lang, "nav_logout")}
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
