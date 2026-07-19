import React, { useState, useEffect } from "react";
import { getTranslation } from "../utils/i18n";
import AlertBanner from "../components/AlertBanner";
import { FranceFlag, MoroccoFlag } from "../components/Flag";
import { getDossier, uploadDocument, deleteDocument, submitDossier, getDownloadUrl, inviteSpouse } from "../utils/api";
import { encryptFile, decryptFile } from "../utils/crypto";

export default function Dashboard({ lang, user }) {
  const [dossier, setDossier] = useState(null);
  const [couple, setCouple] = useState(null);
  const [partnerName, setPartnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // E2EE state hooks
  const [e2eeKey, setE2eeKey] = useState(sessionStorage.getItem("chaml_e2ee_key") || "");
  const [tempKeyInput, setTempKeyInput] = useState("");

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteCity, setInviteCity] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Premium upgrade states
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  const handleUpgradeToPremium = () => {
    setUpgradeLoading(true);
    fetch("/api/payment/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
    })
      .then(res => {
        if (!res.ok) throw new Error("Échec de la création de la session de paiement.");
        return res.json();
      })
      .then(data => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          throw new Error("URL de paiement Stripe manquante.");
        }
      })
      .catch(err => {
        alert(err.message);
        setUpgradeLoading(false);
      });
  };

  const handleInviteSpouseSubmit = (e) => {
    e.preventDefault();
    if (couple && !couple.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    if (!inviteEmail || !inviteFirstName || !inviteLastName) {
      setInviteError("Veuillez remplir les champs obligatoires (*).");
      return;
    }
    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    inviteSpouse(inviteEmail, inviteFirstName, inviteLastName, invitePhone, inviteCity)
      .then(() => {
        setInviteSuccess("L'invitation a été envoyée avec succès à votre conjoint(e) !");
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInvitePhone("");
        setInviteCity("");
        loadDossierData();
      })
      .catch(err => {
        setInviteError(err.message || "Erreur lors de l'envoi de l'invitation.");
      })
      .finally(() => {
        setInviteLoading(false);
      });
  };

  const loadDossierData = () => {
    setLoading(true);
    getDossier()
      .then(res => {
        setDossier(res.dossier);
        setCouple(res.couple);
        setPartnerName(res.partnerName);
        setError("");
      })
      .catch(err => {
        console.error("Failed to load dossier:", err);
        setError("Error loading dossier data. Please verify your connection.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    loadDossierData();
  }, []);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <div className="fade-in" style={{ fontSize: "1.2rem", fontWeight: "600", color: "var(--text-muted)" }}>
          ⏳ Loading collaborative checklist...
        </div>
      </div>
    );
  }

  if (error || !dossier) {
    return (
      <div style={{ padding: "3rem", textAlign: "center" }}>
        <p style={{ color: "var(--danger)" }}>{error || "Access Denied."}</p>
        <button className="btn btn-primary" onClick={loadDossierData} style={{ marginTop: "1rem" }}>
          Retry
        </button>
      </div>
    );
  }

  // Calculate Overall Progress
  const totalDocs = dossier.franceDocs.length + dossier.moroccoDocs.length;
  const uploadedDocs = 
    dossier.franceDocs.filter(d => d.uploaded).length + 
    dossier.moroccoDocs.filter(d => d.uploaded).length;
  const progressPercent = Math.round((uploadedDocs / totalDocs) * 100);
  const allRequiredUploaded = [...dossier.franceDocs, ...dossier.moroccoDocs].every(d => !d.required || d.uploaded);

  // Real File Upload with client-side AES-GCM encryption
  const handleFileUpload = (e, docId, owner) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!e2eeKey) {
      alert("Veuillez d'abord configurer et valider votre clé de chiffrement privée en haut de la page.");
      return;
    }

    encryptFile(file, e2eeKey)
      .then(encryptedBlob => {
        // Prepare the encrypted blob for multipart upload
        const encryptedFile = new File([encryptedBlob], file.name, { type: "application/octet-stream" });
        return uploadDocument(docId, owner, encryptedFile);
      })
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        console.error("Encryption or upload error:", err);
        alert(`Échec du chiffrement ou du transfert : ${err.message}`);
      });
  };

  // Client-side download and AES-GCM decryption
  const handleDownloadDoc = async (docId, fileName) => {
    if (!e2eeKey) {
      alert("Veuillez saisir votre clé de chiffrement en haut du tableau de bord pour déverrouiller ce document.");
      return;
    }
    
    try {
      const url = getDownloadUrl(dossier.id, docId);
      const res = await fetch(url);
      if (!res.ok) throw new Error("Impossible de télécharger le fichier crypté.");
      const encryptedBlob = await res.blob();
      
      // Decrypt the blob client-side
      const decryptedBlob = await decryptFile(encryptedBlob, e2eeKey);
      
      // Create download link
      const link = document.createElement("a");
      const localUrl = URL.createObjectURL(decryptedBlob);
      link.href = localUrl;
      link.download = fileName || `${docId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(localUrl), 100);
    } catch (err) {
      console.error("Déchiffrement échoué:", err);
      alert("Erreur de déchiffrement. Votre clé de chiffrement est probablement incorrecte.");
    }
  };

  // File Delete Handler
  const handleDocDelete = (docId) => {
    if (!window.confirm("Are you sure you want to delete this document?")) return;
    deleteDocument(docId)
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        alert(`Deletion failed: ${err.message}`);
      });
  };

  // Submit dossier handler
  const handleSubmitDossier = () => {
    if (!window.confirm(getTranslation(lang, "dash_submit_confirm"))) return;

    submitDossier()
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        alert(`Dossier submission failed: ${err.message}`);
      });
  };

  const getStatusBadge = (doc) => {
    if (!doc.uploaded) {
      return <span className="badge badge-pending">{getTranslation(lang, "status_pending")}</span>;
    }
    if (doc.status === "approved") {
      return <span className="badge badge-approved">{getTranslation(lang, "status_approved_doc")}</span>;
    }
    if (doc.status === "rejected") {
      return <span className="badge badge-rejected">{getTranslation(lang, "status_rejected_doc")}</span>;
    }
    return (
      <span className="badge badge-pending" style={{ background: "rgba(148, 163, 184, 0.15)", color: "var(--text-muted)" }}>
        {getTranslation(lang, "status_under_review")}
      </span>
    );
  };

  // Helper to render one side checklist
  const renderChecklist = (docs, sideOwner, sectionTitle) => {
    const isOwnerLogged = user.role === sideOwner;

    return (
      <div className="glass-card" style={{ flex: 1 }}>
        <h3 style={{ fontSize: "1.2rem", marginBottom: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}>
            {sideOwner === "demandeur" ? <FranceFlag size={22} /> : <MoroccoFlag size={22} />}
            {sectionTitle}
          </span>
          <span style={{ fontSize: "0.85rem", opacity: 0.8 }}>
            ({docs.filter(d => d.uploaded).length} / {docs.length})
          </span>
        </h3>
        
        {!isOwnerLogged && (
          <p style={{
            fontSize: "0.75rem",
            background: "rgba(13, 148, 136, 0.08)",
            color: "var(--primary)",
            padding: "0.4rem 0.8rem",
            borderRadius: "0.35rem",
            marginBottom: "1rem",
            fontWeight: 500
          }}>
            ℹ️ {getTranslation(lang, "nav_partner")} {partnerName}
          </p>
        )}

        <div className="doc-list">
          {docs.map((doc) => (
            <div key={doc.id} className="doc-row">
              <div className="doc-info">
                <span className="doc-name">{getTranslation(lang, doc.nameKey)}</span>
                {doc.uploaded && doc.fileName && (
                  <span className="doc-meta">
                    📄{" "}
                    <button
                      onClick={() => handleDownloadDoc(doc.id, doc.fileName)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "var(--primary)",
                        textDecoration: "underline",
                        fontWeight: "bold",
                        cursor: "pointer",
                        padding: 0,
                        display: "inline",
                        fontSize: "inherit"
                      }}
                    >
                      {doc.fileName} (Déverrouiller 🔓)
                    </button>{" "}
                    ({new Date(doc.uploadedAt).toLocaleDateString(lang === "ar" ? "ar-MA" : "fr-FR")})
                  </span>
                )}
                
                {/* Admin Comment Feedback */}
                {doc.comment && (
                  <span style={{
                    color: doc.status === "rejected" ? "var(--danger)" : "var(--accent)",
                    fontSize: "0.8rem",
                    fontWeight: 500,
                    marginTop: "0.25rem",
                    display: "block"
                  }}>
                    💬 {getTranslation(lang, "dash_doc_feedback")} : {doc.comment}
                  </span>
                )}
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                {getStatusBadge(doc)}

                {/* Upload Action buttons */}
                {isOwnerLogged ? (
                  !doc.uploaded ? (
                    <>
                      <input 
                        type="file" 
                        id={`file-input-${doc.id}`}
                        accept="application/pdf"
                        style={{ display: "none" }}
                        onChange={(e) => handleFileUpload(e, doc.id, sideOwner)}
                      />
                      <button 
                        className="btn btn-primary" 
                        style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                        onClick={() => {
                          if (couple && !couple.isPremium) {
                            setShowUpgradeModal(true);
                            return;
                          }
                          if (!e2eeKey) {
                            alert("Veuillez d'abord configurer et valider votre clé de chiffrement en haut de la page.");
                            return;
                          }
                          document.getElementById(`file-input-${doc.id}`).click();
                        }}
                      >
                        📤 {getTranslation(lang, "btn_upload")}
                      </button>
                    </>
                  ) : (
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem" }}
                      onClick={() => handleDocDelete(doc.id)}
                    >
                      🗑️
                    </button>
                  )
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fade-in" style={{ marginTop: "1rem" }}>
      {/* 6-Month Implicit Refusal Alert */}
      <AlertBanner lang={lang} couple={couple} dossier={dossier} />

      <div className="glass-card" style={{ marginBottom: "2rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ fontSize: "1.8rem" }}>📁 {getTranslation(lang, "dash_title")}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>{getTranslation(lang, "dash_subtitle")}</p>

            {/* E2EE Key Entry Widget */}
            <div style={{
              marginTop: "1.25rem",
              padding: "1rem",
              background: "rgba(13, 148, 136, 0.05)",
              border: "1px solid var(--border-card)",
              borderRadius: "0.5rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.5rem",
              maxWidth: "450px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.1rem" }}>🔒</span>
                <strong style={{ fontSize: "0.85rem", color: "var(--text-main)" }}>Chiffrement de bout en bout actif</strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--text-muted)", lineHeight: "1.4" }}>
                Pour garantir la confidentialité absolue, vos documents sont cryptés côté client avant envoi. Même l'administrateur n'a pas accès à vos fichiers.
              </p>
              
              {!e2eeKey ? (
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="password"
                    placeholder="Saisissez votre clé de chiffrement..."
                    className="input-field"
                    style={{ padding: "0.4rem 0.6rem", fontSize: "0.8rem", margin: 0 }}
                    value={tempKeyInput}
                    onChange={e => setTempKeyInput(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    style={{ padding: "0.4rem 0.8rem", fontSize: "0.8rem", whiteSpace: "nowrap" }}
                    onClick={() => {
                      if (!tempKeyInput) return;
                      setE2eeKey(tempKeyInput);
                      sessionStorage.setItem("chaml_e2ee_key", tempKeyInput);
                    }}
                  >
                    Valider la clé
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.8rem", color: "var(--success)", fontWeight: 500 }}>✓ Clé de chiffrement active</span>
                  <button
                    style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", padding: 0 }}
                    onClick={() => {
                      setE2eeKey("");
                      setTempKeyInput("");
                      sessionStorage.removeItem("chaml_e2ee_key");
                    }}
                  >
                    Changer de clé
                  </button>
                </div>
              )}
            </div>
          </div>
          
          <div style={{ display: "flex", alignItems: "center", gap: "1.5rem" }}>
            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>
                Formule
              </span>
              {couple?.isPremium ? (
                <span className="badge badge-approved" style={{ fontSize: "0.9rem", padding: "0.4rem 0.85rem", background: "linear-gradient(135deg, #0d9488 0%, #10b981 100%)", color: "white", display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
                  🌟 Premium
                </span>
              ) : (
                <button
                  onClick={() => setShowUpgradeModal(true)}
                  className="badge badge-pending"
                  style={{ fontSize: "0.9rem", padding: "0.4rem 0.85rem", background: "linear-gradient(135deg, #ef4444 0%, #f59e0b 100%)", color: "white", border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.25rem", fontWeight: "bold" }}
                >
                  🚀 Activer Premium
                </button>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "block" }}>
                {getTranslation(lang, "dash_dossier_status_label")}
              </span>
              <span className={`badge ${
                dossier.status === "approved" ? "badge-approved" : 
                dossier.status === "rejected" ? "badge-rejected" : "badge-pending"
              }`} style={{ fontSize: "0.9rem", padding: "0.4rem 0.85rem" }}>
                {getTranslation(lang, `status_${dossier.status}`)}
              </span>
            </div>

            {/* Submit entire dossier button */}
            {dossier.status === "draft" && (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem" }}>
                <button 
                  className="btn" 
                  onClick={handleSubmitDossier}
                  disabled={!allRequiredUploaded}
                  style={{ 
                    padding: "0.75rem 1.25rem",
                    background: allRequiredUploaded ? "var(--accent)" : "rgba(148, 163, 184, 0.2)",
                    color: allRequiredUploaded ? "white" : "var(--text-muted)",
                    cursor: allRequiredUploaded ? "pointer" : "not-allowed",
                    border: "1px solid var(--border-card)",
                    fontWeight: "bold"
                  }}
                >
                  🚀 {getTranslation(lang, "dash_btn_submit_dossier")}
                </button>
                {!allRequiredUploaded && (
                  <span style={{ fontSize: "0.7rem", color: "var(--danger)", fontWeight: 600 }}>
                    {lang === "ar" ? "⚠️ يرجى تحميل جميع الوثائق أولاً" : lang === "en" ? "⚠️ Please upload all documents first" : "⚠️ Téléverser tous les documents d'abord"}
                  </span>
                )}
              </div>
            )}

            {dossier.status === "submitted" && dossier.submittedAt && (
              <div style={{ fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "right" }}>
                {getTranslation(lang, "dash_submitted_on")}<br />
                <strong>{new Date(dossier.submittedAt).toLocaleDateString()}</strong>
              </div>
            )}
          </div>
        </div>

        {/* Global Progress Bar */}
        <div className="progress-container">
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            <span>{getTranslation(lang, "dash_progress")}</span>
            <span>{progressPercent}% ({uploadedDocs} / {totalDocs})</span>
          </div>
          <div className="progress-bar-bg">
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>
        </div>
      </div>

      {/* Dual Columns Checklists */}
      <div className="dashboard-grid">
        {renderChecklist(
          dossier.franceDocs, 
          "demandeur", 
          `${getTranslation(lang, "dash_applicant_section")} ${couple?.demandeur?.firstName || ""}`
        )}
        {couple?.beneficiaire ? (
          renderChecklist(
            dossier.moroccoDocs, 
            "beneficiaire", 
            `${getTranslation(lang, "dash_beneficiary_section")} ${couple?.beneficiaire?.firstName || ""}`
          )
        ) : (
          user.role === "demandeur" && (
            <div className="glass-card" style={{ padding: "2rem", border: "2px dashed var(--primary)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              <h3 style={{ color: "var(--primary)", fontSize: "1.2rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <MoroccoFlag size={20} /> 🤝 Inviter votre conjoint(e) au Maroc
              </h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", lineHeight: "1.5", margin: 0 }}>
                Pour collaborer en temps réel, invitez votre conjoint(e) résidant au Maroc. Il/elle recevra un e-mail avec un lien d'activation sécurisé pour configurer son mot de passe et charger ses documents directement de son côté.
              </p>

              {inviteSuccess && (
                <div style={{ background: "var(--success-bg)", color: "var(--success)", padding: "0.75rem 1.25rem", borderRadius: "0.5rem", fontWeight: 600 }}>
                  ✓ {inviteSuccess}
                </div>
              )}

              {inviteError && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1.25rem", borderRadius: "0.5rem", fontWeight: 600 }}>
                  ⚠️ {inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSpouseSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Prénom du conjoint*</label>
                    <input className="input-field" type="text" required value={inviteFirstName} onChange={e => setInviteFirstName(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nom du conjoint*</label>
                    <input className="input-field" type="text" required value={inviteLastName} onChange={e => setInviteLastName(e.target.value)} />
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">Adresse E-mail du conjoint* (Lien envoyé ici)</label>
                  <input className="input-field" type="email" placeholder="conjoint.maroc@gmail.com" required value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Téléphone</label>
                    <input className="input-field" type="text" placeholder="+212 6..." value={invitePhone} onChange={e => setInvitePhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville au Maroc</label>
                    <input className="input-field" type="text" placeholder="Casablanca" value={inviteCity} onChange={e => setInviteCity(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", width: "100%" }} disabled={inviteLoading}>
                    ✉️ {inviteLoading ? "Envoi de l'invitation en cours..." : "Envoyer l'invitation à mon conjoint"}
                  </button>
                </div>
              </form>
            </div>
          )
        )}
      </div>

      {/* 🌟 Premium Upgrade Modal (Glassmorphism design) */}
      {showUpgradeModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(15, 23, 42, 0.8)", // Dark backdrop
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "1rem",
        }}>
          <div className="glass-card" style={{
            maxWidth: "500px",
            width: "100%",
            padding: "2.25rem",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)"
          }}>
            <button 
              onClick={() => setShowUpgradeModal(false)}
              style={{
                position: "absolute",
                top: "1.25rem",
                right: "1.25rem",
                background: "rgba(255,255,255,0.05)",
                border: "1px solid var(--border-card)",
                borderRadius: "50%",
                width: "2.2rem",
                height: "2.2rem",
                color: "var(--text-main)",
                fontSize: "1.2rem",
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center"
              }}
            >
              ×
            </button>

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "3rem", marginBottom: "0.5rem" }}>🕌</div>
              <h2 style={{ fontSize: "1.6rem", color: "var(--primary)", margin: 0 }}>Chaml Premium 🌟</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", marginTop: "0.5rem" }}>
                La solution complète pour maximiser vos chances de réussite et sécuriser vos démarches.
              </p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-card)", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.1rem", fontSize: "0.88rem", color: "var(--text-muted)" }}>
              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>🤝</span>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "block" }}>Invitation & Onboarding Conjoint</strong>
                  <span>Invitez votre conjoint(e) au Maroc pour collaborer sur le même dossier en temps réel.</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>🔒</span>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "block" }}>Chiffrement E2EE de bout en bout</strong>
                  <span>Téléversez vos pièces sensibles de manière 100% cryptée (AES-GCM-256) sur votre machine. Même Chaml ne peut pas les lire.</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>⚖️</span>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "block" }}>Générateur de Recours Juridiques</strong>
                  <span>Générez des lettres types de recours gracieux ou hiérarchiques pré-remplies en cas de retard ou de silence de la préfecture.</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>📊</span>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "block" }}>Simulateurs de Conformité Illimités</strong>
                  <span>Accès complet et illimité au simulateur de ressources (SMIC) et de logement par zone OFII.</span>
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>
                <span style={{ fontSize: "1.2rem" }}>⏰</span>
                <div>
                  <strong style={{ color: "var(--text-main)", display: "block" }}>Destruction Auto & Alerte RGPD (30j)</strong>
                  <span>Garantie de vie privée : alerte de suppression à J-25 par e-mail et purge définitive et irrécupérable de vos fichiers 30 jours après validation.</span>
                </div>
              </div>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-card)", margin: 0 }} />

            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: "1.75rem", fontWeight: "bold", color: "var(--text-main)" }}>19 €</div>
              <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>Paiement unique à vie • Pas d'abonnement</span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <button 
                className="btn btn-primary"
                onClick={handleUpgradeToPremium}
                disabled={upgradeLoading}
                style={{ padding: "0.85rem", fontSize: "0.95rem", fontWeight: "bold", width: "100%", background: "linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)", border: "none" }}
              >
                {upgradeLoading ? "Redirection vers Stripe..." : "🚀 Passer au Premium (19€)"}
              </button>
              <button 
                onClick={() => setShowUpgradeModal(false)}
                style={{ background: "none", border: "none", color: "var(--text-muted)", fontSize: "0.8rem", cursor: "pointer", textDecoration: "underline", padding: "0.5rem 0" }}
              >
                Peut-être plus tard
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
