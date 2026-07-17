import React, { useState } from "react";
import { getTranslation } from "../utils/i18n";
import { FranceFlag, MoroccoFlag } from "../components/Flag";

const LANDING_TEXT = {
  fr: {
    hero_title: "Réunissez votre famille, sans frontières",
    hero_desc: "Chaml.fr est le premier assistant collaboratif intelligent pour le regroupement familial franco-marocain. Suivez vos pièces, validez vos ressources et accélérez vos démarches administratives.",
    btn_start: "Créer notre compte conjoint",
    btn_login: "Se connecter à notre espace",
    feature_title: "Des outils conçus pour simplifier votre dossier",
    feature_desc: "Préparez sereinement votre demande de regroupement familial avec nos modules connectés.",
    feat1_title: "Checklist Collaborative",
    feat1_desc: "Un tableau de bord partagé entre la France et le Maroc. Chaque conjoint sait exactement quels documents charger (PI, Cerfa, État Civil).",
    feat2_title: "Simulateurs de Conformité",
    feat2_desc: "Vérifiez instantanément si votre salaire net moyen des 12 derniers mois et la surface de votre logement respectent les exigences de la préfecture.",
    feat3_title: "Générateur de Recours",
    feat3_desc: "En cas de silence de l'administration au-delà de 6 mois, générez automatiquement vos courriers de recours gracieux ou hiérarchique pré-remplis.",
    feat4_title: "Sécurité & Confidentialité",
    feat4_desc: "Vos données personnelles et vos pièces justificatives sont chiffrées en base de données et accessibles uniquement par vous et votre conjoint.",
    stats_title: "Pourquoi utiliser Chaml.fr ?",
    stat1_val: "100%",
    stat1_lbl: "Conforme aux critères de l'OFII & CESEDA",
    stat2_val: "19€",
    stat2_lbl: "Paiement unique à vie, simulation gratuite",
    stat3_val: "12",
    stat3_lbl: "Documents indispensables suivis en temps réel",
    testimonials_title: "Ils ont réuni leur famille grâce à Chaml",
    test1_quote: "Le simulateur de surface nous a évité de soumettre un dossier non conforme. Salma a pu charger ses documents de Casablanca en direct. Nous sommes enfin réunis à Lyon !",
    test1_author: "Anass & Salma (Réunis en 2026)",
    test2_quote: "Après 6 mois de silence de la préfecture, le générateur de recours nous a permis de débloquer la situation en envoyant la lettre type au Préfet. Indispensable !",
    test2_author: "Youssef & Leyla (Réunis en 2025)",
    footer_text: "Chaml.fr - Conçu par des ingénieurs marocains pour faciliter le rapprochement des familles. Outil d'aide indépendant de l'administration française."
  },
  ar: {
    hero_title: "لم شمل عائلتكم، بدون حدود",
    hero_desc: "شمل.fr هو أول مساعد تعاوني ذكي للم شمل العائلات المغربية في فرنسا. تتبعوا وثائقكم، تأكدوا من مواردكم المالية، وسرّعوا إجراءاتكم الإدارية.",
    btn_start: "إنشاء حسابنا المشترك",
    btn_login: "تسجيل الدخول إلى حسابنا",
    feature_title: "أدوات مصممة لتبسيط ملفكم",
    feature_desc: "أعدوا ملف لم الشمل الخاص بكم بكل طمأنينة باستخدام محاكياتنا الذكية المتصلة.",
    feat1_title: "قائمة مستندات تعاونية",
    feat1_desc: "لوحة تحكم مشتركة بين فرنسا والمغرب. يعرف كل زوج بالضبط المستندات التي يجب تحميلها (عقد الزواج، بطاقة الإقامة، إلخ).",
    feat2_title: "محاكيات المطابقة الرسمية",
    feat2_desc: "تحققوا فورًا من مطابقة راتبكم الشهري ومساحة سكنكم مع الشروط الصارمة لمكتب الهجرة والإدماج (OFII).",
    feat3_title: "منشئ طعون تلقائي",
    feat3_desc: "في حالة صمت الإدارة لأكثر من 6 أشهر، قوموا بإنشاء رسائل طعن استعطافي أو رئاسي معبأة مسبقًا تلقائيًا.",
    feat4_title: "الأمان والخصوصية",
    feat4_desc: "بياناتكم الشخصية ومستنداتكم مشفرة وآمنة تمامًا في قاعدة البيانات، ولا يمكن الوصول إليها إلا من طرفكم.",
    stats_title: "لماذا تستخدمون شمل؟",
    stat1_val: "100%",
    stat1_lbl: "مطابق تمامًا لشروط قانون إقامة الأجانب (CESEDA)",
    stat2_val: "19€",
    stat2_lbl: "دفع لمرة واحدة مدى الحياة، محاكاة مجانية",
    stat3_val: "12",
    stat3_lbl: "وثيقة أساسية يتم تتبعها في الوقت الفعلي",
    testimonials_title: "أزواج اجتمع شملهم بفضل المنصة",
    test1_quote: "ساعدنا محاكي السكن في تجنب تقديم طلب غير مطابق. تمكنت سلمى من تحميل وثائقها مباشرة من الدار البيضاء. نحن أخيرًا معًا في ليون!",
    test1_author: "أنس وسلمى (اجتمعا في 2026)",
    test2_quote: "بعد 6 أشهر من الصمت من العمالة، مكننا منشئ الطعون من حل الوضع عن طريق إرسال الرسالة النموذجية إلى المحافظ. أداة لا غنى عنها!",
    test2_author: "يوسف وليلى (اجتمعا في 2025)",
    footer_text: "شمل.fr - صمم من طرف مهندسين مغاربة لتسهيل لم شمل العائلات. أداة مساعدة مستقلة عن الإدارة الفرنسية."
  },
  en: {
    hero_title: "Reunite your family, without borders",
    hero_desc: "Chaml.fr is the first intelligent collaborative assistant for French-Moroccan family reunification. Track your documents, validate your income limits, and speed up your administration applications.",
    btn_start: "Create our shared account",
    btn_login: "Access our workspace",
    feature_title: "Tools built to simplify your application",
    feature_desc: "Prepare your family reunification application calmly with our connected modules.",
    feat1_title: "Collaborative Checklists",
    feat1_desc: "A shared dashboard synchronized between France and Morocco. Each spouse knows exactly which files to upload.",
    feat2_title: "Compliance Simulators",
    feat2_desc: "Check instantly if your average net salary over the last 12 months and your flat's surface area match prefectural laws.",
    feat3_title: "Appeals Generator",
    feat3_desc: "If the prefecture remains silent for over 6 months, automatically generate pre-filled legal appeal letters.",
    feat4_title: "Security & Privacy",
    feat4_desc: "Your personal data and scans are securely encrypted in our database, accessible only by you and your spouse.",
    stats_title: "Why choose Chaml.fr?",
    stat1_val: "100%",
    stat1_lbl: "Compliant with official OFII & CESEDA rules",
    stat2_val: "19€",
    stat2_lbl: "One-time lifetime payment, free simulation",
    stat3_val: "12",
    stat3_lbl: "Essential documents tracked in real time",
    testimonials_title: "They reunited using Chaml.fr",
    test1_quote: "The flat size simulator saved us from submitting a non-compliant file. Salma uploaded her documents live from Casablanca. We are finally together in Lyon!",
    test1_author: "Anass & Salma (Reunited in 2026)",
    test2_quote: "After 6 months of silence from the prefecture, the appeal generator unlocked the situation by sending the letter to the Prefect. A lifesaver!",
    test2_author: "Youssef & Leyla (Reunited in 2025)",
    footer_text: "Chaml.fr - Created by Moroccan engineers to simplify family reunification. Independent of the French government."
  }
};

