import React, { useState, useEffect } from "react";
import { getTranslation } from "../utils/i18n";
import { FranceFlag, MoroccoFlag } from "../components/Flag";
import { 
  getAdminCouples, 
  deleteCoupleAccount, 
  toggleFreezeUser, 
  approveCouple, 
  reviewDocument, 
  deleteDocumentAdmin, 
  updateAdminSettings, 
  getAdminLogs, 
  updateSubmittedDate,
  registerApplicant,
  getDownloadUrl,
  changePassword
} from "../utils/api";
import { encryptSMTPPassword, decryptSMTPPassword } from "../utils/crypto";
import { searchAddress, getZoneFromPostcode } from "../utils/address";

export default function Admin({ lang, config, onConfigUpdated }) {
  const [activeTab, setActiveTab] = useState("users");
  const [couples, setCouples] = useState([]);
  const [selectedCoupleId, setSelectedCoupleId] = useState("");
  const [auditLogsByDate, setAuditLogsByDate] = useState({});
  const [loading, setLoading] = useState(true);

  // Change Password Form State
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordChangeSuccess, setPasswordChangeSuccess] = useState("");
  const [passwordChangeError, setPasswordChangeError] = useState("");

  // Site configuration inputs
  const [appName, setAppName] = useState(config.appName || "Chaml");
  const [appLogo, setAppLogo] = useState(config.appLogo || "🕌");
  const [smicValue, setSmicValue] = useState(config.smicValue || 1823);
  const [surfaceZoneA, setSurfaceZoneA] = useState(config.surfaceZoneA || 22);
  const [surfaceZoneB, setSurfaceZoneB] = useState(config.surfaceZoneB || 24);
  const [surfaceZoneC, setSurfaceZoneC] = useState(config.surfaceZoneC || 28);
  
  const [saveSuccess, setSaveSuccess] = useState(false);

  // SMTP Configuration State
  const [smtpHost, setSmtpHost] = useState(config.smtpConfig?.host || "smtp.mailgun.org");
  const [smtpPort, setSmtpPort] = useState(config.smtpConfig?.port || 587);
  const [smtpUser, setSmtpUser] = useState(config.smtpConfig?.user || "");
  const [smtpPassword, setSmtpPassword] = useState(config.smtpConfig?.password ? "••••••••••••••••" : "");
  const [smtpProtocol, setSmtpProtocol] = useState(config.smtpConfig?.protocol || "TLS");
  const [smtpSenderName, setSmtpSenderName] = useState(config.smtpConfig?.senderName || "Chaml Team");
  const [smtpSenderEmail, setSmtpSenderEmail] = useState(config.smtpConfig?.senderEmail || "noreply@chaml.ma");

  // Create Couple Form State
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [frEmail, setFrEmail] = useState("");
  const [frPassword, setFrPassword] = useState("");
  const [frFirstName, setFrFirstName] = useState("");
  const [frLastName, setFrLastName] = useState("");
  const [frPhone, setFrPhone] = useState("");
  const [frCity, setFrCity] = useState("");
  const [frDep, setFrDep] = useState("");
  const [frZone, setFrZone] = useState("A");
  const [frSurface, setFrSurface] = useState("30");

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

  // Inspect Comments State
  const [docComments, setDocComments] = useState({});

  const loadAdminData = () => {
    setLoading(true);
    getAdminCouples()
      .then(res => {
        setCouples(res.couples);
        if (res.couples.length > 0 && !selectedCoupleId) {
          setSelectedCoupleId(res.couples[0].id);
        }
      })
      .catch(err => console.error("Error loading admin couples:", err))
      .finally(() => setLoading(false));

    getAdminLogs()
      .then(res => {
        setAuditLogsByDate(res.logs);
      })
      .catch(err => console.error("Error loading audit logs:", err));
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  // Update visual configuration states when main config changes
  useEffect(() => {
    if (config.appName) {
      setAppName(config.appName);
      setAppLogo(config.appLogo);
      setSmicValue(config.smicValue);
      setSurfaceZoneA(config.surfaceZoneA);
      setSurfaceZoneB(config.surfaceZoneB);
      setSurfaceZoneC(config.surfaceZoneC);
      setSmtpHost(config.smtpConfig?.host || "smtp.mailgun.org");
      setSmtpPort(config.smtpConfig?.port || 587);
      setSmtpUser(config.smtpConfig?.user || "");
      setSmtpPassword(config.smtpConfig?.password ? "••••••••••••••••" : "");
      setSmtpProtocol(config.smtpConfig?.protocol || "TLS");
      setSmtpSenderName(config.smtpConfig?.senderName || "Chaml Team");
      setSmtpSenderEmail(config.smtpConfig?.senderEmail || "noreply@chaml.ma");
    }
  }, [config]);

  const selectedCouple = couples.find(c => c.id === selectedCoupleId) || couples[0];

  const handleSaveConfig = (e) => {
    e.preventDefault();
    const settings = {
      appName,
      appLogo,
      smicValue: parseFloat(smicValue) || config.smicValue,
      surfaceZoneA: parseFloat(surfaceZoneA) || config.surfaceZoneA,
      surfaceZoneB: parseFloat(surfaceZoneB) || config.surfaceZoneB,
      surfaceZoneC: parseFloat(surfaceZoneC) || config.surfaceZoneC,
      smtpConfig: {
        host: smtpHost,
        port: parseInt(smtpPort) || 587,
        user: smtpUser,
        password: smtpPassword === "••••••••••••••••" ? (config.smtpConfig?.password || "") : encryptSMTPPassword(smtpPassword),
        protocol: smtpProtocol,
        senderName: smtpSenderName,
        senderEmail: smtpSenderEmail
      }
    };

    updateAdminSettings(settings)
      .then(() => {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        onConfigUpdated(); // Reload global app configuration
        loadAdminData();
      })
      .catch(err => alert(`Failed to save settings: ${err.message}`));
  };

  // Change submission date to help test 6-month warning alert
  const handleSubmissionDateChange = (newDateStr) => {
    updateSubmittedDate(selectedCoupleId, newDateStr)
      .then(() => {
        loadAdminData();
      })
      .catch(err => alert(`Failed to update date: ${err.message}`));
  };

  // Toggle user account frozen/suspend status
  const handleToggleFreezeUser = (userEmail, isCurrentlyFrozen) => {
    toggleFreezeUser(userEmail, !isCurrentlyFrozen)
      .then(() => {
        loadAdminData();
      })
      .catch(err => alert(`Operation failed: ${err.message}`));
  };

  // Approve couple account
  const handleApproveCouple = (coupleId) => {
    approveCouple(coupleId)
      .then(() => {
        loadAdminData();
      })
      .catch(err => alert(`Approval failed: ${err.message}`));
  };

  // Delete couple account pairing
  const handleDeleteCoupleAccount = (coupleId) => {
    if (!window.confirm(`Are you sure you want to permanently delete couple ID ${coupleId}? All their documents will be lost.`)) {
      return;
    }
    deleteCoupleAccount(coupleId)
      .then(() => {
        setSelectedCoupleId("");
        loadAdminData();
      })
      .catch(err => alert(`Deletion failed: ${err.message}`));
  };

  // Admin delete document file
  const handleDeleteFile = (docId) => {
    if (!window.confirm("Are you sure you want to delete this file?")) {
      return;
    }
    deleteDocumentAdmin(selectedCoupleId, docId)
      .then(() => {
        loadAdminData();
      })
      .catch(err => alert(`Deletion failed: ${err.message}`));
  };

  // Document review (Approve / Reject / Comment)
  const handleReviewDoc = (docId, status) => {
    const comment = docComments[docId] || "";
    reviewDocument(selectedCoupleId, docId, status, comment)
      .then(() => {
        // Clear comment box
        setDocComments(prev => ({ ...prev, [docId]: "" }));
        loadAdminData();
      })
      .catch(err => alert(`Review submission failed: ${err.message}`));
  };

  const handleCreateCouple = (e) => {
    e.preventDefault();
    if (!frEmail || !frFirstName || !frLastName) {
      alert("Please fill in the required name and email.");
      return;
    }

    const frData = {
      email: frEmail,
      password: frPassword || "TempPass123!", // auto password fallback
      firstName: frFirstName,
      lastName: frLastName,
      phone: frPhone,
      city: frCity,
      department: frDep,
      zone: frZone,
      livingSurface: frSurface
    };

    registerApplicant(frData)
      .then(res => {
        if (res.success) {
          setShowCreateForm(false);
          setSelectedCoupleId(res.coupleId);
          loadAdminData();
          // Clear inputs
          setFrEmail("");
          setFrFirstName("");
          setFrLastName("");
          setFrPhone("");
          setFrCity("");
          setFrDep("");
        }
      })
      .catch(err => alert(`Failed to create couple accounts: ${err.message}`));
  };

  const handlePasswordChangeSubmit = (e) => {
    e.preventDefault();
    if (!currentPassword || !newPassword) {
      setPasswordChangeError("Veuillez remplir tous les champs de mot de passe.");
      return;
    }
    changePassword(currentPassword, newPassword)
      .then(() => {
        setPasswordChangeSuccess("Votre mot de passe administrateur a été mis à jour avec succès !");
        setPasswordChangeError("");
        setCurrentPassword("");
        setNewPassword("");
        setTimeout(() => setPasswordChangeSuccess(""), 4000);
      })
      .catch(err => {
        setPasswordChangeError(err.message || "Erreur lors du changement de mot de passe.");
        setPasswordChangeSuccess("");
      });
  };

  const getDossierTotalFiles = (c) => {
    return c.dossier.franceDocs.filter(d => d.uploaded).length + c.dossier.moroccoDocs.filter(d => d.uploaded).length;
  };

  const sortedDates = Object.keys(auditLogsByDate).sort((a, b) => b.localeCompare(a));

  if (loading && couples.length === 0) {
    return <div style={{ padding: "3rem", textAlign: "center" }}>⏳ Loading moderator workspace...</div>;
  }

  return (
    <div className="fade-in" style={{ marginTop: "1rem" }}>
      <div className="admin-header-row">
        <div>
          <h1 style={{ fontSize: "1.8rem" }}>⚙️ {getTranslation(lang, "admin_title")}</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
            Platform Moderator portal. Manage users, delete/download files, and audit logs.
          </p>
        </div>
      </div>

      <div className="admin-grid">
        {/* Admin Navigation Sidebar */}
        <div className="admin-sidebar">
          <button
            className={`admin-nav-item ${activeTab === "users" ? "active" : ""}`}
            onClick={() => setActiveTab("users")}
          >
            👥 {getTranslation(lang, "admin_users_tab")}
          </button>
          <button
            className={`admin-nav-item ${activeTab === "dossiers" ? "active" : ""}`}
            onClick={() => setActiveTab("dossiers")}
          >
            📂 Manage Documents
          </button>
          <button
            className={`admin-nav-item ${activeTab === "logs" ? "active" : ""}`}
            onClick={() => setActiveTab("logs")}
          >
            📜 Daily Audit Logs
          </button>
          <button
            className={`admin-nav-item ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            🛠️ {getTranslation(lang, "admin_settings_tab")}
          </button>

          {/* Quick Stats widget */}
          <div className="glass-card" style={{ padding: "1.25rem", marginTop: "1rem" }}>
            <h4 style={{ fontSize: "0.9rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>Stats Overview</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", fontSize: "0.85rem" }}>
              <div>Total Couples: <strong>{couples.length}</strong></div>
              <div>Submitted Dossiers: <strong>{couples.filter(c => c.dossier.status === "submitted").length}</strong></div>
              <div>Total PDF Documents: <strong>{couples.reduce((acc, c) => acc + c.dossier.franceDocs.filter(d => d.uploaded).length + c.dossier.moroccoDocs.filter(d => d.uploaded).length, 0)}</strong></div>
              <div>Frozen Users: <strong>{couples.reduce((acc, c) => acc + (c.demandeur.isFrozen ? 1 : 0) + (c.beneficiaire?.isFrozen ? 1 : 0), 0)}</strong></div>
            </div>
          </div>
        </div>

        {/* Content Area */}
        <div className="glass-card" style={{ padding: "2rem" }}>
          {activeTab === "users" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
                <h2 style={{ fontSize: "1.4rem" }}>{getTranslation(lang, "admin_user_list")}</h2>
                <button
                  className="btn btn-primary"
                  onClick={() => setShowCreateForm(!showCreateForm)}
                >
                  {showCreateForm ? "Close Form" : "➕ Create Couple Account"}
                </button>
              </div>

              {/* Create Couple Form */}
              {showCreateForm && (
                <form onSubmit={handleCreateCouple} style={{
                  background: "rgba(255, 255, 255, 0.02)",
                  padding: "1.5rem",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-card)",
                  marginBottom: "2rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "1.5rem"
                }}>
                  <h3 style={{ fontSize: "1.1rem" }}>🆕 Create New Applicant Account</h3>
                  
                  <div style={{ maxWidth: "500px", display: "flex", flexDirection: "column", gap: "1rem" }}>
                    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                      <h4 style={{ color: "var(--primary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <FranceFlag size={16} /> Conjoint(e) en France (Applicant)
                      </h4>
                      
                      <div className="form-group">
                        <label className="form-label">Email (Required)*</label>
                        <input className="input-field" type="email" value={frEmail} onChange={e => setFrEmail(e.target.value)} required />
                      </div>
                      <div className="form-group">
                        <label className="form-label">Password*</label>
                        <input className="input-field" type="password" value={frPassword} onChange={e => setFrPassword(e.target.value)} required />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                        <div className="form-group">
                          <label className="form-label">First Name*</label>
                          <input className="input-field" type="text" value={frFirstName} onChange={e => setFrFirstName(e.target.value)} required />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Last Name*</label>
                          <input className="input-field" type="text" value={frLastName} onChange={e => setFrLastName(e.target.value)} required />
                        </div>
                      </div>
                      <div className="form-group" style={{ position: "relative" }}>
                        <label className="form-label">Adresse complète en France*</label>
                        <input 
                          className="input-field" 
                          type="text" 
                          placeholder="Saisissez l'adresse de l'applicant" 
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
                            background: "#1e293b",
                            border: "1px solid var(--border-card)",
                            borderRadius: "0.5rem",
                            zIndex: 10,
                            listStyle: "none",
                            padding: 0,
                            margin: "0.25rem 0 0 0",
                            maxHeight: "200px",
                            overflowY: "auto",
                            boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.5)"
                          }}>
                            {addressSuggestions.map((s, idx) => (
                              <li 
                                key={idx} 
                                onClick={() => handleSelectAddress(s)}
                                style={{
                                  padding: "0.6rem 1rem",
                                  cursor: "pointer",
                                  fontSize: "0.85rem",
                                  borderBottom: "1px solid rgba(255,255,255,0.05)",
                                  transition: "background 0.2s"
                                }}
                                onMouseEnter={e => e.target.style.background = "rgba(255,255,255,0.05)"}
                                onMouseLeave={e => e.target.style.background = "none"}
                              >
                                {s.properties.label}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>

                      <div className="form-group">
                        <label className="form-label">Phone</label>
                        <input className="input-field" type="text" placeholder="+33..." value={frPhone} onChange={e => setFrPhone(e.target.value)} />
                      </div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.5rem" }}>
                        <div className="form-group">
                          <label className="form-label">City</label>
                          <input className="input-field" type="text" value={frCity} onChange={e => setFrCity(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Dep.</label>
                          <input className="input-field" type="text" placeholder="75" value={frDep} onChange={e => setFrDep(e.target.value)} />
                        </div>
                        <div className="form-group">
                          <label className="form-label">Zone</label>
                          <select className="select-dropdown" style={{ padding: "0.7rem" }} value={frZone} onChange={e => setFrZone(e.target.value)}>
                            <option value="A">A</option>
                            <option value="B">B</option>
                            <option value="C">C</option>
                          </select>
                        </div>
                      </div>
                      <div className="form-group">
                        <label className="form-label">Living Surface (m²)</label>
                        <input className="input-field" type="number" value={frSurface} onChange={e => setFrSurface(e.target.value)} />
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "1rem", marginTop: "1rem" }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
                      ✓ Save Applicant Account
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateForm(false)}>
                      Cancel
                    </button>
                  </div>
                </form>
              )}
              
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{getTranslation(lang, "admin_col_couple")}</th>
                    <th>{getTranslation(lang, "admin_col_role")} (FR / MA)</th>
                    <th>Uploaded Files</th>
                    <th>Couple Account actions</th>
                  </tr>
                </thead>
                <tbody>
                  {couples.map(c => (
                    <tr key={c.id} style={{
                      cursor: "pointer",
                      background: selectedCoupleId === c.id ? "rgba(var(--primary-rgb), 0.08)" : "none"
                    }} onClick={() => setSelectedCoupleId(c.id)}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: "0.4rem" }}>
                          <strong>{c.demandeur.firstName} & {c.beneficiaire?.firstName || "Pending Invite"}</strong>
                          {!c.demandeur.isApproved && (
                            <span className="badge badge-pending" style={{ padding: "0.15rem 0.4rem", fontSize: "0.65rem" }}>
                              Awaiting Approval
                            </span>
                          )}
                          {!c.demandeur.isEmailVerified && (
                            <span className="badge badge-rejected" style={{ padding: "0.15rem 0.4rem", fontSize: "0.65rem", background: "rgba(239, 68, 68, 0.1)", color: "#ef4444" }}>
                              Unverified Email
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>ID: {c.id}</div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <FranceFlag size={14} /> {c.demandeur.email} {c.demandeur.isFrozen && <span style={{ color: "var(--danger)", fontWeight: "bold" }}>(Frozen)</span>}
                        </div>
                        <div style={{ fontSize: "0.85rem", display: "flex", alignItems: "center", gap: "0.35rem" }}>
                          <MoroccoFlag size={14} /> {c.beneficiaire ? (
                            <>
                              {c.beneficiaire.email} {c.beneficiaire.isFrozen && <span style={{ color: "var(--danger)", fontWeight: "bold" }}>(Frozen)</span>}
                            </>
                          ) : (
                            <span style={{ fontStyle: "italic", color: "var(--text-muted)" }}>Not invited yet</span>
                          )}
                        </div>
                      </td>
                      <td>
                        <strong>{getDossierTotalFiles(c)} / 12</strong>
                      </td>
                      <td>
                        <button 
                          className="btn btn-danger" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteCoupleAccount(c.id);
                          }}
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        >
                          🗑️ Delete Account
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedCouple && (
                <div style={{
                  marginTop: "2rem",
                  padding: "1.5rem",
                  background: "rgba(255, 255, 255, 0.02)",
                  borderRadius: "0.75rem",
                  border: "1px solid var(--border-card)"
                }}>
                  <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem" }}>
                    👤 Account controls: {selectedCouple.demandeur.firstName} {selectedCouple.beneficiaire ? `& ${selectedCouple.beneficiaire.firstName}` : "(Spouse pending invitation)"}
                  </h3>

                  {!selectedCouple.demandeur.isApproved && (
                    <div style={{
                      background: "rgba(202, 138, 4, 0.08)",
                      border: "1px solid rgba(202, 138, 4, 0.2)",
                      padding: "1rem",
                      borderRadius: "0.5rem",
                      marginBottom: "1.5rem",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center"
                    }}>
                      <div>
                        <strong style={{ color: "var(--warning)" }}>⚠️ Awaiting Admin Approval</strong>
                        <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", margin: 0 }}>
                          Both spouse accounts are frozen/pending until an administrator approves them.
                        </p>
                      </div>
                      <button 
                        className="btn btn-primary" 
                        onClick={() => handleApproveCouple(selectedCouple.id)}
                        style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                      >
                        ✓ Approve Accounts
                      </button>
                    </div>
                  )}
                  
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2rem" }}>
                    {/* France Suspend Control */}
                    <div style={{ background: "rgba(255,255,255,0.01)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border-card)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                        <strong>Applicant (France)</strong>
                        <span className={`badge ${selectedCouple.demandeur.isFrozen ? "badge-rejected" : "badge-approved"}`}>
                          {selectedCouple.demandeur.isFrozen ? "Suspended" : "Active"}
                        </span>
                      </div>
                      <button 
                        className={`btn ${selectedCouple.demandeur.isFrozen ? "btn-primary" : "btn-danger"}`}
                        onClick={() => handleToggleFreezeUser(selectedCouple.demandeur.email, selectedCouple.demandeur.isFrozen)}
                        style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem" }}
                      >
                        {selectedCouple.demandeur.isFrozen ? "🔓 Reactivate Account" : "❄️ Suspend Account"}
                      </button>
                    </div>

                    {/* Morocco Suspend Control */}
                    <div style={{ background: "rgba(255,255,255,0.01)", padding: "1rem", borderRadius: "0.5rem", border: "1px solid var(--border-card)" }}>
                      {selectedCouple.beneficiaire ? (
                        <>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem" }}>
                            <strong>Beneficiary (Morocco)</strong>
                            <span className={`badge ${selectedCouple.beneficiaire.isFrozen ? "badge-rejected" : "badge-approved"}`}>
                              {selectedCouple.beneficiaire.isFrozen ? "Suspended" : "Active"}
                            </span>
                          </div>
                          <button 
                            className={`btn ${selectedCouple.beneficiaire.isFrozen ? "btn-primary" : "btn-danger"}`}
                            onClick={() => handleToggleFreezeUser(selectedCouple.beneficiaire.email, selectedCouple.beneficiaire.isFrozen)}
                            style={{ width: "100%", padding: "0.5rem", fontSize: "0.8rem" }}
                          >
                            {selectedCouple.beneficiaire.isFrozen ? "🔓 Reactivate Account" : "❄️ Suspend Account"}
                          </button>
                        </>
                      ) : (
                        <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", height: "100%", textAlign: "center" }}>
                          <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", fontStyle: "italic" }}>Spouse has not been invited yet</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "dossiers" && (
            <div className="fade-in">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
                <h2 style={{ fontSize: "1.4rem" }}>📁 Document moderation queue</h2>
                
                {/* Switch Couples Selector */}
                <select
                  className="select-dropdown"
                  value={selectedCoupleId}
                  onChange={(e) => setSelectedCoupleId(e.target.value)}
                >
                  {couples.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.demandeur.firstName} & {c.beneficiaire?.firstName || "Pending Invite"} ({c.id})
                    </option>
                  ))}
                </select>
              </div>

              {selectedCouple && (
                <>
                  {/* Test alert date change trigger */}
                  <div style={{
                    background: "rgba(217, 119, 6, 0.08)",
                    border: "1px solid rgba(217, 119, 6, 0.2)",
                    padding: "1rem",
                    borderRadius: "0.75rem",
                    marginBottom: "1.5rem"
                  }}>
                    <label className="form-label" style={{ fontSize: "0.85rem", color: "var(--accent)" }}>
                      ⏳ Test Alert Timer: Change Submission date for {selectedCouple.demandeur.firstName}'s file:
                    </label>
                    <div style={{ display: "flex", gap: "1rem", marginTop: "0.5rem" }}>
                      <input 
                        className="input-field" 
                        type="date" 
                        style={{ maxWidth: "250px", padding: "0.4rem 0.8rem" }}
                        value={selectedCouple.dossier.submittedAt ? selectedCouple.dossier.submittedAt.slice(0,10) : ""}
                        onChange={(e) => handleSubmissionDateChange(e.target.value)}
                      />
                      <button 
                        className="btn btn-secondary"
                        onClick={() => {
                          const pastDate = new Date();
                          pastDate.setMonth(pastDate.getMonth() - 7);
                          handleSubmissionDateChange(pastDate.toISOString().slice(0, 10));
                        }}
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                      >
                        Force &gt; 6 months ago
                      </button>
                    </div>
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    {[...selectedCouple.dossier.franceDocs, ...selectedCouple.dossier.moroccoDocs].map(doc => (
                      <div key={doc.id} className="doc-row" style={{ padding: "0.75rem 1.25rem" }}>
                        <div className="doc-info">
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ fontSize: "0.8rem", opacity: 0.8, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              {doc.owner === "demandeur" ? <FranceFlag size={12} /> : <MoroccoFlag size={12} />}
                              [{doc.owner === "demandeur" ? "France" : "Maroc"}]
                            </span>
                            <span className="doc-name" style={{ fontSize: "0.95rem" }}>
                              {getTranslation(lang, doc.nameKey)}
                            </span>
                          </div>
                          {doc.uploaded && doc.fileName ? (
                            <span className="doc-meta" style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                              🔒 <span style={{ color: "var(--accent)", fontWeight: "bold" }}>Chiffré de bout en bout</span>
                              <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                                ({doc.fileName})
                              </span>
                            </span>
                          ) : (
                            <span style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                              {getTranslation(lang, "dash_no_file")}
                            </span>
                          )}
                        </div>

                        {doc.uploaded && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", alignItems: "flex-end" }}>
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", padding: "0.3rem 0.6rem", background: "rgba(255,255,255,0.03)", borderRadius: "0.25rem", border: "1px solid var(--border-card)" }}>
                                🔒 Fichier protégé
                              </span>
                              <button 
                                className="btn btn-danger" 
                                onClick={() => handleDeleteFile(doc.id)}
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                              >
                                🗑️ Remove document
                              </button>
                            </div>

                            {/* Moderator review controls */}
                            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginTop: "0.25rem" }}>
                              <input 
                                className="input-field"
                                type="text"
                                placeholder={getTranslation(lang, "admin_reason_placeholder")}
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", width: "220px" }}
                                value={docComments[doc.id] || ""}
                                onChange={(e) => setDocComments({ ...docComments, [doc.id]: e.target.value })}
                              />
                              <button 
                                className="btn btn-primary"
                                onClick={() => handleReviewDoc(doc.id, "approved")}
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", background: "var(--success)" }}
                              >
                                ✓ Approuver
                              </button>
                              <button 
                                className="btn btn-danger"
                                onClick={() => handleReviewDoc(doc.id, "rejected")}
                                style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem", background: "var(--danger)", color: "white" }}
                              >
                                ✗ Rejeter
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "logs" && (
            <div className="fade-in">
              <h2 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>📜 Daily Platform Transaction Logs</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
                Logging audits track administrative actions, user logins, and uploaded documents, grouped daily.
              </p>

              <div style={{
                maxHeight: "500px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem"
              }}>
                {sortedDates.length === 0 ? (
                  <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-muted)" }}>
                    No events recorded on the platform yet.
                  </div>
                ) : (
                  sortedDates.map(dateKey => (
                    <div key={dateKey} style={{
                      background: "rgba(255, 255, 255, 0.01)",
                      borderRadius: "0.75rem",
                      border: "1px solid var(--border-card)",
                      padding: "1rem 1.5rem"
                    }}>
                      <h3 style={{
                        fontSize: "0.95rem",
                        color: "var(--primary)",
                        borderBottom: "1px solid var(--border-card)",
                        paddingBottom: "0.35rem",
                        marginBottom: "0.75rem",
                        fontWeight: 700
                      }}>
                        📅 Date: {dateKey}
                      </h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                        {auditLogsByDate[dateKey].map((log, idx) => (
                          <div key={idx} style={{
                            display: "grid",
                            gridTemplateColumns: "100px 180px 1fr 180px",
                            fontSize: "0.82rem",
                            lineHeight: "1.4",
                            borderBottom: idx < auditLogsByDate[dateKey].length - 1 ? "1px dashed rgba(148, 163, 184, 0.1)" : "none",
                            paddingBottom: "0.4rem",
                            gap: "1rem",
                            alignItems: "center"
                          }}>
                            <span style={{ fontWeight: 600, color: "var(--accent)" }}>[{log.time}]</span>
                            <strong style={{ color: "var(--text-main)" }}>{log.action}</strong>
                            <span style={{ color: "var(--text-muted)" }}>{log.details}</span>
                            <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontStyle: "italic", textAlign: "right" }}>
                              by: {log.user}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === "settings" && (
            <div className="fade-in">
              <h2 style={{ fontSize: "1.4rem", marginBottom: "1.5rem" }}>{getTranslation(lang, "admin_settings_title")}</h2>

              {saveSuccess && (
                <div style={{
                  background: "var(--success-bg)",
                  color: "var(--success)",
                  padding: "0.75rem 1rem",
                  borderRadius: "0.5rem",
                  marginBottom: "1.5rem",
                  fontWeight: 600
                }}>
                  ✓ {getTranslation(lang, "admin_settings_saved")}
                </div>
              )}

              <form onSubmit={handleSaveConfig} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="form-group">
                    <label className="form-label">{getTranslation(lang, "admin_set_appname")}</label>
                    <input
                      className="input-field"
                      type="text"
                      value={appName}
                      onChange={(e) => setAppName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{getTranslation(lang, "admin_set_logo")}</label>
                    <input
                      className="input-field"
                      type="text"
                      value={appLogo}
                      onChange={(e) => setAppLogo(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "admin_set_smic")}</label>
                  <input
                    className="input-field"
                    type="number"
                    value={smicValue}
                    onChange={(e) => setSmicValue(e.target.value)}
                  />
                </div>

                <h3 style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-card)", paddingBottom: "0.5rem", marginTop: "1rem" }}>
                  {getTranslation(lang, "admin_set_surface")}
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label className="form-label">{getTranslation(lang, "admin_surface_a")} (m²)</label>
                    <input
                      className="input-field"
                      type="number"
                      value={surfaceZoneA}
                      onChange={(e) => setSurfaceZoneA(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{getTranslation(lang, "admin_surface_b")} (m²)</label>
                    <input
                      className="input-field"
                      type="number"
                      value={surfaceZoneB}
                      onChange={(e) => setSurfaceZoneB(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">{getTranslation(lang, "admin_surface_c")} (m²)</label>
                    <input
                      className="input-field"
                      type="number"
                      value={surfaceZoneC}
                      onChange={(e) => setSurfaceZoneC(e.target.value)}
                    />
                  </div>
                </div>

                <h3 style={{ fontSize: "1.1rem", borderBottom: "1px solid var(--border-card)", paddingBottom: "0.5rem", marginTop: "2rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  📧 Serveur SMTP & Envoi d'Emails <span style={{ fontSize: "0.75rem", background: "rgba(16, 185, 129, 0.1)", color: "#10b981", padding: "0.2rem 0.5rem", borderRadius: "999px", fontWeight: "bold" }}>🔒 Chiffré AES</span>
                </h3>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="form-group">
                    <label className="form-label">Hôte SMTP / Host</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="smtp.mailgun.org"
                      value={smtpHost}
                      onChange={(e) => setSmtpHost(e.target.value)}
                    />
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                    <div className="form-group">
                      <label className="form-label">Port SMTP</label>
                      <input
                        className="input-field"
                        type="number"
                        placeholder="587"
                        value={smtpPort}
                        onChange={(e) => setSmtpPort(e.target.value)}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Protocole de sécurité</label>
                      <select
                        className="select-dropdown"
                        style={{ padding: "0.7rem" }}
                        value={smtpProtocol}
                        onChange={(e) => setSmtpProtocol(e.target.value)}
                      >
                        <option value="TLS">STARTTLS (587)</option>
                        <option value="SSL">SSL / TLS (465)</option>
                        <option value="NONE">Aucun (25)</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="form-group">
                    <label className="form-label">Nom d'utilisateur / User</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="postmaster@chaml.ma"
                      value={smtpUser}
                      onChange={(e) => setSmtpUser(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" style={{ display: "flex", justifyContent: "space-between" }}>
                      <span>Mot de passe (Masqué et Chiffré)</span>
                      <span style={{ fontSize: "0.75rem", color: "#10b981" }}>🔒 AES-256 active</span>
                    </label>
                    <input
                      className="input-field"
                      type="password"
                      placeholder="••••••••••••••••"
                      value={smtpPassword}
                      onFocus={(e) => {
                        if (smtpPassword === "••••••••••••••••") {
                          setSmtpPassword("");
                        }
                      }}
                      onBlur={(e) => {
                        if (smtpPassword === "" && config.smtpConfig?.password) {
                          setSmtpPassword("••••••••••••••••");
                        }
                      }}
                      onChange={(e) => setSmtpPassword(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem" }}>
                  <div className="form-group">
                    <label className="form-label">Nom de l'expéditeur / Sender Name</label>
                    <input
                      className="input-field"
                      type="text"
                      placeholder="Chaml Team"
                      value={smtpSenderName}
                      onChange={(e) => setSmtpSenderName(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Adresse d'expédition / Sender Email</label>
                    <input
                      className="input-field"
                      type="email"
                      placeholder="noreply@chaml.ma"
                      value={smtpSenderEmail}
                      onChange={(e) => setSmtpSenderEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ marginTop: "2.5rem" }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem" }}>
                    💾 {getTranslation(lang, "admin_save_changes")}
                  </button>
                </div>
              </form>

              {/* Changer le mot de passe Administrateur Section */}
              <div style={{
                marginTop: "3rem",
                paddingTop: "2rem",
                borderTop: "1px solid var(--border-card)"
              }}>
                <h3 style={{ fontSize: "1.1rem", marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  🔒 Sécurité : Changer votre mot de passe administrateur
                </h3>

                {passwordChangeSuccess && (
                  <div style={{
                    background: "var(--success-bg)",
                    color: "var(--success)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1.5rem",
                    fontWeight: 600
                  }}>
                    ✓ {passwordChangeSuccess}
                  </div>
                )}

                {passwordChangeError && (
                  <div style={{
                    background: "var(--danger-bg)",
                    color: "var(--danger)",
                    padding: "0.75rem 1rem",
                    borderRadius: "0.5rem",
                    marginBottom: "1.5rem",
                    fontWeight: 600
                  }}>
                    ⚠️ {passwordChangeError}
                  </div>
                )}

                <form onSubmit={handlePasswordChangeSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem", maxWidth: "500px" }}>
                  <div className="form-group">
                    <label className="form-label">Mot de passe actuel</label>
                    <input
                      className="input-field"
                      type="password"
                      required
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nouveau mot de passe</label>
                    <input
                      className="input-field"
                      type="password"
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                    />
                  </div>
                  <div style={{ marginTop: "1rem" }}>
                    <button type="submit" className="btn btn-primary" style={{ padding: "0.6rem 1.2rem", fontSize: "0.9rem" }}>
                      🔒 Mettre à jour le mot de passe
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
