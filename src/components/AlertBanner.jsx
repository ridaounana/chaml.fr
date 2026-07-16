import React, { useState } from "react";
import { getTranslation } from "../utils/i18n";

export default function AlertBanner({ lang, couple, dossier }) {
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState("gracieux");
  const [copied, setCopied] = useState(false);

  if (!dossier || dossier.status !== "submitted" || !dossier.submittedAt) {
    return null;
  }

  const submissionDate = new Date(dossier.submittedAt);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

  // Trigger alert if submitted more than 6 months ago
  const isAlertActive = submissionDate < sixMonthsAgo;

  if (!isAlertActive) {
    return null;
  }

  const formattedDate = submissionDate.toLocaleDateString(lang === "ar" ? "ar-MA" : lang === "en" ? "en-US" : "fr-FR", {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const demandeurName = `${couple.demandeur.firstName} ${couple.demandeur.lastName}`;
  const beneficiaireName = `${couple.beneficiaire.firstName} ${couple.beneficiaire.lastName}`;
  const demandeurCity = couple.demandeur.city || "Paris";
  const department = couple.demandeur.department || "75";

  // Pre-filled Letter Templates
  const getLetterTemplate = () => {
    const todayStr = new Date().toLocaleDateString("fr-FR", {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    if (activeTab === "gracieux") {
      return `Objet : Recours gracieux suite à un refus implicite de regroupement familial
Réf dossier : ${dossier.id}

À l'attention de Monsieur le Préfet de département (${department})
Préfecture de ${demandeurCity}

Fait à ${demandeurCity}, le ${todayStr}

Monsieur le Préfet,

Je soussigné(e) ${demandeurName}, demeurant à ${demandeurCity}, a l'honneur de former par la présente un recours gracieux à l'encontre de la décision de refus implicite de ma demande de regroupement familial concernant mon conjoint(e) ${beneficiaireName}, né(e) au Maroc.

En effet, j'ai déposé mon dossier de demande complet le ${submissionDate.toLocaleDateString("fr-FR")} (Attestation de dépôt ci-jointe).
Conformément à l'article L. 434-7 du Code de l'entrée et du séjour des étrangers et du droit d'asile (CESEDA), l'administration dispose d'un délai de six mois pour statuer sur cette demande. À ce jour, aucune décision expresse ne m'a été notifiée, ce qui donne naissance à une décision de rejet implicite.

Je tiens à souligner que je remplis toutes les conditions légales requises pour l'aboutissement de cette procédure :
1. Une durée de résidence régulière de plus de 18 mois en France.
2. Des ressources stables issues de mon emploi d'ingénieur salarié supérieures au SMIC net moyen (justificatifs joints).
3. Un logement décent d'une surface habitable conforme aux normes de surface exigées pour notre couple dans la zone géographique.

Par conséquent, je sollicite votre haute bienveillance afin de bien vouloir réexaminer mon dossier et prononcer l'autorisation de regroupement familial au bénéfice de mon conjoint(e).

Je vous prie d'agréer, Monsieur le Préfet, l'expression de ma haute considération.

[Signature]
${demandeurName}`;
    }

    if (activeTab === "hierarchique") {
      return `Objet : Recours hiérarchique contre la décision de refus implicite de regroupement familial
Réf dossier : ${dossier.id}

À l'attention de Monsieur le Ministre de l'Intérieur
Direction de l'immigration (Sous-direction des visas)
Place Beauvau, 75800 Paris

Fait à ${demandeurCity}, le ${todayStr}

Monsieur le Ministre,

Je me permets de solliciter votre haute attention afin de former un recours hiérarchique contre la décision de refus implicite opposée par Monsieur le Préfet de (${department}) à ma demande de regroupement familial introduite le ${submissionDate.toLocaleDateString("fr-FR")}.

Mon dossier concerne mon conjoint(e) ${beneficiaireName}, résidant au Maroc. 

Monsieur le Préfet n'ayant pas répondu dans le délai légal de 6 mois, une décision de refus implicite s'est constituée. Pourtant, l'ensemble des conditions exigées par les articles L. 434-1 et suivants du CESEDA sont pleinement respectées :
- Je réside en France depuis février 2020 en qualité d'ingénieur salarié.
- Mes fiches de paie et mon avis d'imposition prouvent des ressources largement supérieures au SMIC.
- Mon logement respecte les règles de décence et présente une surface suffisante.

Le refus implicite de ma demande de regroupement familial porte une atteinte disproportionnée à mon droit de mener une vie familiale normale, garanti par l'article 8 de la Convention Européenne des Droits de l'Homme.

C'est pourquoi je sollicite votre intervention afin que soit annulée la décision implicite du Préfet et que mon droit au regroupement familial soit reconnu.

Je vous prie de croire, Monsieur le Ministre, en l'assurance de mon profond respect.

[Signature]
${demandeurName}`;
    }

    // Contentieux
    return `REQUÊTE EN ANNULATION DEVANT LE TRIBUNAL ADMINISTRATIF DE ${demandeurCity.toUpperCase()}

Pour : Monsieur/Madame ${demandeurName}, né(e) au Maroc, de nationalité marocaine, exerçant la profession d'ingénieur, demeurant à ${demandeurCity}.

Contre : La décision implicite de rejet de Monsieur le Préfet de (${department}) refusant la demande de regroupement familial au bénéfice de son conjoint(e) ${beneficiaireName}.

Fait le ${todayStr}

PLAISE AU TRIBUNAL,

Le requérant réside régulièrement en France depuis février 2020. Le ${submissionDate.toLocaleDateString("fr-FR")}, il a déposé une demande de regroupement familial pour son conjoint(e) ${beneficiaireName}. Un refus implicite est né du silence gardé pendant plus de six mois par l'administration.

DISCUSSION

Sur le bien-fondé de la demande :
Le requérant justifie de ressources stables et suffisantes tirées de son activité d'ingénieur (salaire supérieur au SMIC). Il dispose d'un logement salubre répondant aux critères de surface pour son ménage. Toutes les conditions prévues par le CESEDA sont réunies.

Par ces motifs, le requérant conclut qu'il plaise au Tribunal :
1. D'annuler la décision implicite de rejet du Préfet.
2. D'enjoindre au Préfet de délivrer une autorisation de regroupement familial dans un délai d'un mois sous astreinte de 100 € par jour de retard.

Sous réserves de tous autres mémoires ou pièces complémentaires.

[Signature]
${demandeurName}`;
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getLetterTemplate());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <div className="alert-banner fade-in">
        <div className="alert-header">
          <span>⚠️</span>
          <span>{getTranslation(lang, "alert_title")}</span>
        </div>
        <p style={{ fontSize: "0.95rem", lineHeight: "1.5" }}>
          {getTranslation(lang, "alert_body", { date: formattedDate })}
        </p>
        <div>
          <button className="btn btn-accent" onClick={() => setShowModal(true)}>
            ⚖️ {getTranslation(lang, "alert_action_btn")}
          </button>
        </div>
      </div>

      {showModal && (
        <div className="appeal-dialog-backdrop" onClick={() => setShowModal(false)}>
          <div className="appeal-dialog" onClick={(e) => e.stopPropagation()} style={{ dir: "ltr" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h2 style={{ fontSize: "1.4rem" }}>⚖️ {getTranslation(lang, "alert_recours_title")}</h2>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)} style={{ padding: "0.25rem 0.6rem" }}>
                ✕
              </button>
            </div>
            <p style={{ color: "var(--text-muted)", fontSize: "0.9rem" }}>
              {getTranslation(lang, "alert_recours_desc")}
            </p>

            {/* Appeal Choice tabs */}
            <div className="appeal-tabs">
              <button
                className={`appeal-tab ${activeTab === "gracieux" ? "active" : ""}`}
                onClick={() => setActiveTab("gracieux")}
              >
                📝 {getTranslation(lang, "alert_recours_gracieux")}
              </button>
              <button
                className={`appeal-tab ${activeTab === "hierarchique" ? "active" : ""}`}
                onClick={() => setActiveTab("hierarchique")}
              >
                👔 {getTranslation(lang, "alert_recours_hierarchique")}
              </button>
              <button
                className={`appeal-tab ${activeTab === "contentieux" ? "active" : ""}`}
                onClick={() => setActiveTab("contentieux")}
              >
                ⚖️ {getTranslation(lang, "alert_recours_contentieux")}
              </button>
            </div>

            {/* Letter Preview Box */}
            <div className="letter-preview">
              {getLetterTemplate()}
            </div>

            {/* Copy / Close buttons */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "1rem" }}>
              <button className="btn btn-primary" onClick={handleCopy}>
                {copied ? `✓ ${getTranslation(lang, "letter_copied")}` : getTranslation(lang, "btn_copy_letter")}
              </button>
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>
                {getTranslation(lang, "btn_close")}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