export default function Landing({ lang, onNavigate }) {
  const text = LANDING_TEXT[lang] || LANDING_TEXT.fr;
  const [showLegalModal, setShowLegalModal] = useState(false);

  return (
    <div className="landing-wrapper fade-in" style={{ marginTop: "1rem" }}>
      
      {/* Hero Section */}
      <header className="landing-hero-grid">
        {/* Decorative subtle ambient lights */}
        <div style={{
          position: "absolute",
          top: "-50px",
          left: "-50px",
          width: "250px",
          height: "250px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(var(--primary-rgb), 0.2) 0%, transparent 70%)",
          filter: "blur(40px)",
          pointerEvents: "none"
        }}></div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem", zIndex: 2 }}>
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
            <span className="badge badge-approved" style={{ fontSize: "0.8rem", padding: "0.35rem 0.75rem", display: "inline-flex", gap: "0.35rem" }}>
              <FranceFlag size={14} /> 🤝 <MoroccoFlag size={14} /> Regroupement Familial
            </span>
          </div>
          <h1 style={{
            fontSize: "3rem",
            fontWeight: 850,
            lineHeight: "1.15",
            letterSpacing: "-0.03em",
            background: "linear-gradient(to right, var(--text-main) 40%, var(--primary) 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent"
          }}>
            {text.hero_title}
          </h1>
          <p style={{
            fontSize: "1.15rem",
            lineHeight: "1.6",
            color: "var(--text-muted)",
            maxWidth: "520px"
          }}>
            {text.hero_desc}
          </p>
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginTop: "1rem" }}>
            <button 
              className="btn btn-primary" 
              onClick={() => onNavigate("register")}
              style={{ padding: "0.9rem 1.8rem", fontSize: "1rem", fontWeight: "bold", boxShadow: "0 10px 20px -5px rgba(var(--primary-rgb), 0.3)" }}
            >
              🚀 {text.btn_start}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={() => onNavigate("login")}
              style={{ padding: "0.9rem 1.8rem", fontSize: "1rem", fontWeight: "bold" }}
            >
              🔑 {text.btn_login}
            </button>
          </div>
        </div>

        {/* Hero Image Section */}
        <div style={{
          position: "relative",
          borderRadius: "1rem",
          overflow: "hidden",
          border: "1px solid var(--border-card)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25)",
          aspectRatio: "16/10"
        }}>
          <img 
            src="/hero.jpg" 
            alt="Family Reunion Chaml" 
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover"
            }}
          />
        </div>
      </header>

      {/* Stats Board */}
      <section className="landing-stats-grid">
        <div className="glass-card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <h3 style={{ fontSize: "2.5rem", color: "var(--primary)", fontWeight: "800", marginBottom: "0.25rem" }}>{text.stat1_val}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>{text.stat1_lbl}</p>
        </div>
        <div className="glass-card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <h3 style={{ fontSize: "2.5rem", color: "var(--accent)", fontWeight: "800", marginBottom: "0.25rem" }}>{text.stat2_val}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>{text.stat2_lbl}</p>
        </div>
        <div className="glass-card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
          <h3 style={{ fontSize: "2.5rem", color: "var(--primary)", fontWeight: "800", marginBottom: "0.25rem" }}>{text.stat3_val}</h3>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", margin: 0 }}>{text.stat3_lbl}</p>
        </div>
      </section>

      {/* Features Grid */}
      <section style={{ marginBottom: "5rem" }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "2rem", fontWeight: "800" }}>{text.feature_title}</h2>
          <p style={{ color: "var(--text-muted)", marginTop: "0.5rem" }}>{text.feature_desc}</p>
        </div>

        <div className="landing-features-grid">
          {/* Card 1 */}
          <div className="glass-card" style={{ display: "flex", gap: "1.5rem", padding: "2rem" }}>
            <span style={{ fontSize: "2.5rem" }}>📁</span>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>{text.feat1_title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>{text.feat1_desc}</p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="glass-card" style={{ display: "flex", gap: "1.5rem", padding: "2rem" }}>
            <span style={{ fontSize: "2.5rem" }}>📊</span>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>{text.feat2_title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>{text.feat2_desc}</p>
            </div>
          </div>

          {/* Card 3 */}
          <div className="glass-card" style={{ display: "flex", gap: "1.5rem", padding: "2rem" }}>
            <span style={{ fontSize: "2.5rem" }}>⚖️</span>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>{text.feat3_title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>{text.feat3_desc}</p>
            </div>
          </div>

          {/* Card 4 */}
          <div className="glass-card" style={{ display: "flex", gap: "1.5rem", padding: "2rem" }}>
            <span style={{ fontSize: "2.5rem" }}>🔒</span>
            <div>
              <h3 style={{ fontSize: "1.2rem", fontWeight: "700", marginBottom: "0.5rem" }}>{text.feat4_title}</h3>
              <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", lineHeight: "1.5" }}>{text.feat4_desc}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section style={{
        background: "rgba(var(--primary-rgb), 0.03)",
        border: "1px solid var(--border-card)",
        borderRadius: "1.25rem",
        padding: "3rem 2rem",
        marginBottom: "5rem"
      }}>
        <div style={{ textAlign: "center", marginBottom: "3rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "800" }}>{text.testimonials_title}</h2>
        </div>

        <div className="landing-testimonials-grid">
          <div className="glass-card" style={{ padding: "2rem", background: "var(--bg-app)" }}>
            <p style={{ fontStyle: "italic", lineHeight: "1.6", color: "var(--text-main)" }}>
              "{text.test1_quote}"
            </p>
            <strong style={{ display: "block", marginTop: "1rem", color: "var(--primary)", fontSize: "0.85rem" }}>
              — {text.test1_author}
            </strong>
          </div>
          <div className="glass-card" style={{ padding: "2rem", background: "var(--bg-app)" }}>
            <p style={{ fontStyle: "italic", lineHeight: "1.6", color: "var(--text-main)" }}>
              "{text.test2_quote}"
            </p>
            <strong style={{ display: "block", marginTop: "1rem", color: "var(--primary)", fontSize: "0.85rem" }}>
              — {text.test2_author}
            </strong>
          </div>
        </div>
      </section>

      {/* Final Call to Action */}
      <section style={{
        textAlign: "center",
        padding: "4rem 2rem",
        background: "linear-gradient(135deg, rgba(var(--primary-rgb), 0.1) 0%, rgba(var(--accent-rgb), 0.08) 100%)",
        border: "1px solid var(--border-card)",
        borderRadius: "1.25rem",
        marginBottom: "4rem"
      }}>
        <h2 style={{ fontSize: "2.2rem", fontWeight: "850", marginBottom: "1rem" }}>{text.hero_title}</h2>
        <p style={{ color: "var(--text-muted)", maxWidth: "600px", margin: "0 auto 2rem", lineHeight: "1.5" }}>
          Inscrivez-vous dès aujourd'hui pour valider votre dossier et rassembler vos documents.
        </p>
        <button 
          className="btn btn-primary" 
          onClick={() => onNavigate("register")}
          style={{ padding: "1rem 2rem", fontSize: "1.1rem", fontWeight: "bold" }}
        >
          ✨ {text.btn_start}
        </button>
      </section>

      {/* Footer */}
      <footer style={{
        textAlign: "center",
        padding: "2rem 1rem",
        borderTop: "1px solid var(--border-card)",
        color: "var(--text-muted)",
        fontSize: "0.82rem",
        lineHeight: "1.5",
        display: "flex",
        flexDirection: "column",
        gap: "0.75rem",
        alignItems: "center"
      }}>
        <p style={{ maxWidth: "800px", margin: "0 auto" }}>{text.footer_text}</p>
        <p style={{ maxWidth: "800px", margin: "0 auto", fontSize: "0.75rem", opacity: 0.8, fontStyle: "italic" }}>
          Avertissement légal : Chaml.fr est une plateforme privée d'aide et d'accompagnement indépendant. Elle n'est en aucun cas affiliée, associée ou approuvée par l'OFII (Office Français de l'Immigration et de l'Intégration), les consulats ou les autorités publiques. Les informations fournies le sont à titre d'assistance logistique et ne remplacent pas les conseils d'un avocat.
        </p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
          <button 
            onClick={() => setShowLegalModal(true)} 
            style={{ background: "none", border: "none", color: "var(--primary)", textDecoration: "underline", fontSize: "0.8rem", cursor: "pointer" }}
          >
            Mentions Légales & Politique de Confidentialité (RGPD)
          </button>
        </div>
        <p style={{ marginTop: "0.25rem" }}>&copy; 2026 Chaml.fr. Tous droits réservés.</p>
      </footer>

      {/* Legal & GDPR Modal */}
      {showLegalModal && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: "rgba(0, 0, 0, 0.75)",
          backdropFilter: "blur(8px)",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          padding: "1rem"
        }}>
          <div className="glass-card" style={{
            maxWidth: "700px",
            width: "100%",
            maxHeight: "85vh",
            overflowY: "auto",
            padding: "2.5rem",
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: "1.5rem"
          }}>
            <button 
              onClick={() => setShowLegalModal(false)}
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
              <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "0.5rem" }}>⚖️ Mentions Légales & RGPD</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>Dernière mise à jour : Juillet 2026</p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-card)", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-muted)" }}>
              
              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>1. Éditeur de la Plateforme</h3>
                <p>
                  Le site <strong>Chaml.fr</strong> est un projet indépendant à but non commercial, développé par un particulier à titre personnel pour simplifier et optimiser les démarches logistiques complexes du regroupement familial.<br />
                  Contact : <a href="mailto:support@chaml.fr" style={{ color: "var(--primary)" }}>support@chaml.fr</a>.
                </p>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>2. Hébergement des données</h3>
                <p>
                  Toutes les données chiffrées de la plateforme, y compris les fichiers et documents justificatifs téléversés, sont stockées de manière hautement sécurisée sur des serveurs situés en France (Union Européenne).
                </p>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>3. Politique de Confidentialité & Chiffrement de bout en bout (E2EE)</h3>
                <p>
                  Conformément aux principes du RGPD et pour garantir une confidentialité absolue, Chaml.fr utilise une architecture <strong>Zero-Knowledge</strong> :
                </p>
                <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <li><strong>Chiffrement Client AES-GCM :</strong> Chaque document téléversé est crypté directement dans votre navigateur avant son envoi au serveur grâce à une clé de chiffrement privée (un code secret) choisie par vous et que vous êtes le seul à connaître.</li>
                  <li><strong>Confidentialité absolue :</strong> Le serveur ne reçoit et ne stocke que les fichiers chiffrés. La clé de déchiffrement n'est jamais transmise ni stockée. Par conséquent, les administrateurs et l'hébergeur n'ont aucun moyen technique de visualiser vos documents.</li>
                  <li><strong>Données collectées :</strong> Seules les métadonnées de base (adresse e-mail, prénoms/noms, téléphone facultatif, surface et zone de logement) sont traitées en clair pour le fonctionnement de la check-list collaborative.</li>
                  <li><strong>Conservation & Droit à l'oubli :</strong> Toutes vos données et fichiers cryptés sont conservés tant que votre compte est actif. Vous pouvez supprimer définitivement votre compte et l'ensemble de vos documents à tout moment d'un simple clic depuis vos paramètres utilisateurs.</li>
                  <li><strong>Vos droits :</strong> Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données personnelles. Pour l'exercer, contactez <a href="mailto:support@chaml.fr" style={{ color: "var(--primary)" }}>support@chaml.fr</a>.</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>4. Avertissement de service</h3>
                <p>
                  Chaml.fr est un outil d'accompagnement logistique privé. Les simulations et conseils fournis par l'application sont indicatifs et basés sur les règles de l'OFII. Ils ne constituent pas un avis juridique contraignant.
                </p>
              </div>

            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-card)", margin: 0 }} />

            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button 
                className="btn btn-primary" 
                onClick={() => setShowLegalModal(false)}
                style={{ padding: "0.6rem 1.5rem", fontSize: "0.85rem" }}
              >
                J'ai compris
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
