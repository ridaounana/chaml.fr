import React, { useState, useEffect } from "react";
import { getMe, getConfig, logoutUser, verifyStripeSession } from "./utils/api";
import { getTranslation } from "./utils/i18n";
import Navbar from "./components/Navbar";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Simulators from "./components/Simulators";
import StepsGuide from "./components/StepsGuide";
import Admin from "./pages/Admin";

export default function App() {
  const [session, setSession] = useState(null);
  const [lang, setLang] = useState("fr");
  const [theme, setTheme] = useState("light");
  const [config, setConfigState] = useState({});
  const [activePage, setActivePage] = useState("dashboard");
  const [authView, setAuthView] = useState("landing"); // "landing" | "login" | "register"
  const [paymentStatus, setPaymentStatus] = useState(null);
  const [emailVerifiedAlert, setEmailVerifiedAlert] = useState(false);

  // Load Configuration and Session from API on mount
  useEffect(() => {
    getConfig()
      .then(data => setConfigState(data))
      .catch(err => console.error("Error loading config:", err));

    const params = new URLSearchParams(window.location.search);
    const inviteCoupleId = params.get("inviteCoupleId");
    const inviteEmail = params.get("inviteEmail");
    const pay = params.get("payment");
    const sessionId = params.get("session_id");
    const isVerified = params.get("verified");
    const googleRegister = params.get("google_register");

    if (pay) {
      setPaymentStatus(pay);
    }

    if (isVerified === "true") {
      setEmailVerifiedAlert(true);
    }

    if (inviteCoupleId && inviteEmail) {
      logoutUser()
        .then(() => {
          setSession(null);
          setAuthView("login");
        })
        .catch(() => {
          setSession(null);
          setAuthView("login");
        });
    } else {
      getMe()
        .then(data => {
          if (data.user) {
            setSession(data.user);
            if (data.user.role === "admin") {
              setActivePage("admin");
            } else {
              setActivePage("dashboard");
              
              // Verify stripe checkout session if returning from successful checkout
              if (pay === "success" && sessionId) {
                verifyStripeSession(sessionId)
                  .then(() => {
                    // Fetch fresh session state to reflect upgraded Premium status
                    getMe().then(fresh => {
                      if (fresh.user) setSession(fresh.user);
                    });
                  })
                  .catch(err => console.error("Stripe verify session error:", err));
              }
            }
          } else {
            // If they just verified their email but have no session cookie, show the login form
            if (isVerified === "true") {
              setAuthView("login");
            } else if (googleRegister === "true") {
              setAuthView("register");
            }
          }
        })
        .catch(err => {
          console.error("Error loading session:", err);
          if (isVerified === "true") {
            setAuthView("login");
          } else if (googleRegister === "true") {
            setAuthView("register");
          }
        })
        .finally(() => {
          if (pay || isVerified || googleRegister) {
            // Clean URL parameters so they are removed from the browser bar (managed inside Login.jsx for Google register)
            if (!googleRegister) {
              window.history.replaceState({}, document.title, window.location.pathname);
            }
          }
        });
    }

    // Apply basic direction on initial load
    document.documentElement.dir = "ltr";
    document.documentElement.lang = "fr";
  }, []);

  const handleLogin = (userSession) => {
    setSession(userSession);
    if (userSession.role === "admin") {
      setActivePage("admin");
    } else {
      setActivePage("dashboard");
    }
  };

  const handleLogout = () => {
    logoutUser()
      .then(() => {
        setSession(null);
        setAuthView("landing");
        setActivePage("dashboard");
      })
      .catch(err => console.error("Error logging out:", err));
  };

  const reloadConfig = () => {
    getConfig()
      .then(data => setConfigState(data))
      .catch(err => console.error("Error re-loading config:", err));
  };

  // Main page content router switcher
  const renderPageContent = () => {
    if (!session) return null;

    switch (activePage) {
      case "dashboard":
        if (session.role === "admin") {
          return (
            <div style={{ textAlign: "center", padding: "3rem" }}>
              <h3>Please select "Administration" page to review files as Admin.</h3>
            </div>
          );
        }
        return (
          <Dashboard
            lang={lang}
            user={session}
          />
        );
      case "simulators":
        return <Simulators lang={lang} config={config} user={session} />;
      case "guide":
        return <StepsGuide lang={lang} />;
      case "admin":
        if (session.role !== "admin") {
          return <div style={{ padding: "2rem" }}>Access Denied.</div>;
        }
        return (
          <Admin
            lang={lang}
            config={config}
            onConfigUpdated={reloadConfig}
          />
        );
      default:
        return <Dashboard lang={lang} user={session} />;
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* Stripe Payment Callback Toasts */}
      {paymentStatus === "success" && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          backgroundColor: "#0d9488",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontWeight: "500",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <span>🎉 <strong>Paiement réussi !</strong> Votre compte Chaml est Premium à vie.</span>
          <button 
            onClick={() => setPaymentStatus(null)} 
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {paymentStatus === "cancel" && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          backgroundColor: "#ef4444",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontWeight: "500",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <span>❌ <strong>Paiement annulé.</strong> Si vous rencontrez un problème, écrivez-nous.</span>
          <button 
            onClick={() => setPaymentStatus(null)} 
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      {/* Email Verification Success Toast */}
      {emailVerifiedAlert && (
        <div style={{
          position: "fixed",
          top: "80px",
          right: "20px",
          backgroundColor: "#0d9488",
          color: "white",
          padding: "1rem 1.5rem",
          borderRadius: "0.5rem",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.3)",
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
          fontWeight: "500",
          border: "1px solid rgba(255,255,255,0.1)"
        }}>
          <span>🎉 <strong>Adresse e-mail vérifiée !</strong> {session ? "Votre compte est activé avec succès." : "Votre compte est activé. Connectez-vous pour commencer."}</span>
          <button 
            onClick={() => setEmailVerifiedAlert(false)} 
            style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontWeight: "bold", fontSize: "1.2rem", padding: 0 }}
          >
            ×
          </button>
        </div>
      )}

      <Navbar
        user={session}
        role={session ? session.role : null}
        onLogout={handleLogout}
        lang={lang}
        setLang={setLang}
        theme={theme}
        setTheme={setTheme}
        config={config}
      />

      {!session ? (
        <main className="app-container">
          {authView === "landing" ? (
            <Landing 
              lang={lang} 
              onNavigate={(view) => setAuthView(view)} 
            />
          ) : (
            <Login 
              lang={lang} 
              onLoginSuccess={handleLogin} 
              config={config} 
              initialView={authView}
              onBackToLanding={() => setAuthView("landing")}
            />
          )}
        </main>
      ) : (
        <main className="app-container">
          {/* Internal Navigation Menu (Tab switcher) */}
          <div style={{
            display: "flex",
            gap: "1rem",
            marginBottom: "1.5rem",
            flexWrap: "wrap",
            borderBottom: "1px solid var(--border-card)",
            paddingBottom: "1rem"
          }}>
            {session.role !== "admin" && (
              <button
                className={`btn ${activePage === "dashboard" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActivePage("dashboard")}
              >
                📁 {getTranslation(lang, "nav_dashboard")}
              </button>
            )}

            <button
              className={`btn ${activePage === "simulators" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActivePage("simulators")}
            >
              📊 {getTranslation(lang, "nav_simulators")}
            </button>

            <button
              className={`btn ${activePage === "guide" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setActivePage("guide")}
            >
              🧭 {getTranslation(lang, "nav_guide")}
            </button>

            {session.role === "admin" && (
              <button
                className={`btn ${activePage === "admin" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setActivePage("admin")}
              >
                ⚙️ {getTranslation(lang, "nav_admin")}
              </button>
            )}
          </div>

          {/* Render Active View */}
          {renderPageContent()}
        </main>
      )}
    </div>
  );
}
