import React, { useState } from "react";
import { getTranslation } from "../utils/i18n";
import { FranceFlag, MoroccoFlag } from "./Flag";

export default function StepsGuide({ lang }) {
  const [activeTab, setActiveTab] = useState("france");

  const stepsFrance = [
    {
      num: "1",
      titleFR: "Constitution du dossier",
      titleAR: "جمع وثائق الملف",
      titleEN: "File Preparation",
      descFR: "Rassemblez toutes les pièces justificatives : état civil, mariage transcrit, 12 fiches de paie, bail et surface du logement. Assurez-vous que vos revenus atteignent le SMIC.",
      descAR: "جمع كل الوثائق الإثباتية: الحالة المدنية، عقد زواج مسجل، 12 كشف راتب، عقد كراء وتفاصيل مساحة السكن. تأكد من أن مداخيلك تصل للحد الأدنى للأجور.",
      descEN: "Collect all supporting documents: civil status, transcribed marriage certificate, 12 payslips, lease agreement, and flat surface area. Ensure your income meets the SMIC.",
      link: "https://www.service-public.fr/particuliers/vosdroits/F11166"
    },
    {
      num: "2",
      titleFR: "Dépôt de la demande (En ligne)",
      titleAR: "تقديم الطلب (عبر الإنترنت)",
      titleEN: "Submission of Application (Online)",
      descFR: "La demande s'effectue sur le portail de l'ANEF (Administration Numérique des Étrangers en France). Téléchargez toutes les pièces numérisées.",
      descAR: "يتم تقديم الطلب عبر منصة ANEF الرقمية المخصصة للأجانب في فرنسا. قم برفع كافة الوثائق بنسخة رقمية.",
      descEN: "The application is submitted on the ANEF online portal for foreigners in France. Upload all scanned documents.",
      link: "https://administration-etrangers-en-france.interieur.gouv.fr/"
    },
    {
      num: "3",
      titleFR: "Délivrance de l'attestation de dépôt",
      titleAR: "إصدار وصل الإيداع",
      titleEN: "Issuance of Deposit Certificate",
      descFR: "Une fois le dossier jugé complet par l'OFII, vous recevez une attestation de dépôt par courriel. C'est à cette date exacte que démarre le délai légal de 6 mois pour obtenir une réponse.",
      descAR: "بمجرد اعتبار الملف كاملاً من طرف الـ OFII، ستتلقى وصل الإيداع عبر البرid الإلكتروني. من هذا التاريخ يبدأ احتساب الأجل القانوني (6 أشهر) للرد.",
      descEN: "Once the application is deemed complete by the OFII, you receive a deposit certificate by email. This exact date starts the legal 6-month response timer.",
      link: null
    },
    {
      num: "4",
      titleFR: "Enquêtes Logement et Ressources",
      titleAR: "التحقيق في السكن والموارد المادية",
      titleEN: "Housing & Income Investigation",
      descFR: "L'OFII ou la Mairie vérifie vos revenus. Un enquêteur de la mairie ou de l'OFII peut prendre rendez-vous pour visiter votre logement et mesurer sa surface réelle.",
      descAR: "تقوم الـ OFII أو البلدية بالتحقق من مداخيلك. يمكن لمفتش من البلدية أو الـ OFII تحديد موعد لزيارة سكنك وقياس مساحته الحقيقية.",
      descEN: "The OFII or the local Town Hall verifies your income. An investigator may schedule a visit to inspect your flat and measure its exact habitable surface.",
      link: null
    },
    {
      num: "5",
      titleFR: "Avis du Maire",
      titleAR: "رأي رئيس البلدية",
      titleEN: "Mayor's Assessment",
      descFR: "Le maire de votre commune dispose d'un délai de 2 mois pour donner son avis sur vos conditions de logement et de ressources. Passé ce délai, son avis est réputé favorable.",
      descAR: "لدى رئيس البلدية مهلة شهرين لإعطاء رأيه حول ظروف السكن والدخل الخاصة بك. بعد تجاوز هذه المهلة، يعتبر رأيه إيجابيًا ومقبولاً.",
      descEN: "The mayor of your town has 2 months to provide feedback on your housing and financial stability. If no response is given, it is deemed favorable.",
      link: null
    },
    {
      num: "6",
      titleFR: "Décision du Préfet",
      titleAR: "قرار المحافظ",
      titleEN: "Prefect's Decision",
      descFR: "Le préfet prend la décision finale d'acceptation ou de refus de votre demande. Il a 6 mois à partir du dépôt pour répondre. Le silence vaut refus implicite.",
      descAR: "يتخذ المحافظ القرار النهائي بقبول الطلب أو رفضه. لديه مهلة 6 أشهر من تاريخ الإيداع للرد. عدم الرد يعتبر رفضًا ضمنيًا.",
      descEN: "The Prefect makes the final decision to approve or reject your application. They must reply within 6 months of deposit. Silence constitutes implicit rejection.",
      link: null
    }
  ];

  const stepsMorocco = [
    {
      num: "7",
      titleFR: "Notification d'accord & Transmission du dossier",
      titleAR: "التبليغ بالموافقة وإرسال الملف",
      titleEN: "Notification of Approval & File Transmission",
      descFR: "En cas d'accord du préfet, l'attestation d'accord vous est envoyée. Le dossier est transmis électroniquement au consulat de France compétent au Maroc et à l'OFII Casablanca.",
      descAR: "في حالة موافقة المحافظ، يتم إرسال وثيقة الموافقة إليك. يرسل الملف إلكترونيًا إلى القنصلية الفرنسية المعنية بالمغرب ومكتب الـ OFII بالدار البيضاء.",
      descEN: "If approved by the Prefect, the approval certificate is sent to you. The file is sent electronically to the French consulate in Morocco and OFII Casablanca.",
      link: null
    },
    {
      num: "8",
      titleFR: "Visite médicale obligatoire à l'OFII Casablanca",
      titleAR: "الفحص الطبي الإجباري بـ OFII الدار البيضاء",
      titleEN: "Mandatory Medical Check at OFII Casablanca",
      descFR: "Le conjoint au Maroc est convoqué à l'OFII Casablanca pour un contrôle médical (radiographie pulmonaire, vérification vaccinale). Un certificat médical lui est délivré.",
      descAR: "يتم استدعاء الزوج(ة) في المغرب لمكتب الـ OFII بالدار البيضاء لإجراء الفحص الطبي (أشعة الرئة، التحقق من اللقاحات) لتسلم الشهادة الطبية.",
      descEN: "The spouse in Morocco is summoned to OFII Casablanca for a medical examination (lung X-ray, vaccine checks). A medical certificate is issued.",
      link: "https://ma.tlscontact.com/"
    },
    {
      num: "9",
      titleFR: "Demande de Visa Long Séjour",
      titleAR: "طلب تأشيرة الإقامة الطويلة",
      titleEN: "Long Stay Visa Application",
      descFR: "Le conjoint prend rendez-vous sur TLScontact pour déposer sa demande de visa de long séjour (regroupement familial). Il fournit le passeport, l'acte de mariage et l'accord préfectoral.",
      descAR: "يقوم الزوج(ة) بحجز موعد لدى TLScontact لتقديم طلب التأشيرة (لم الشمل). يتم تقديم جواز السفر، عقد الزواج، ووثيقة موافقة المحافظ.",
      descEN: "The spouse books an appointment on TLScontact to submit their long-stay visa request (family reunification). They submit their passport, marriage deed, and approval letter.",
      link: "https://france-visas.gouv.fr/"
    },
    {
      num: "10",
      titleFR: "Délivrance du Visa & Voyage",
      titleAR: "إصدار التأشيرة والسفر",
      titleEN: "Visa Issuance & Travel",
      descFR: "Le consulat appose le visa de long séjour (VLS-TS) sur le passeport. Le conjoint peut désormais voyager et entrer légalement en France.",
      descAR: "تقوم القنصلية بوضع تأشيرة الإقامة الطويلة (VLS-TS) على جواز السفر. يمكن للشريك الآن السفر ودخول التراب الفرنسي قانونيًا.",
      descEN: "The consulate stamps the long-stay visa (VLS-TS) in the passport. The spouse is now clear to travel and enter France legally.",
      link: null
    },
    {
      num: "11",
      titleFR: "Validation du visa & Contrat d'Intégration Républicaine (CIR)",
      titleAR: "تفعيل التأشيرة وتوقيع عقد الاندماج الجمهوري",
      titleEN: "Visa Validation & CIR Signing",
      descFR: "Dans les 3 mois suivant son arrivée en France, le conjoint doit valider son visa en ligne. Il sera ensuite convoqué à l'OFII pour passer les tests de langue et signer le CIR.",
      descAR: "في غضون 3 أشهر من الوصول لفرنسا، يجب تفعيل التأشيرة عبر الإنترنت. سيتم استدعاء الشريك بعد ذلك للـ OFII لاجتياز اختبار اللغة وتوقيع عقد الاندماج.",
      descEN: "Within 3 months of arrival in France, the spouse must validate their visa online. They will then be summoned by the OFII to take language tests and sign the CIR.",
      link: "https://administration-etrangers-en-france.interieur.gouv.fr/particuliers/#/vls-ts/valider-enregistrement"
    }
  ];

  const steps = activeTab === "france" ? stepsFrance : stepsMorocco;

  return (
    <div className="glass-card fade-in" style={{ marginTop: "2rem" }}>
      <h2 style={{ fontSize: "1.6rem", marginBottom: "0.5rem" }}>
        🧭 {getTranslation(lang, "guide_title")}
      </h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.95rem", marginBottom: "2rem" }}>
        {getTranslation(lang, "guide_desc")}
      </p>

      {/* Tabs Header */}
      <div className="tabs-header" style={{ marginBottom: "2rem" }}>
        <button
          className={`tab-btn ${activeTab === "france" ? "active" : ""}`}
          onClick={() => setActiveTab("france")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <FranceFlag size={20} /> {getTranslation(lang, "guide_france_tab")}
        </button>
        <button
          className={`tab-btn ${activeTab === "morocco" ? "active" : ""}`}
          onClick={() => setActiveTab("morocco")}
          style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
        >
          <MoroccoFlag size={20} /> {getTranslation(lang, "guide_morocco_tab")}
        </button>
      </div>

      {/* Steps Timeline */}
      <div className="timeline">
        {steps.map((s) => (
          <div key={s.num} className="timeline-item">
            <div className="timeline-dot"></div>
            <div className="timeline-content">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: "1.1rem", color: "var(--primary)" }}>
                  Étape {s.num} : {lang === "ar" ? s.titleAR : lang === "en" ? s.titleEN : s.titleFR}
                </h3>
                <span style={{
                  background: "rgba(var(--primary-rgb), 0.1)",
                  color: "var(--primary)",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "0.35rem",
                  fontWeight: "bold",
                  fontSize: "0.85rem"
                }}>
                  #{s.num}
                </span>
              </div>
              <p style={{ fontSize: "0.9rem", lineHeight: "1.4", color: "var(--text-muted)" }}>
                {lang === "ar" ? s.descAR : lang === "en" ? s.descEN : s.descFR}
              </p>
              {s.link && (
                <div style={{ marginTop: "0.5rem" }}>
                  <a
                    href={s.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-secondary"
                    style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                  >
                    🔗 Lien Officiel
                  </a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
