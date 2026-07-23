import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getTranslation } from "../utils/i18n";
import AlertBanner from "../components/AlertBanner";
import { FranceFlag, MoroccoFlag } from "../components/Flag";
import { getDossier, uploadDocument, deleteDocument, submitDossier, reopenDossier, getDownloadUrl, inviteSpouse, cancelInvite, verifyStripeSession } from "../utils/api";
import { encryptFile, decryptFile } from "../utils/crypto";
import { PDFDocument, rgb } from "pdf-lib";

export default function Dashboard({ lang, user }) {
  const [dossier, setDossier] = useState(null);
  const [couple, setCouple] = useState(null);
  const [partnerName, setPartnerName] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // E2EE state hooks
  const [e2eeKey, setE2eeKey] = useState(sessionStorage.getItem("chaml_e2ee_key") || "");
  const [tempKeyInput, setTempKeyInput] = useState("");
  const [showKeyText, setShowKeyText] = useState(false);
  const [copiedKeySuccess, setCopiedKeySuccess] = useState(false);
  const [copiedInviteLinkSuccess, setCopiedInviteLinkSuccess] = useState(false);

  // Invitation Form State
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteFirstName, setInviteFirstName] = useState("");
  const [inviteLastName, setInviteLastName] = useState("");
  const [invitePhone, setInvitePhone] = useState("");
  const [inviteCity, setInviteCity] = useState("");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteChannel, setInviteChannel] = useState("email");
  const [whatsappUrlResult, setWhatsappUrlResult] = useState("");

  // Upgrade Modal & Stripe Payment state
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeLoading, setUpgradeLoading] = useState(false);

  // CERFA 11436*05 state hooks
  const [showCerfaModal, setShowCerfaModal] = useState(false);
  const [cerfaLoading, setCerfaLoading] = useState(false);
  const [cerfaError, setCerfaError] = useState("");
  const [cerfaSponsorBirthDate, setCerfaSponsorBirthDate] = useState("");
  const [cerfaSponsorBirthPlace, setCerfaSponsorBirthPlace] = useState("");
  const [cerfaSponsorNationality, setCerfaSponsorNationality] = useState("");
  const [cerfaSpouseBirthDate, setCerfaSpouseBirthDate] = useState("");
  const [cerfaSpouseBirthPlace, setCerfaSpouseBirthPlace] = useState("");
  const [cerfaSpouseNationality, setCerfaSpouseNationality] = useState("");
  const [cerfaMarriageDate, setCerfaMarriageDate] = useState("");
  const [cerfaMarriagePlace, setCerfaMarriagePlace] = useState("");
  const [cerfaRoomsCount, setCerfaRoomsCount] = useState("3");
  const [cerfaHousingType, setCerfaHousingType] = useState("Appartement");
  const [cerfaLivingSurface, setCerfaLivingSurface] = useState("");
  const [cerfaGeographicZone, setCerfaGeographicZone] = useState("A");
  const [cerfaAverageSalary, setCerfaAverageSalary] = useState("");
  const [cerfaDoneAt, setCerfaDoneAt] = useState("");

  const handleUpgradeToPremium = () => {
    setUpgradeLoading(true);
    fetch("/api/payment/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.url) {
          window.location.href = data.url;
        } else {
          alert(getTranslation(lang, "alert_stripe_session_error"));
        }
      })
      .catch(err => {
        console.error("Stripe Checkout Error:", err);
        alert(getTranslation(lang, "alert_stripe_redirect_error"));
      })
      .finally(() => {
        setUpgradeLoading(false);
      });
  };

  const handleInviteSpouseSubmit = (e) => {
    e.preventDefault();

    // Save draft form to localStorage so it persists across Stripe payment or upgrade modal
    const inviteDraft = {
      firstName: inviteFirstName,
      lastName: inviteLastName,
      email: inviteEmail,
      phone: invitePhone,
      city: inviteCity,
      channel: inviteChannel
    };
    try {
      localStorage.setItem("chaml_pending_spouse_invite", JSON.stringify(inviteDraft));
    } catch (e) {
      console.warn("Failed to save draft to localStorage", e);
    }

    if (couple && !couple.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    if (!inviteFirstName || !inviteLastName) {
      setInviteError("Veuillez saisir le prénom et le nom du conjoint.");
      return;
    }
    if (inviteChannel === "email" && !inviteEmail) {
      setInviteError("Veuillez saisir l'adresse e-mail du conjoint.");
      return;
    }
    if (inviteChannel === "whatsapp" && !invitePhone) {
      setInviteError("Veuillez saisir le numéro de téléphone pour WhatsApp.");
      return;
    }

    setInviteLoading(true);
    setInviteError("");
    setInviteSuccess("");
    setWhatsappUrlResult("");

    inviteSpouse(inviteEmail, inviteFirstName, inviteLastName, invitePhone, inviteCity, inviteChannel)
      .then(res => {
        // Clear saved draft on success
        localStorage.removeItem("chaml_pending_spouse_invite");

        if (inviteChannel === "whatsapp" && res.whatsappUrl) {
          setWhatsappUrlResult(res.whatsappUrl);
          setInviteSuccess(getTranslation(lang, "invite_whatsapp_success"));
          // Auto-open WhatsApp Web/App in a new tab directly!
          try {
            window.open(res.whatsappUrl, "_blank");
          } catch (err) {
            console.warn("Popup blocked, user can click WhatsApp launcher button below:", err);
          }
        } else {
          setInviteSuccess("L'invitation a été envoyée avec succès à votre conjoint(e) !");
        }
        setInviteEmail("");
        setInviteFirstName("");
        setInviteLastName("");
        setInvitePhone("");
        setInviteCity("");
        loadDossierData();
      })
      .catch(err => {
        if (err.message === "premium_required" || (err.payload && err.payload.error === "premium_required")) {
          setShowUpgradeModal(true);
          return;
        }
        setInviteError(err.message || "Erreur lors de l'envoi de l'invitation.");
      })
      .finally(() => {
        setInviteLoading(false);
      });
  };

  const handleCancelInvite = () => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler l'invitation actuelle pour pouvoir en envoyer une nouvelle ?")) return;
    cancelInvite()
      .then(() => {
        setInviteSuccess("");
        setInviteError("");
        setWhatsappUrlResult("");
        loadDossierData();
      })
      .catch(err => {
        alert("Erreur lors de l'annulation : " + err.message);
      });
  };

  const handleOpenCerfaModal = () => {
    // Attempt to extract defaults from couple profile
    setCerfaSponsorBirthDate(couple?.demandeur?.birthDate || "");
    setCerfaSponsorBirthPlace(couple?.demandeur?.birthPlace || "");
    setCerfaSponsorNationality(couple?.demandeur?.nationality || "Française");
    
    setCerfaSpouseBirthDate(couple?.beneficiaire?.birthDate || "");
    setCerfaSpouseBirthPlace(couple?.beneficiaire?.birthPlace || "");
    setCerfaSpouseNationality(couple?.beneficiaire?.nationality || "Marocaine");

    setCerfaMarriageDate(couple?.marriageDate || "");
    setCerfaMarriagePlace(couple?.marriagePlace || "");

    setCerfaRoomsCount(couple?.roomsCount || "3");
    setCerfaHousingType(couple?.housingType || "Appartement");
    setCerfaGeographicZone(couple?.geographicZone || "A");
    setCerfaLivingSurface(couple?.livingSurface || "65");
    setCerfaAverageSalary(couple?.averageSalary || "1800");

    setCerfaDoneAt(couple?.demandeur?.city || "Paris");

    setCerfaError("");
    setCerfaLoading(false);
    setShowCerfaModal(true);
  };

  const handleDownloadCerfaSubmit = async (e) => {
    e.preventDefault();
    setCerfaLoading(true);
    setCerfaError("");

    try {
      // 1. Fetch blank PDF template bytes
      const response = await fetch("/cerfa_11436-05.pdf");
      if (!response.ok) {
        throw new Error("Impossible de charger le modèle CERFA vierge (assurez-vous que /cerfa_11436-05.pdf est disponible dans public/).");
      }
      const existingPdfBytes = await response.arrayBuffer();

      // 2. Load the PDF document
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const pages = pdfDoc.getPages();

      if (pages.length < 5) {
        throw new Error("Le fichier CERFA est incomplet (doit contenir au moins 5 pages).");
      }

      const page3 = pages[2]; // Cadre A (Le Demandeur) & Cadre B (Le Conjoint)
      const page4 = pages[3]; // Cadre C & Cadre D (Le Logement)
      const page5 = pages[4]; // Cadre E (Ressources) & Cadre F (Signature)

      // 3. Define ink configurations
      const color = rgb(0.05, 0.2, 0.6); // Sleek blue ink
      const font = await pdfDoc.embedFont("Helvetica");

      const drawText = (page, text, x, y, size = 9) => {
        if (!text) return;
        page.drawText(text.toString(), {
          x,
          y,
          size,
          font,
          color
        });
      };

      // ----------------------------------------------------
      // PAGE 3 INJECTIONS
      // ----------------------------------------------------
      // Cadre A - Le Demandeur (Sponsor)
      drawText(page3, couple?.demandeur?.lastName || "", 120, 680);
      drawText(page3, couple?.demandeur?.firstName || "", 120, 655);
      drawText(page3, cerfaSponsorBirthDate, 120, 630);
      drawText(page3, cerfaSponsorBirthPlace, 320, 630);
      drawText(page3, cerfaSponsorNationality, 440, 630);
      drawText(page3, couple?.demandeur?.address || "", 120, 580);
      drawText(page3, couple?.demandeur?.phone || "", 120, 545);
      drawText(page3, couple?.demandeur?.email || "", 320, 545);

      // Cadre B - Le Conjoint (Spouse in Morocco)
      drawText(page3, couple?.beneficiaire?.last_name || couple?.beneficiaire?.lastName || "", 120, 428);
      drawText(page3, couple?.beneficiaire?.first_name || couple?.beneficiaire?.firstName || "", 120, 404);
      drawText(page3, cerfaSpouseBirthDate, 120, 378);
      drawText(page3, cerfaSpouseBirthPlace, 320, 378);
      drawText(page3, cerfaSpouseNationality, 440, 378);
      drawText(page3, couple?.beneficiaire?.city || "", 120, 348);
      drawText(page3, cerfaMarriageDate, 120, 318);
      drawText(page3, cerfaMarriagePlace, 320, 318);

      // ----------------------------------------------------
      // PAGE 4 INJECTIONS
      // ----------------------------------------------------
      // Cadre D - Le Logement
      drawText(page4, cerfaLivingSurface, 260, 260);
      drawText(page4, cerfaRoomsCount, 440, 260);
      drawText(page4, cerfaHousingType, 260, 230);
      drawText(page4, cerfaGeographicZone, 440, 230);

      // ----------------------------------------------------
      // PAGE 5 INJECTIONS
      // ----------------------------------------------------
      // Cadre E - Les Ressources
      drawText(page5, `${cerfaAverageSalary} €`, 350, 650);

      // Cadre F - Fait à ... Le ...
      drawText(page5, cerfaDoneAt, 380, 180);
      drawText(page5, new Date().toLocaleDateString("fr-FR"), 200, 180);

      // 4. Save and trigger direct browser download
      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `cerfa_11436-05_pre_rempli.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setShowCerfaModal(false);
    } catch (err) {
      console.error(err);
      setCerfaError(err.message || "Erreur lors de la génération du fichier PDF.");
    } finally {
      setCerfaLoading(false);
    }
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

    // Restore pending spouse invitation form state from localStorage if present
    try {
      const savedInvite = localStorage.getItem("chaml_pending_spouse_invite");
      if (savedInvite) {
        const parsed = JSON.parse(savedInvite);
        if (parsed.firstName) setInviteFirstName(parsed.firstName);
        if (parsed.lastName) setInviteLastName(parsed.lastName);
        if (parsed.email) setInviteEmail(parsed.email);
        if (parsed.phone) setInvitePhone(parsed.phone);
        if (parsed.city) setInviteCity(parsed.city);
        if (parsed.channel) setInviteChannel(parsed.channel);
      }
    } catch (e) {
      console.warn("Failed to restore pending invite state:", e);
    }

    // Check Stripe return URL params for instant activation
    const urlParams = new URLSearchParams(window.location.search);
    const paymentStatus = urlParams.get("payment");
    const sessionId = urlParams.get("session_id");

    if (paymentStatus === "success" && sessionId) {
      window.history.replaceState({}, document.title, window.location.pathname);
      verifyStripeSession(sessionId)
        .then(() => {
          loadDossierData();
        })
        .catch(err => {
          console.error("Stripe verification callback error:", err);
        });
    }
  }, []);

  useEffect(() => {
    if (showUpgradeModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showUpgradeModal]);

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

    // Strict PDF extension & type validation
    const isPdf = file.name.toLowerCase().endsWith(".pdf") || file.type === "application/pdf";
    if (!isPdf) {
      alert(getTranslation(lang, "alert_pdf_only_error"));
      e.target.value = "";
      return;
    }

    // Strict 15 MB file size limit
    const maxBytes = 15 * 1024 * 1024;
    if (file.size > maxBytes) {
      alert(getTranslation(lang, "alert_file_too_large"));
      e.target.value = "";
      return;
    }

    if (owner === "beneficiaire" && couple && !couple.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    if (!e2eeKey) {
      alert(getTranslation(lang, "alert_e2ee_key_required"));
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
        if (err.message === "premium_required" || (err.payload && err.payload.error === "premium_required")) {
          setShowUpgradeModal(true);
          return;
        }
        if (err.payload && err.payload.error === "pdf_only") {
          alert(getTranslation(lang, "alert_pdf_only_error"));
          return;
        }
        if (err.payload && err.payload.error === "file_too_large") {
          alert(getTranslation(lang, "alert_file_too_large"));
          return;
        }
        alert(getTranslation(lang, "alert_upload_failed", { msg: err.message }));
      });
  };

  // Client-side download and AES-GCM decryption
  const handleDownloadDoc = async (docId, fileName) => {
    if (!e2eeKey) {
      alert(getTranslation(lang, "alert_download_key_required"));
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
      alert(getTranslation(lang, "alert_decrypt_failed"));
    }
  };

  // File Delete Handler
  const handleDocDelete = (docId) => {
    if (!window.confirm(getTranslation(lang, "alert_delete_doc_confirm"))) return;
    deleteDocument(docId)
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        alert(getTranslation(lang, "alert_delete_doc_failed", { msg: err.message }));
      });
  };

  // Submit dossier handler
  const handleSubmitDossier = () => {
    if (couple && !couple.isPremium) {
      setShowUpgradeModal(true);
      return;
    }
    if (!window.confirm(getTranslation(lang, "dash_submit_confirm"))) return;

    submitDossier(lang)
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        alert(getTranslation(lang, "alert_submit_failed", { msg: err.message }));
      });
  };

  // Re-open dossier handler
  const handleReopenDossier = () => {
    if (!window.confirm(getTranslation(lang, "dash_reopen_confirm"))) return;

    reopenDossier()
      .then(() => {
        loadDossierData();
      })
      .catch(err => {
        alert(getTranslation(lang, "alert_reopen_failed", { msg: err.message }));
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
                  dossier && dossier.status === "submitted" ? (
                    <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", fontWeight: 600, padding: "0.3rem 0.65rem", background: "rgba(148, 163, 184, 0.1)", borderRadius: "0.4rem", border: "1px solid var(--border-card)" }}>
                      🔒 Verrouillé
                    </span>
                  ) : !doc.uploaded ? (
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
                          if (sideOwner === "beneficiaire" && couple && !couple.isPremium) {
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

            {/* E2EE Shared Couple Vault Key Widget */}
            <div style={{
              marginTop: "1.25rem",
              padding: "1.15rem",
              background: "rgba(13, 148, 136, 0.05)",
              border: "1px solid var(--border-card)",
              borderRadius: "0.75rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.6rem",
              maxWidth: "500px"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                <span style={{ fontSize: "1.2rem" }}>🔑</span>
                <strong style={{ fontSize: "0.9rem", color: "var(--text-main)" }}>
                  {getTranslation(lang, "e2ee_widget_title")}
                </strong>
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", lineHeight: "1.45" }}>
                {getTranslation(lang, "e2ee_widget_desc")}
              </p>
              
              {!e2eeKey ? (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <div style={{ fontSize: "0.78rem", color: "var(--danger)", fontWeight: 600 }}>
                    {getTranslation(lang, "e2ee_status_missing")}
                  </div>
                  <div style={{ display: "flex", gap: "0.5rem", position: "relative", alignItems: "center", width: "100%" }}>
                    <input
                      type={showKeyText ? "text" : "password"}
                      placeholder={getTranslation(lang, "e2ee_invite_key_placeholder")}
                      className="input-field"
                      style={{ padding: "0.45rem 2.2rem 0.45rem 0.6rem", fontSize: "0.82rem", margin: 0, flex: 1 }}
                      value={tempKeyInput}
                      onChange={e => setTempKeyInput(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => setShowKeyText(!showKeyText)}
                      style={{
                        position: "absolute",
                        right: "0.5rem",
                        background: "none",
                        border: "none",
                        color: "var(--text-muted)",
                        cursor: "pointer",
                        fontSize: "0.95rem",
                        display: "flex",
                        alignItems: "center"
                      }}
                      title={showKeyText ? getTranslation(lang, "e2ee_hide_key") : getTranslation(lang, "e2ee_show_key")}
                    >
                      {showKeyText ? "👁️" : "🙈"}
                    </button>
                  </div>
                  <button
                    className="btn btn-primary"
                    style={{ padding: "0.5rem", fontSize: "0.82rem", fontWeight: "bold" }}
                    onClick={() => {
                      if (!tempKeyInput || tempKeyInput.length < 6) {
                        alert(getTranslation(lang, "alert_e2ee_key_min_len"));
                        return;
                      }
                      setE2eeKey(tempKeyInput);
                      sessionStorage.setItem("chaml_e2ee_key", tempKeyInput);
                    }}
                  >
                    Valider la clé du dossier
                  </button>
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginTop: "0.25rem" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "0.82rem", color: "var(--success)", fontWeight: 600 }}>
                      {getTranslation(lang, "e2ee_status_active")}
                    </span>
                    <button
                      style={{ background: "none", border: "none", color: "var(--danger)", fontSize: "0.78rem", cursor: "pointer", textDecoration: "underline", padding: 0, fontWeight: 600 }}
                      onClick={() => {
                        setE2eeKey("");
                        setTempKeyInput("");
                        sessionStorage.removeItem("chaml_e2ee_key");
                      }}
                    >
                      {getTranslation(lang, "e2ee_change_btn")}
                    </button>
                  </div>

                  <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.65rem", fontSize: "0.78rem", fontWeight: "bold", background: copiedKeySuccess ? "rgba(16, 185, 129, 0.15)" : undefined, color: copiedKeySuccess ? "var(--success)" : undefined }}
                      onClick={() => {
                        navigator.clipboard.writeText(e2eeKey);
                        setCopiedKeySuccess(true);
                        setTimeout(() => setCopiedKeySuccess(false), 2500);
                      }}
                    >
                      {copiedKeySuccess ? `✓ ${getTranslation(lang, "e2ee_key_copied")}` : getTranslation(lang, "e2ee_copy_btn")}
                    </button>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: "0.4rem 0.65rem", fontSize: "0.78rem" }}
                      onClick={() => {
                        const element = document.createElement("a");
                        const file = new Blob([
                          `--- CLÉ DU DOSSIER CONJOINT ${config.appName.toUpperCase()} ---\n`,
                          `Dossier ID : ${couple ? couple.id : config.appName}\n`,
                          `Clé Secrète : ${e2eeKey}\n\n`,
                          `Transmettez cette clé secrète à votre conjoint(e) pour qu'il/elle puisse déchiffrer vos documents sur notre plateforme.\n`
                        ], {type: 'text/plain'});
                        element.href = URL.createObjectURL(file);
                        element.download = `cle-dossier-chaml.txt`;
                        document.body.appendChild(element);
                        element.click();
                        document.body.removeChild(element);
                      }}
                    >
                      💾 Sauvegarder
                    </button>
                  </div>
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
          </div>
        </div>

        {/* Global Progress Bar + Action */}
        <div className="progress-container" style={{ marginTop: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", fontSize: "0.9rem", fontWeight: 700, marginBottom: "0.5rem" }}>
            <span>{getTranslation(lang, "dash_progress")}</span>
            <span>{progressPercent}% ({uploadedDocs} / {totalDocs})</span>
          </div>
          <div className="progress-bar-bg" style={{ marginBottom: "1rem" }}>
            <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
          </div>

          {/* Submit entire dossier button (Demandeur only) */}
          {dossier.status === "draft" && (
            user && user.role === "demandeur" ? (
              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.4rem", width: "100%", marginTop: "0.5rem" }}>
                <button 
                  className="btn" 
                  onClick={handleSubmitDossier}
                  disabled={!allRequiredUploaded}
                  style={{ 
                    width: "100%",
                    padding: "0.85rem 1.25rem",
                    fontSize: "0.95rem",
                    background: allRequiredUploaded ? "var(--accent)" : "rgba(148, 163, 184, 0.15)",
                    color: allRequiredUploaded ? "white" : "var(--text-muted)",
                    cursor: allRequiredUploaded ? "pointer" : "not-allowed",
                    border: "1px solid var(--border-card)",
                    fontWeight: "bold",
                    borderRadius: "0.5rem",
                    boxShadow: allRequiredUploaded ? "0 4px 14px rgba(13, 148, 136, 0.3)" : "none"
                  }}
                >
                  🚀 {getTranslation(lang, "dash_btn_submit_dossier")}
                </button>
                {!allRequiredUploaded && (
                  <span style={{ fontSize: "0.78rem", color: "var(--danger)", fontWeight: 600, textAlign: "center" }}>
                    {lang === "ar" ? "⚠️ يرجى تحميل جميع الوثائق أولاً" : lang === "en" ? "⚠️ Please upload all documents first" : "⚠️ Téléverser tous les documents d'abord"}
                  </span>
                )}
              </div>
            ) : (
              <div style={{ padding: "0.85rem 1rem", background: "rgba(13, 148, 136, 0.08)", border: "1px solid rgba(13, 148, 136, 0.2)", borderRadius: "0.5rem", marginTop: "0.5rem", textAlign: "center", fontSize: "0.83rem", color: "var(--accent)", fontWeight: 600 }}>
                {getTranslation(lang, "dash_beneficiaire_submit_notice")}
              </div>
            )
          )}

          {dossier.status === "submitted" && (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.75rem", width: "100%", marginTop: "0.75rem", padding: "1rem", background: "rgba(16, 185, 129, 0.06)", border: "1px solid rgba(16, 185, 129, 0.2)", borderRadius: "0.5rem" }}>
              <div style={{ fontSize: "0.9rem", color: "var(--success)", fontWeight: "bold", textAlign: "center" }}>
                ✓ {getTranslation(lang, "dash_submitted_on")} {dossier.submittedAt ? new Date(dossier.submittedAt).toLocaleDateString() : new Date().toLocaleDateString()}
              </div>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--text-muted)", textAlign: "center" }}>
                {getTranslation(lang, "dash_submitted_locked_note")}
              </p>
              {user && user.role === "demandeur" && (
                <button
                  className="btn"
                  onClick={handleReopenDossier}
                  style={{
                    padding: "0.6rem 1.25rem",
                    fontSize: "0.85rem",
                    background: "rgba(245, 158, 11, 0.15)",
                    color: "#b45309",
                    border: "1px solid rgba(245, 158, 11, 0.4)",
                    fontWeight: "bold",
                    borderRadius: "0.4rem",
                    cursor: "pointer",
                    transition: "all 0.2s ease"
                  }}
                >
                  {getTranslation(lang, "dash_btn_reopen_dossier")}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 📋 CERFA 11436*05 Interactive PDF Generator Card */}
      <div className="glass-card" style={{ padding: "1.5rem", marginBottom: "1.5rem", border: "1px solid var(--border-card)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.25rem", background: "rgba(13, 148, 136, 0.03)" }}>
        <div style={{ flex: 1, minWidth: "280px" }}>
          <h3 style={{ margin: 0, fontSize: "1.1rem", display: "flex", alignItems: "center", gap: "0.5rem", color: "var(--accent)" }}>
            📋 Demande de Regroupement Familial (CERFA n° 11436*05)
          </h3>
          <p style={{ margin: "0.4rem 0 0 0", fontSize: "0.83rem", color: "var(--text-muted)", lineHeight: "1.5" }}>
            Générez et téléchargez instantanément le formulaire officiel CERFA pré-rempli avec les informations de votre dossier.
          </p>
        </div>
        <div>
          {couple?.isPremium ? (
            <button 
              className="btn btn-primary"
              onClick={handleOpenCerfaModal}
              style={{ fontWeight: "bold", padding: "0.75rem 1.25rem", display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
            >
              📝 Remplir & Télécharger
            </button>
          ) : (
            <button 
              className="btn btn-secondary"
              onClick={() => setShowUpgradeModal(true)}
              style={{ fontWeight: "bold", padding: "0.75rem 1.25rem", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.5rem", background: "rgba(239, 68, 68, 0.08)", color: "var(--danger)", border: "1px solid rgba(239, 68, 68, 0.2)" }}
            >
              🔒 Premium : Générer le CERFA
            </button>
          )}
        </div>
      </div>

      {/* Dual Columns Checklists */}
      <div className="dashboard-grid">
        {renderChecklist(
          dossier.franceDocs, 
          "demandeur", 
          `${getTranslation(lang, "dash_applicant_section")} ${couple?.demandeur?.firstName || ""}`
        )}
        {couple?.beneficiaire && couple.beneficiaire.password_hash !== "INVITATION_PENDING" ? (
          renderChecklist(
            dossier.moroccoDocs, 
            "beneficiaire", 
            `${getTranslation(lang, "dash_beneficiary_section")} ${couple?.beneficiaire?.first_name || couple?.beneficiaire?.firstName || ""}`
          )
        ) : couple?.beneficiaire && couple.beneficiaire.password_hash === "INVITATION_PENDING" ? (
          <div className="glass-card" style={{ padding: "2rem", border: "2px solid var(--accent)", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            <h3 style={{ color: "var(--accent)", fontSize: "1.2rem", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <MoroccoFlag size={20} /> {getTranslation(lang, "invite_pending_card_title")}
            </h3>
            <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", lineHeight: "1.5", margin: 0 }}>
              {getTranslation(lang, "invite_pending_card_desc", { name: `${couple.beneficiaire.first_name || couple.beneficiaire.firstName || ""} ${couple.beneficiaire.last_name || couple.beneficiaire.lastName || ""}`.trim() })}
            </p>

            <div style={{ background: "rgba(13, 148, 136, 0.08)", border: "1px solid rgba(13, 148, 136, 0.2)", borderRadius: "0.5rem", padding: "1rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              <div style={{ fontSize: "0.82rem", color: "var(--text-main)", fontWeight: 600 }}>
                🔗 Lien direct d'invitation :
              </div>
              <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", wordBreak: "break-all", background: "var(--bg-main)", padding: "0.5rem", borderRadius: "0.25rem", border: "1px solid var(--border-card)" }}>
                {`https://${config.appDomain || window.location.host}/?inviteCoupleId=${couple.id}&inviteEmail=${encodeURIComponent(couple.beneficiaire.email || "")}`}
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{ padding: "0.75rem 1rem", fontSize: "0.88rem", fontWeight: "bold" }}
                onClick={() => {
                  const link = `https://${config.appDomain || window.location.host}/?inviteCoupleId=${couple.id}&inviteEmail=${encodeURIComponent(couple.beneficiaire.email || "")}`;
                  navigator.clipboard.writeText(link);
                  setCopiedInviteLinkSuccess(true);
                  setTimeout(() => setCopiedInviteLinkSuccess(false), 2500);
                }}
              >
                {copiedInviteLinkSuccess ? getTranslation(lang, "invite_link_copied") : getTranslation(lang, "invite_btn_copy_link")}
              </button>

              <button
                className="btn"
                style={{ background: "#25D366", color: "white", padding: "0.75rem 1rem", fontSize: "0.88rem", fontWeight: "bold", border: "none" }}
                onClick={() => {
                  const link = `https://${config.appDomain || window.location.host}/?inviteCoupleId=${couple.id}&inviteEmail=${encodeURIComponent(couple.beneficiaire.email || "")}`;
                  const cleanPhone = (couple.beneficiaire.phone || "").replace(/[^\d+]/g, "").replace("+", "");
                  const text = `Bonjour ${couple.beneficiaire.first_name || couple.beneficiaire.firstName || ""}, vous êtes invité(e) à rejoindre notre dossier conjoint de regroupement familial ! \n\nCliquez sur ce lien pour configurer votre mot de passe :\n${link}`;
                  const waUrl = cleanPhone 
                    ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
                    : `https://wa.me/?text=${encodeURIComponent(text)}`;
                  window.open(waUrl, "_blank");
                }}
              >
                {getTranslation(lang, "invite_btn_resend_wa")}
              </button>

              <button
                className="btn btn-secondary"
                style={{ padding: "0.6rem 1rem", fontSize: "0.82rem", color: "var(--danger)" }}
                onClick={handleCancelInvite}
              >
                {getTranslation(lang, "invite_btn_cancel_reinvite")}
              </button>
            </div>
          </div>
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
                <div style={{ background: "var(--success-bg)", color: "var(--success)", padding: "0.75rem 1.25rem", borderRadius: "0.5rem", fontWeight: 600, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                  <div>✓ {inviteSuccess}</div>
                  {whatsappUrlResult && (
                    <a
                      href={whatsappUrlResult}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn"
                      style={{ background: "#25D366", color: "white", padding: "0.65rem 1rem", textDecoration: "none", fontWeight: "bold", borderRadius: "0.5rem", textAlign: "center", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: "0.5rem", boxShadow: "0 4px 12px rgba(37, 211, 102, 0.3)" }}
                    >
                      {getTranslation(lang, "invite_btn_whatsapp_open")}
                    </a>
                  )}
                </div>
              )}

              {inviteError && (
                <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1.25rem", borderRadius: "0.5rem", fontWeight: 600 }}>
                  ⚠️ {inviteError}
                </div>
              )}

              <form onSubmit={handleInviteSpouseSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
                {/* Channel Selector */}
                <div className="form-group">
                  <label className="form-label">{getTranslation(lang, "invite_channel_lbl")}</label>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className={`btn ${inviteChannel === "email" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1, padding: "0.5rem", fontSize: "0.82rem", fontWeight: "bold" }}
                      onClick={() => { setInviteChannel("email"); setWhatsappUrlResult(""); }}
                    >
                      {getTranslation(lang, "invite_channel_email")}
                    </button>
                    <button
                      type="button"
                      className={`btn ${inviteChannel === "whatsapp" ? "btn-primary" : "btn-secondary"}`}
                      style={{ flex: 1, padding: "0.5rem", fontSize: "0.82rem", fontWeight: "bold", background: inviteChannel === "whatsapp" ? "#25D366" : undefined, borderColor: inviteChannel === "whatsapp" ? "#25D366" : undefined }}
                      onClick={() => { setInviteChannel("whatsapp"); setWhatsappUrlResult(""); }}
                    >
                      {getTranslation(lang, "invite_channel_whatsapp")}
                    </button>
                  </div>
                </div>

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
                  <label className="form-label">Adresse E-mail du conjoint {inviteChannel === "email" ? "*" : "(Optionnel)"}</label>
                  <input className="input-field" type="email" placeholder="conjoint.maroc@gmail.com" required={inviteChannel === "email"} value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Téléphone {inviteChannel === "whatsapp" ? "*" : ""}</label>
                    <input className="input-field" type="text" placeholder="+212 6..." required={inviteChannel === "whatsapp"} value={invitePhone} onChange={e => setInvitePhone(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Ville au Maroc</label>
                    <input className="input-field" type="text" placeholder="Casablanca" value={inviteCity} onChange={e => setInviteCity(e.target.value)} />
                  </div>
                </div>
                <div style={{ marginTop: "0.75rem" }}>
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.75rem 1.5rem", width: "100%", background: inviteChannel === "whatsapp" ? "#25D366" : undefined, borderColor: inviteChannel === "whatsapp" ? "#25D366" : undefined }} disabled={inviteLoading}>
                    {inviteChannel === "whatsapp" ? "💬 Préparer l'invitation WhatsApp" : "✉️ Envoyer l'invitation par E-mail"}
                  </button>
                </div>
              </form>
            </div>
          )
        )}
      </div>

      {/* 🌟 Premium Upgrade Modal (Glassmorphism design rendered via Portal) */}
      {showUpgradeModal && createPortal(
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.8)", // Dark backdrop
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            padding: "1rem",
            boxSizing: "border-box"
          }}
          onClick={() => setShowUpgradeModal(false)}
        >
          <div 
            className="glass-card" 
            style={{
              maxWidth: "500px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "clamp(1.5rem, 4vw, 2.25rem)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              margin: "auto",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5), 0 8px 10px -6px rgb(0 0 0 / 0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
        </div>,
        document.body
      )}

      {/* 📝 Interactive CERFA Form Modal */}
      {showCerfaModal && createPortal(
        <div 
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(15, 23, 42, 0.85)", // Dark backdrop
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            padding: "1rem",
            boxSizing: "border-box"
          }}
          onClick={() => setShowCerfaModal(false)}
        >
          <div 
            className="glass-card" 
            style={{
              maxWidth: "650px",
              width: "100%",
              maxHeight: "90vh",
              overflowY: "auto",
              padding: "2rem",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              margin: "auto",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              boxShadow: "0 20px 25px -5px rgb(0 0 0 / 0.5)"
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setShowCerfaModal(false)}
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

            <div>
              <h2 style={{ fontSize: "1.4rem", color: "var(--accent)", margin: 0, display: "flex", alignItems: "center", gap: "0.5rem" }}>
                📋 Remplir la demande de Regroupement Familial
              </h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.83rem", marginTop: "0.4rem" }}>
                Complétez ou validez les informations ci-dessous. Le PDF officiel CERFA n° 11436*05 sera généré et téléchargé instantanément.
              </p>
            </div>

            {cerfaError && (
              <div style={{ background: "var(--danger-bg)", color: "var(--danger)", padding: "0.75rem 1rem", borderRadius: "0.5rem", fontSize: "0.85rem", fontWeight: 600 }}>
                ⚠️ {cerfaError}
              </div>
            )}

            <form onSubmit={handleDownloadCerfaSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
              
              {/* Section 1: Demandeur (Sponsor) */}
              <div style={{ borderBottom: "1px solid var(--border-card)", paddingBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🇫🇷 Cadre A : Le Demandeur (Sponsor en France)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Date de naissance</label>
                    <input className="input-field" type="text" placeholder="JJ/MM/AAAA" required value={cerfaSponsorBirthDate} onChange={e => setCerfaSponsorBirthDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lieu de naissance (Ville / Pays)</label>
                    <input className="input-field" type="text" placeholder="ex: Paris, France" required value={cerfaSponsorBirthPlace} onChange={e => setCerfaSponsorBirthPlace(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "0.5rem" }}>
                  <label className="form-label">Nationalité</label>
                  <input className="input-field" type="text" required value={cerfaSponsorNationality} onChange={e => setCerfaSponsorNationality(e.target.value)} />
                </div>
              </div>

              {/* Section 2: Bénéficiaire (Spouse) */}
              <div style={{ borderBottom: "1px solid var(--border-card)", paddingBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🇲🇦 Cadre B : Le Conjoint (Bénéficiaire au Maroc)
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Date de naissance</label>
                    <input className="input-field" type="text" placeholder="JJ/MM/AAAA" required value={cerfaSpouseBirthDate} onChange={e => setCerfaSpouseBirthDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lieu de naissance (Ville / Pays)</label>
                    <input className="input-field" type="text" placeholder="ex: Casablanca, Maroc" required value={cerfaSpouseBirthPlace} onChange={e => setCerfaSpouseBirthPlace(e.target.value)} />
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "0.5rem" }}>
                  <label className="form-label">Nationalité</label>
                  <input className="input-field" type="text" required value={cerfaSpouseNationality} onChange={e => setCerfaSpouseNationality(e.target.value)} />
                </div>
              </div>

              {/* Section 3: Mariage */}
              <div style={{ borderBottom: "1px solid var(--border-card)", paddingBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  💍 Infos Mariage
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Date du mariage</label>
                    <input className="input-field" type="text" placeholder="JJ/MM/AAAA" required value={cerfaMarriageDate} onChange={e => setCerfaMarriageDate(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Lieu du mariage (Ville / Pays)</label>
                    <input className="input-field" type="text" placeholder="ex: Rabat, Maroc" required value={cerfaMarriagePlace} onChange={e => setCerfaMarriagePlace(e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Section 4: Logement et ressources */}
              <div style={{ borderBottom: "1px solid var(--border-card)", paddingBottom: "1rem" }}>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", fontSize: "0.92rem", display: "flex", alignItems: "center", gap: "0.3rem" }}>
                  🏠 Cadre D & E : Logement & Ressources
                </h4>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label className="form-label">Surface Habitable (m²)</label>
                    <input className="input-field" type="number" required value={cerfaLivingSurface} onChange={e => setCerfaLivingSurface(e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Nombre de pièces</label>
                    <input className="input-field" type="number" required value={cerfaRoomsCount} onChange={e => setCerfaRoomsCount(e.target.value)} />
                  </div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginTop: "0.5rem" }}>
                  <div className="form-group">
                    <label className="form-label">Type de Logement</label>
                    <select className="input-field" value={cerfaHousingType} onChange={e => setCerfaHousingType(e.target.value)}>
                      <option value="Appartement">Appartement</option>
                      <option value="Maison Individuelle">Maison Individuelle</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Zone géographique OFII</label>
                    <select className="input-field" value={cerfaGeographicZone} onChange={e => setCerfaGeographicZone(e.target.value)}>
                      <option value="A">Zone A</option>
                      <option value="B">Zone B</option>
                      <option value="C">Zone C</option>
                    </select>
                  </div>
                </div>
                <div className="form-group" style={{ marginTop: "0.5rem" }}>
                  <label className="form-label">Revenu Net Moyen Mensuel (€)</label>
                  <input className="input-field" type="number" required value={cerfaAverageSalary} onChange={e => setCerfaAverageSalary(e.target.value)} />
                </div>
              </div>

              {/* Section 5: Signature */}
              <div>
                <h4 style={{ margin: "0 0 0.75rem 0", color: "var(--text-main)", fontSize: "0.92rem" }}>
                  ✍️ Cadre F : Signature
                </h4>
                <div className="form-group">
                  <label className="form-label">Fait à (Ville de signature en France)</label>
                  <input className="input-field" type="text" required value={cerfaDoneAt} onChange={e => setCerfaDoneAt(e.target.value)} />
                </div>
              </div>

              <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  style={{ flex: 1, padding: "0.85rem" }}
                  onClick={() => setShowCerfaModal(false)}
                >
                  Annuler
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ flex: 2, padding: "0.85rem", fontWeight: "bold" }}
                  disabled={cerfaLoading}
                >
                  {cerfaLoading ? "Génération du PDF..." : "📥 Télécharger le CERFA"}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
