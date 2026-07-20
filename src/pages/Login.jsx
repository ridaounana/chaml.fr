import React, { useState, useEffect } from "react";
import { getTranslation } from "../utils/i18n";
import { loginUser, registerApplicant, verifyEmail, acceptInvite, forgotPassword, resetPassword } from "../utils/api";
import { FranceFlag, MoroccoFlag } from "../components/Flag";
import { searchAddress, getZoneFromPostcode } from "../utils/address";

export default function Login({ 
  lang, 
  onLoginSuccess, 
  config,
  initialView = "login",
  resetToken,
  onBackToLanding
}) {
  const [view, setView] = useState(initialView); // 'login' | 'register' | 'unverified' | 'unapproved' | 'accept_invite'
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Accept Invitation State
  const [invitePassword, setInvitePassword] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Forgot Password State
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);

  // Reset Password State
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [resetLoading, setResetLoading] = useState(false);

  // Sync initialView updates
  useEffect(() => {
    if (initialView) {
      setView(initialView);
    }
  }, [initialView]);

  // Registration Form State
  const [isGoogleSignup, setIsGoogleSignup] = useState(false);
  const [hpWebsiteCheck, setHpWebsiteCheck] = useState("");
  const [frEmail, setFrEmail] = useState("");
  const [frPassword, setFrPassword] = useState("");
  const [frFirstName, setFrFirstName] = useState("");
  const [frLastName, setFrLastName] = useState("");
  const [frPhone, setFrPhone] = useState("");
  const [frCity, setFrCity] = useState("");
  const [frDep, setFrDep] = useState("");
  const [frZone, setFrZone] = useState(() => {
    const val = localStorage.getItem("prefill_zone");
    if (val) localStorage.removeItem("prefill_zone");
    return val || "A";
  });
  const [frSurface, setFrSurface] = useState(() => {
    const val = localStorage.getItem("prefill_surface");
    if (val) localStorage.removeItem("prefill_surface");
    return val || "30";
  });

  // Address autocomplete state
  const [frAddress, setFrAddress] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleAddressChange = (val) => {
    setFrAddress(val);
    if (val.length >= 3) {
      searchAddress(val)
        .then(res => {
          setAddressSuggestions(res);
          setShowSuggestions(true);
        })
        .catch(err => console.error("Search address error:", err));
    } else {
      setAddressSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSelectAddress = (suggestion) => {
    const props = suggestion.properties;
    setFrAddress(props.label || "");
    setFrCity(props.city || "");
    setFrDep(props.postcode ? props.postcode.slice(0, 2) : "");
    const zone = getZoneFromPostcode(props.postcode);
    setFrZone(zone);
    setShowSuggestions(false);
    setAddressSuggestions([]);
  };

  const [maEmail, setMaEmail] = useState("");
  const [maPassword, setMaPassword] = useState("");
  const [maFirstName, setMaFirstName] = useState("");
  const [maLastName, setMaLastName] = useState("");
  const [maPhone, setMaPhone] = useState("");
  const [maCity, setMaCity] = useState("");

  // Storage data during simulated verification triggers
  const [pendingEmail, setPendingEmail] = useState("");
  const [pendingCoupleId, setPendingCoupleId] = useState("");
  const [pendingSide, setPendingSide] = useState("");

  // Check for invitation and Google registration parameters on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const inviteCoupleId = params.get("inviteCoupleId");
    const inviteEmail = params.get("inviteEmail");
    const googleRegister = params.get("google_register");

    if (inviteCoupleId && inviteEmail) {
      setView("accept_invite");
      setFrEmail(inviteEmail);
      setPendingCoupleId(inviteCoupleId);
    } else if (googleRegister === "true") {
      setView("register");
      setIsGoogleSignup(true);
      const gEmail = params.get("email");
      const gFirstName = params.get("firstName");
      const gLastName = params.get("lastName");
      if (gEmail) setFrEmail(gEmail);
      if (gFirstName) setFrFirstName(gFirstName);
      if (gLastName) setFrLastName(gLastName);
      
      // Clean query parameters so they don't persist on refresh
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    loginUser(email, password)
      .then(res => {
        if (res.success) {
          setError("");
          onLoginSuccess(res.user);
        }
      })
      .catch(err => {
        const msg = err.message;
        if (msg === "frozen") {
          setError(lang === "ar" ? "هذا الحساب معطل مؤقتًا. يرجى الاتصال بالإدارة." : lang === "en" ? "This account is suspended. Please contact admin." : "Ce compte est suspendu. Veuillez contacter l'administration.");
        } else if (msg === "unverified") {
          setPendingEmail(email);
          setPendingCoupleId(err.payload?.coupleId || "");
          setView("unverified");
        } else if (msg === "unapproved") {
          setPendingEmail(email);
          setView("unapproved");
        } else {
          setError(getTranslation(lang, "login_error"));
        }
      });
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    setError("");
    setForgotSuccess("");
    setForgotLoading(true);

    forgotPassword(forgotEmail)
      .then(res => {
        setForgotSuccess(res.message || "Un e-mail de réinitialisation a été envoyé avec succès.");
      })
      .catch(err => {
        setError(err.message || "Erreur lors de la demande de réinitialisation.");
      })
      .finally(() => {
        setForgotLoading(false);
      });
  };

  const handleResetPassword = (e) => {
    e.preventDefault();
    setError("");
    setResetSuccess("");

    if (newPassword !== confirmNewPassword) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }

    setResetLoading(true);
    resetPassword(resetToken, newPassword)
      .then(res => {
        setResetSuccess(res.message || "Votre mot de passe a été réinitialisé.");
        setNewPassword("");
        setConfirmNewPassword("");
      })
      .catch(err => {
        setError(err.message || "Erreur lors de la réinitialisation.");
      })
      .finally(() => {
        setResetLoading(false);
      });
  };

  const handleRegister = (e) => {
    e.preventDefault();
    if (!frEmail || !frFirstName || !frLastName) {
      setError("Veuillez remplir tous les champs obligatoires (*).");
      return;
    }
    if (!isGoogleSignup && !frPassword) {
      setError("Veuillez saisir un mot de passe.");
      return;
    }

    const data = {
      email: frEmail,
      password: frPassword,
      firstName: frFirstName,
      lastName: frLastName,
      phone: frPhone,
      address: frAddress,
      city: frCity,
      department: frDep,
      zone: frZone,
      livingSurface: frSurface,
      hp_website_check: hpWebsiteCheck,
      isGoogle: isGoogleSignup
    };

    registerApplicant(data)
      .then(res => {
        if (res.success) {
          setError("");
          if (res.autoLogin) {
            // Auto login succeeded, reload page to load session state fresh from cookies
            window.location.reload();
          } else {
            setPendingEmail(frEmail);
            setPendingCoupleId(res.coupleId);
            setView("unverified");
          }
        }
      })
      .catch(err => {
        setError(err.message || "Registration failed.");
      });
  };

  const handleAcceptInvite = (e) => {
    e.preventDefault();
    if (!invitePassword) {
      setError("Veuillez saisir votre mot de passe.");
      return;
    }
    acceptInvite(pendingCoupleId, frEmail, invitePassword)
      .then(() => {
        setError("");
        setInviteSuccess("Votre mot de passe conjoint a été créé avec succès ! redirection...");
        window.history.replaceState({}, document.title, window.location.pathname);
        setTimeout(() => {
          setInviteSuccess("");
          setView("login");
          setEmail(frEmail);
        }, 2500);
      })
      .catch(err => {
        setError(err.message || "Erreur lors de l'activation de l'invitation.");
      });
  };

  const [resendSuccess, setResendSuccess] = useState("");
  const [resendLoading, setResendLoading] = useState(false);

  const handleResendVerification = () => {
    setResendLoading(true);
    setResendSuccess("");
    verifyEmail(pendingCoupleId)
      .then(() => {
        setResendSuccess(getTranslation(lang, "unverified_resend_success", { email: pendingEmail }));
      })
      .catch(err => {
        setError(err.message || "Resend failed.");
      })
      .finally(() => {
        setResendLoading(false);
      });
  };

  return (
    <div style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minHeight: "80vh",
      padding: "2rem 1rem"
    }}>
      <div className="glass-card fade-in" style={{ width: "100%", maxWidth: view === "register" ? "850px" : "480px", position: "relative" }}>
        
        {/* Floating Top-Left Back Button */}
        <button 
          type="button"
          onClick={onBackToLanding}
          style={{
            position: "absolute",
            top: "1.25rem",
            left: lang === "ar" ? "auto" : "1.25rem",
            right: lang === "ar" ? "1.25rem" : "auto",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid var(--border-card)",
            borderRadius: "0.5rem",
            padding: "0.4rem 0.8rem",
            color: "var(--text-muted)",
            fontSize: "0.8rem",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            transition: "all 0.2s ease"
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "var(--text-main)";
            e.currentTarget.style.background = "rgba(255,255,255,0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-muted)";
            e.currentTarget.style.background = "rgba(255,255,255,0.03)";
          }}
        >
          {getTranslation(lang, "back_home")}
        </button>

        {/* Brand Logo Header */}
        <div style={{ textAlign: "center", marginBottom: "1.5rem", marginTop: "1rem" }}>
          <span style={{ fontSize: "3rem" }}>{config.appLogo || "🕌"}</span>
          <h1 style={{ fontSize: "2rem", marginTop: "0.5rem", fontWeight: 800 }}>
            {config.appName || "Chaml"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {getTranslation(lang, "brand_tagline")}
          </p>
        </div>

        {error && (
          <div style={{
            background: "var(--danger-bg)",
            color: "var(--danger)",
            padding: "0.75rem 1rem",
            borderRadius: "0.5rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            fontWeight: 600,
            border: "1px solid rgba(220, 38, 38, 0.2)"
          }}>
            {error}
          </div>
        )}

        {view === "login" && (
          <>
            <h2 style={{ fontSize: "1.25rem", marginBottom: "0.5rem" }}>
              {getTranslation(lang, "login_title")}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              {getTranslation(lang, "login_subtitle")}
            </p>

            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">{getTranslation(lang, "email_label")}</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  placeholder="conjoint@chaml.fr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="form-group">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <label className="form-label">{getTranslation(lang, "password_label")}</label>
                  <button 
                    type="button" 
                    onClick={() => { setView("forgot_password"); setError(""); }} 
                    style={{ background: "none", border: "none", color: "var(--primary)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                  >
                    {getTranslation(lang, "forgot_password_link")}
                  </button>
                </div>
                <input
                  className="input-field"
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }}>
                🔑 {getTranslation(lang, "btn_login")}
              </button>
            </form>

            <div style={{ textAlign: "center", marginTop: "1.5rem", fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.75rem", alignItems: "center" }}>
              <div>
                {getTranslation(lang, "no_account_yet")}{" "}
                <button 
                  onClick={() => { setView("register"); setError(""); }} 
                  style={{ background: "none", border: "none", color: "var(--primary)", fontWeight: "bold", cursor: "pointer", textDecoration: "underline" }}
                >
                  {getTranslation(lang, "create_account")}
                </button>
              </div>
            </div>

            {/* Google Authentication Section */}
            <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "1rem", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", width: "100%", gap: "1rem" }}>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
                <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>{getTranslation(lang, "or")}</span>
                <hr style={{ flex: 1, border: "none", borderTop: "1px solid var(--border-card)" }} />
              </div>

              <a
                href="/api/auth/google"
                className="btn btn-secondary"
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "0.75rem",
                  width: "100%",
                  padding: "0.75rem",
                  fontSize: "0.9rem",
                  fontWeight: "600",
                  textDecoration: "none",
                  border: "1px solid var(--border-card)",
                  borderRadius: "0.5rem",
                  backgroundColor: "rgba(255,255,255,0.02)",
                  color: "var(--text-main)",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.02)";
                }}
              >
                {/* SVG Google Logo */}
                <svg width="18" height="18" viewBox="0 0 18 18">
                  <path fill="#4285F4" d="M17.64 9.2c0-.63-.06-1.25-.16-1.84H9v3.47h4.84a4.14 4.14 0 0 1-1.8 2.71v2.26h2.91c1.7-1.56 2.69-3.86 2.69-6.6z"/>
                  <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.2l-2.91-2.26c-.8.54-1.83.86-3.05.86-2.34 0-4.32-1.58-5.03-3.7H.95v2.32A9 9 0 0 0 9 18z"/>
                  <path fill="#FBBC05" d="M3.97 10.7a5.4 5.4 0 0 1 0-3.4V4.98H.95a9 9 0 0 0 0 8.04l3.02-2.32z"/>
                  <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.35L15 2.1A9 9 0 0 0 .95 4.98l3.02 2.32C4.68 5.16 6.66 3.58 9 3.58z"/>
                </svg>
                {getTranslation(lang, "login_gmail")}
              </a>
            </div>
          </>
        )}

        {view === "register" && (
          <form onSubmit={handleRegister} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "500px", margin: "0 auto" }}>
            <h2 style={{ fontSize: "1.3rem" }}>{getTranslation(lang, "reg_title")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: "-1rem" }}>
              {getTranslation(lang, "reg_subtitle")}
            </p>
            {/* Honeypot field for bot trapping */}
            <input 
              type="text" 
              name="hp_website_check" 
              value={hpWebsiteCheck} 
              onChange={e => setHpWebsiteCheck(e.target.value)} 
              style={{ display: "none", position: "absolute", left: "-9999px" }} 
              tabIndex={-1} 
              autoComplete="off" 
            />

            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              <h3 style={{ color: "var(--primary)", fontSize: "1.05rem", borderBottom: "1px solid var(--border-card)", paddingBottom: "0.25rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                <FranceFlag size={16} /> {getTranslation(lang, "reg_applicant_header")}
              </h3>
              
              <div className="form-group">
                <label className="form-label">{getTranslation(lang, "email_label")}*</label>
                <input 
                  className="input-field" 
                  type="email" 
                  placeholder="conjoint@chaml.fr" 
                  value={frEmail} 
                  onChange={e => setFrEmail(e.target.value)} 
                  required 
                  readOnly={isGoogleSignup}
                  style={isGoogleSignup ? { opacity: 0.75, cursor: "not-allowed" } : {}}
                />
              </div>
              {!isGoogleSignup && (
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "password_label")}*</label>
                  <input className="input-field" type="password" value={frPassword} onChange={e => setFrPassword(e.target.value)} required />
                </div>
              )}
              <div className="form-row-2col">
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "reg_firstname")}</label>
                  <input className="input-field" type="text" value={frFirstName} onChange={e => setFrFirstName(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "reg_lastname")}</label>
                  <input className="input-field" type="text" value={frLastName} onChange={e => setFrLastName(e.target.value)} required />
                </div>
              </div>
              <div className="form-group" style={{ position: "relative" }}>
                <label className="form-label">{getTranslation(lang, "reg_address")}</label>
                <input 
                  className="input-field" 
                  type="text" 
                  placeholder={getTranslation(lang, "reg_address_placeholder")} 
                  value={frAddress} 
                  onChange={e => handleAddressChange(e.target.value)} 
                  required 
                />
                {showSuggestions && addressSuggestions.length > 0 && (
                  <ul style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "var(--bg-card)",
                    backdropFilter: "blur(12px)",
                    color: "var(--text-main)",
                    border: "1px solid var(--border-card)",
                    borderRadius: "0.5rem",
                    zIndex: 10,
                    listStyle: "none",
                    padding: 0,
                    margin: "0.25rem 0 0 0",
                    maxHeight: "200px",
                    overflowY: "auto",
                    boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)"
                  }}>
                    {addressSuggestions.map((s, idx) => (
                      <li 
                        key={idx} 
                        onClick={() => handleSelectAddress(s)}
                        style={{
                          padding: "0.6rem 1rem",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          borderBottom: "1px solid var(--border-card)",
                          transition: "background 0.2s",
                          color: "var(--text-main)"
                        }}
                        onMouseEnter={e => e.target.style.background = "rgba(13, 148, 136, 0.15)"}
                        onMouseLeave={e => e.target.style.background = "none"}
                      >
                        {s.properties.label}
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="form-group">
                <label className="form-label">{getTranslation(lang, "reg_phone")}</label>
                <input className="input-field" type="text" placeholder="+33 6..." value={frPhone} onChange={e => setFrPhone(e.target.value)} />
              </div>
              <div className="form-row-3col">
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "reg_city")}</label>
                  <input className="input-field" type="text" placeholder="Paris" value={frCity} onChange={e => setFrCity(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "reg_department")}</label>
                  <input className="input-field" type="text" placeholder="75" value={frDep} onChange={e => setFrDep(e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "reg_zone")}</label>
                  <select className="select-dropdown" style={{ padding: "0.7rem" }} value={frZone} onChange={e => setFrZone(e.target.value)}>
                    <option value="A">Zone A</option>
                    <option value="B">Zone B</option>
                    <option value="C">Zone C</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">{getTranslation(lang, "reg_surface")}</label>
                <input className="input-field" type="number" value={frSurface} onChange={e => setFrSurface(e.target.value)} />
              </div>
            </div>

            <div className="form-action-group">
              <button type="submit" className="btn btn-primary" style={{ padding: "0.8rem 1.5rem", flex: 1 }}>
                {getTranslation(lang, "reg_btn_submit")}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => { setView("login"); setError(""); }}>
                {getTranslation(lang, "reg_btn_back_login")}
              </button>
            </div>
          </form>
        )}

        {view === "unverified" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "1rem" }}>
            <span style={{ fontSize: "3rem", display: "block", marginBottom: "1rem" }}>📧</span>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{getTranslation(lang, "unverified_title")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              {getTranslation(lang, "unverified_desc", { email: pendingEmail })}
            </p>

            {resendSuccess && (
              <div style={{
                background: "rgba(16, 185, 129, 0.1)",
                color: "var(--success)",
                padding: "0.8rem",
                borderRadius: "0.5rem",
                marginBottom: "1rem",
                fontSize: "0.85rem",
                fontWeight: 600
              }}>
                ✓ {resendSuccess}
              </div>
            )}

            <button 
              className="btn btn-primary" 
              onClick={handleResendVerification}
              disabled={resendLoading}
              style={{ width: "100%", padding: "0.8rem", marginBottom: "1rem" }}
            >
              {resendLoading ? "⏳..." : getTranslation(lang, "unverified_resend_btn")}
            </button>

            <button 
              className="btn btn-secondary" 
              onClick={() => setView("login")}
              style={{ width: "100%", padding: "0.8rem" }}
            >
              {getTranslation(lang, "reg_btn_back_login")}
            </button>
          </div>
        )}

        {view === "accept_invite" && (
          <form onSubmit={handleAcceptInvite} className="fade-in" style={{ display: "flex", flexDirection: "column", gap: "1.5rem", maxWidth: "450px", margin: "0 auto" }}>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <MoroccoFlag size={36} />
              <span style={{ fontSize: "2rem" }}>🤝</span>
              <FranceFlag size={36} />
            </div>
            <h2 style={{ fontSize: "1.3rem", textAlign: "center" }}>{getTranslation(lang, "invite_title")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", textAlign: "center", lineHeight: "1.5" }}>
              {getTranslation(lang, "invite_welcome")}
            </p>

            {inviteSuccess && (
              <div style={{ background: "var(--success-bg)", color: "var(--success)", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontWeight: 600 }}>
                ✓ {inviteSuccess}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">{getTranslation(lang, "invite_email_lbl")}</label>
              <input className="input-field" type="email" value={frEmail} disabled />
            </div>

            <div className="form-group">
              <label className="form-label">{getTranslation(lang, "invite_pass_lbl")}</label>
              <input 
                className="input-field" 
                type="password" 
                required 
                value={invitePassword} 
                onChange={e => setInvitePassword(e.target.value)} 
              />
            </div>

            <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
              <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }}>
                {getTranslation(lang, "invite_btn")}
              </button>
            </div>
          </form>
        )}

        {view === "unapproved" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "1rem" }}>
            <span style={{ fontSize: "3.5rem", display: "block", marginBottom: "1rem", animation: "pulse 2s infinite" }}>⏳</span>
            <h2 style={{ fontSize: "1.4rem", marginBottom: "0.5rem" }}>{getTranslation(lang, "unapproved_title")}</h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", lineHeight: "1.5", marginBottom: "1.5rem" }}>
              {getTranslation(lang, "unapproved_desc")}
            </p>

            <div style={{
              background: "rgba(13, 148, 136, 0.08)",
              border: "1px solid rgba(13, 148, 136, 0.2)",
              padding: "1.2rem",
              borderRadius: "0.75rem",
              marginBottom: "2rem",
              fontSize: "0.85rem",
              textAlign: "left",
              color: "var(--text-muted)"
            }}>
              ⚙️ <strong>Note administrative :</strong><br />
              Connectez-vous en tant qu'administrateur avec le compte <strong>admin@chaml.fr</strong> (mot de passe temporaire s'affiche dans les logs de la console du serveur) pour approuver ce nouveau dossier dans l'onglet "Gestion des Comptes".
            </div>

            <button 
              className="btn btn-secondary" 
              onClick={() => setView("login")}
              style={{ width: "100%", padding: "0.8rem" }}
            >
              {getTranslation(lang, "reg_btn_back_login")}
            </button>
          </div>
        )}

        {view === "forgot_password" && (
          <div className="fade-in">
            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
              {lang === "ar" ? "نسيت كلمة المرور" : lang === "en" ? "Forgot Password" : "Mot de passe oublié"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              {lang === "ar" 
                ? "أدخل بريدك الإلكتروني وسنرسل لك رابطًا لإعادة تعيين كلمة المرور." 
                : lang === "en" 
                ? "Enter your email address and we will send you a password reset link." 
                : "Saisissez votre adresse email et nous vous enverrons un lien de réinitialisation."}
            </p>

            {forgotSuccess && (
              <div className="badge badge-approved" style={{ width: "100%", padding: "0.75rem", marginBottom: "1.25rem", display: "block", textAlign: "center" }}>
                {forgotSuccess}
              </div>
            )}

            <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <div className="form-group">
                <label className="form-label">{getTranslation(lang, "email_label")}</label>
                <input
                  className="input-field"
                  type="email"
                  required
                  placeholder="anass@chaml.fr"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }} disabled={forgotLoading}>
                  {forgotLoading ? "..." : lang === "ar" ? "إرسال الرابط" : lang === "en" ? "Send Reset Link" : "Envoyer le lien"}
                </button>
                <button type="button" className="btn btn-secondary" style={{ width: "100%", padding: "0.8rem" }} onClick={() => { setView("login"); setError(""); setForgotSuccess(""); }}>
                  {lang === "ar" ? "رجوع" : lang === "en" ? "Back" : "Retour"}
                </button>
              </div>
            </form>
          </div>
        )}

        {view === "reset_password" && (
          <div className="fade-in">
            <h2 style={{ fontSize: "1.3rem", marginBottom: "0.5rem" }}>
              {lang === "ar" ? "تعيين كلمة مرور جديدة" : lang === "en" ? "Reset Password" : "Réinitialisation du mot de passe"}
            </h2>
            <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
              {lang === "ar" 
                ? "الرجاء إدخال كلمة المرور الجديدة وتأكيدها." 
                : lang === "en" 
                ? "Please enter your new password." 
                : "Veuillez saisir et confirmer votre nouveau mot de passe."}
            </p>

            {resetSuccess && (
              <div style={{ textAlign: "center" }}>
                <div className="badge badge-approved" style={{ width: "100%", padding: "0.75rem", marginBottom: "1.25rem", display: "block" }}>
                  {resetSuccess}
                </div>
                <button type="button" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }} onClick={() => { setView("login"); setError(""); setResetSuccess(""); }}>
                  {lang === "ar" ? "تسجيل الدخول" : lang === "en" ? "Go to Login" : "Se connecter"}
                </button>
              </div>
            )}

            {!resetSuccess && (
              <form onSubmit={handleResetPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <div className="form-group">
                  <label className="form-label">
                    {lang === "ar" ? "كلمة المرور الجديدة" : lang === "en" ? "New Password" : "Nouveau mot de passe"}
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    {lang === "ar" ? "تأكيد كلمة المرور" : lang === "en" ? "Confirm Password" : "Confirmer le mot de passe"}
                  </label>
                  <input
                    className="input-field"
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <button type="submit" className="btn btn-primary" style={{ width: "100%", padding: "0.8rem" }} disabled={resetLoading}>
                    {resetLoading ? "..." : lang === "ar" ? "تحديث كلمة المرور" : lang === "en" ? "Update Password" : "Mettre à jour le mot de passe"}
                  </button>
                  <button type="button" className="btn btn-secondary" style={{ width: "100%", padding: "0.8rem" }} onClick={() => { setView("login"); setError(""); }}>
                    {lang === "ar" ? "إلغاء" : lang === "en" ? "Cancel" : "Annuler"}
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

      </div>
    </div>
  );
}
