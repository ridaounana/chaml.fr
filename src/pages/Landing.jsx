import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { getTranslation } from "../utils/i18n";
import { FranceFlag, MoroccoFlag } from "../components/Flag";

const LANDING_TEXT = {
  fr: {
    hero_title: "Réunissez votre famille, sans frontières",
    hero_desc: "Chaml.fr est le premier assistant collaboratif intelligent pour le regroupement familial franco-marocain. Suivez vos pièces, validez vos ressources et accélérez vos démarches administratives.",
    btn_start: "Commencer notre simulation gratuite",
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
    test1_author: "Anass & Salma (Réunis en 2024)",
    test2_quote: "Après 6 mois de silence de la préfecture, le générateur de recours nous a permis de débloquer la situation en envoyant la lettre type au Préfet. Indispensable !",
    test2_author: "Youssef & Leyla (Réunis en 2025)",
    footer_text: "Chaml.fr - Conçu par des ingénieurs marocains pour faciliter le rapprochement des familles. Outil d'aide indépendant de l'administration française.",
    cta_subtitle: "Inscrivez-vous dès aujourd'hui pour valider votre dossier et rassembler vos documents.",
    legal_disclaimer_text: "Avertissement légal : Chaml.fr est une plateforme privée d'aide et d'accompagnement indépendant. Elle n'est en aucun cas affiliée, associée ou approuvée par l'OFII (Office Français de l'Immigration et de l'Intégration), les consulats ou les autorités publiques. Les informations fournies le sont à titre d'assistance logistique et ne remplacent pas les conseils d'un avocat.",
    legal_link_text: "Mentions Légales & Politique de Confidentialité (RGPD)",
    copyright_text: "Tous droits réservés.",
    legal_modal_title: "⚖️ Mentions Légales & RGPD",
    legal_modal_last_update: "Dernière mise à jour : Juillet 2026",
    legal_sec1_title: "1. Éditeur de la Plateforme",
    legal_sec1_desc: "Le site Chaml.fr est un projet indépendant à but non commercial, développé par un particulier à titre personnel pour simplifier et optimiser les démarches logistiques complexes du regroupement familial.",
    legal_sec2_title: "2. Hébergement des données",
    legal_sec2_desc: "Toutes les données chiffrées de la plateforme, y compris les fichiers et documents justificatifs téléversés, sont stockées de manière hautement sécurisée sur des serveurs situés en France (Union Européenne).",
    legal_sec3_title: "3. Politique de Confidentialité & Chiffrement de bout en bout (E2EE)",
    legal_sec3_desc: "Conformément aux principes du RGPD et pour garantir une confidentialité absolue, Chaml.fr utilise une architecture Zero-Knowledge :",
    legal_sec3_li1: "Chiffrement Client AES-GCM : Chaque document téléversé est crypté directement dans votre navigateur avant son envoi au serveur grâce à une clé de chiffrement privée (un code secret) choisie par vous et que vous êtes le seul à connaître.",
    legal_sec3_li2: "Confidentialité absolue : Le serveur ne reçoit et ne stocke que les fichiers chiffrés. La clé de déchiffrement n'est jamais transmise ni stockée. Par conséquent, les administrateurs et l'hébergeur n'ont aucun moyen technique de visualiser vos documents.",
    legal_sec3_li3: "Données collectées : Seules les métadonnées de base (adresse e-mail, prénoms/noms, téléphone facultatif, surface et zone de logement) sont traitées en clair pour le fonctionnement de la check-list collaborative.",
    legal_sec3_li4: "Conservation & Droit à l'oubli : Toutes vos données et fichiers cryptés sont conservés tant que votre compte est actif. Vous pouvez supprimer définitivement votre compte et l'ensemble de vos documents à tout moment d'un simple clic depuis vos paramètres.",
    legal_sec3_li5: "Vos droits : Vous disposez d'un droit d'accès, de rectification et d'effacement de vos données personnelles. Pour l'exercer, contactez support@chaml.fr.",
    legal_sec4_title: "4. Avertissement de service",
    legal_sec4_desc: "Chaml.fr est un outil d'accompagnement logistique privé. Les simulations et conseils fournis par l'application sont indicatifs et basés sur les règles de l'OFII. Ils ne constituent pas un avis juridique contraignant.",
    legal_modal_btn_close: "J'ai compris",
  },
  ar: {
    hero_title: "لم شمل عائلتكم، بدون حدود",
    hero_desc: "شمل.fr هو أول مساعد تعاوني ذكي للم شمل العائلات المغربية في فرنسا. تتبعوا وثائقكم، تأكدوا من مواردكم المالية، وسرّعوا إجراءاتكم الإدارية.",
    btn_start: "بدء محاكاتنا المجانية",
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
    test1_author: "أنس وسلمى (اجتمعا في 2024)",
    test2_quote: "بعد 6 أشهر من الصمت من العمالة، مكننا منشئ الطعون من حل الوضع عن طريق إرسال الرسالة النموذجية إلى المحافظ. أداة لا غنى عنها!",
    test2_author: "يوسف وليلى (اجتمعا في 2025)",
    footer_text: "شمل.fr - صمم من طرف مهندسين مغاربة لتسهيل لم شمل العائلات. أداة مساعدة مستقلة عن الإدارة الفرنسية.",
    cta_subtitle: "سجلوا اليوم للمصادقة على ملفكم وجمع وثائقكم العائلية.",
    legal_disclaimer_text: "تنبيه قانوني: شمل.fr منصة خاصة مستقلة للمساعدة والمرافقة. وهي ليست بأي حال من الأحوال تابعة أو مرتبطة أو معتمدة من قبل المكتب الفرنسي للهجرة والاندماج (OFII)، أو القنصليات أو السلطات العامة. المعلومات المقدمة هي لغرض المساعدة اللوجستية ولا تعوض استشارة محامٍ.",
    legal_link_text: "الإشعارات القانونية وسياسة الخصوصية (RGPD)",
    copyright_text: "جميع الحقوق محفوظة.",
    legal_modal_title: "⚖️ الإشعارات القانونية وحماية البيانات (RGPD)",
    legal_modal_last_update: "آخر تحديث: يوليوز 2026",
    legal_sec1_title: "1. ناشر المنصة",
    legal_sec1_desc: "موقع شمل.fr هو مشروع مستقل غير تجاري، تم تطويره من طرف فرد بصفة شخصية لتبسيط وتحسين الإجراءات اللوجستية المعقدة للم شمل العائلة.",
    legal_sec2_title: "2. استضافة البيانات",
    legal_sec2_desc: "جميع البيانات المشفرة الخاصة بالمنصة، بما في ذلك الملفات والمستندات الثبوتية التي يتم تحميلها، تُخزن بشكل آمن للغاية على خوادم تقع في فرنسا (الاتحاد الأوروبي).",
    legal_sec3_title: "3. سياسة الخصوصية والتشفير التام بين الطرفين (E2EE)",
    legal_sec3_desc: "تماشيًا مع مبادئ القانون العام لحماية البيانات (RGPD) ولضمان السرية المطلقة، يستخدم شمل.fr بنية المعرفة الصفرية (Zero-Knowledge):",
    legal_sec3_li1: "تشفير العميل AES-GCM: يتم تشفير كل مستند يتم تحميله مباشرة في متصفحك قبل إرساله إلى الخادم باستخدام مفتاح تشفير خاص (رمز سري) تختاره أنت وتعرفه وحدك.",
    legal_sec3_li2: "سرية مطلقة: الخادم لا يتلقى ولا يخزن سوى الملفات المشفرة. لا يتم إرسال مفتاح فك التشفير أو تخزينه مطلقًا. وبالتالي، ليس لدى المشرفين والمستضيف أي وسيلة تقنية لعرض وثائقكم.",
    legal_sec3_li3: "البيانات التي يتم جمعها: يتم فقط معالجة البيانات الأساسية (البريد الإلكتروني، الأسماء الأولى والأخيرة، الهاتف الاختياري، مساحة ومنطقة السكن) بشكل واضح لتشغيل قائمة المستندات التعاونية.",
    legal_sec3_li4: "الحفظ والحق في النسيان: يتم الاحتفاظ بجميع بياناتكم وملفاتكم المشفرة طالما أن حسابكم نشط. يمكنك حذف حسابك وجميع وثائقك نهائيًا in أي وقت بنقرة واحدة من إعدادات حسابك.",
    legal_sec3_li5: "حقوقكم: لديكم الحق في الوصول إلى بياناتكم الشخصية وتصحيحها ومحوها. لممارسة هذا الحق، راسلونا على support@chaml.fr.",
    legal_sec4_title: "4. تنبيه الخدمة",
    legal_sec4_desc: "شمل.fr أداة مرافقة لوجستية خاصة. إن عمليات المحاكاة والنصائح المقدمة من التطبيق هي إرشادية وتستند إلى قواعد مكتب الهجرة (OFII)، ولا تشكل رأيًا قانونيًا ملزمًا.",
    legal_modal_btn_close: "لقد فهمت",
  },
  en: {
    hero_title: "Reunite your family, without borders",
    hero_desc: "Chaml.fr is the first intelligent collaborative assistant for French-Moroccan family reunification. Track your documents, validate your income limits, and speed up your administration applications.",
    btn_start: "Start our free simulation",
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
    test1_author: "Anass & Salma (Reunited in 2024)",
    test2_quote: "After 6 months of silence from the prefecture, the appeal generator unlocked the situation by sending the letter to the Prefect. A lifesaver!",
    test2_author: "Youssef & Leyla (Reunited in 2025)",
    footer_text: "Chaml.fr - Created by Moroccan engineers to simplify family reunification. Independent of the French government.",
    cta_subtitle: "Sign up today to validate your application files and gather your family documents.",
    legal_disclaimer_text: "Legal disclaimer: Chaml.fr is a private, independent help and support platform. It is in no way affiliated with, associated with, or endorsed by the OFII (Office Français de l'Immigration et de l'Intégration), consulates, or public authorities. The information provided is for logistical assistance purposes and does not replace the advice of a lawyer.",
    legal_link_text: "Legal Mentions & Privacy Policy (GDPR)",
    copyright_text: "All rights reserved.",
    legal_modal_title: "⚖️ Legal Mentions & GDPR",
    legal_modal_last_update: "Last updated: July 2026",
    legal_sec1_title: "1. Platform Publisher",
    legal_sec1_desc: "The Chaml.fr website is an independent non-commercial project, developed by an individual on a personal basis to simplify and optimize the complex logistical steps of family reunification.",
    legal_sec2_title: "2. Data Hosting",
    legal_sec2_desc: "All encrypted data of the platform, including uploaded files and supporting documents, are securely stored on servers located in France (European Union).",
    legal_sec3_title: "3. Privacy Policy & End-to-End Encryption (E2EE)",
    legal_sec3_desc: "In compliance with the GDPR principles and to guarantee absolute confidentiality, Chaml.fr uses a Zero-Knowledge architecture:",
    legal_sec3_li1: "Client AES-GCM Encryption: Each uploaded document is encrypted directly in your browser before being sent to the server using a private encryption key (a secret code) chosen by you that only you know.",
    legal_sec3_li2: "Absolute confidentiality: The server only receives and stores encrypted files. The decryption key is never transmitted or stored. Consequently, administrators and the host have no technical means to view your documents.",
    legal_sec3_li3: "Collected data: Only basic metadata (email address, first/last names, optional phone, flat surface and zone) are processed in plain text to run the collaborative checklist.",
    legal_sec3_li4: "Retention & Right to be forgotten: All your data and encrypted files are retained as long as your account is active. You can permanently delete your account and all your documents at any time with a simple click in your account settings.",
    legal_sec3_li5: "Your rights: You have the right to access, rectify, and erase your personal data. To exercise this right, please contact support@chaml.fr.",
    legal_sec4_title: "4. Service warning",
    legal_sec4_desc: "Chaml.fr is a private logistical support tool. The simulations and advice provided by the application are indicative and based on OFII rules. They do not constitute binding legal advice.",
    legal_modal_btn_close: "I understand",
  }
};

export default function Landing({ lang, onNavigate }) {
  const text = LANDING_TEXT[lang] || LANDING_TEXT.fr;
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [activeFaq, setActiveFaq] = useState(null);

  useEffect(() => {
    if (showLegalModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLegalModal]);

  // Previews States
  const [previewTab, setPreviewTab] = useState("simulator"); // "simulator" | "calc12" | "checklist"
  const [simFamilySize, setSimFamilySize] = useState(2);
  const [simIncomeMode, setSimIncomeMode] = useState("net"); // "net" | "brut"
  const [simIncome, setSimIncome] = useState(1800);
  const [simSurface, setSimSurface] = useState(25);
  const [simZone, setSimZone] = useState("A");
  const [isAahExempt, setIsAahExempt] = useState(false);

  // 12-Month Detailed Calculator State
  const [calc12Mode, setCalc12Mode] = useState("tax"); // "tax" | "payslip"
  const [calc12TaxAnnual, setCalc12TaxAnnual] = useState(18500);
  const [calc12PayslipDec, setCalc12PayslipDec] = useState(19200);

  const [chkSponsorStatus, setChkSponsorStatus] = useState("employee");
  const [chkFamilyComposition, setChkFamilyComposition] = useState("spouse_only");

  const previewText = {
    fr: {
      section_title: "⚡ Testez votre éligibilité en direct",
      section_subtitle: "Simulez vos critères financiers et de logement sans créer de compte.",
      tab_sim: "📊 Simulateur Express",
      tab_calc12: "🧮 Calculateur 12 Mois",
      tab_chk: "📝 Check-list Express",
      mode_net: "Net mensuel",
      mode_brut: "Brut mensuel",
      income_net_label: "Revenus nets mensuels moyens :",
      income_brut_label: "Revenus bruts mensuels moyens :",
      aah_checkbox: "Titulaire de l'AAH ou pension d'invalidité (Dispense Art. L. 531-2 CESEDA)",
      aah_badge: "✓ Exonération légale accordée (Art. L. 531-2)",
      fam_size: "Taille de la famille (rejoignante) :",
      fam_desc: "Vous + conjoint + enfants",
      people: "personnes",
      income: "Revenus mensuels moyens :",
      surface: "Surface habitable du logement :",
      zone: "Zone géographique du logement :",
      zone_a: "Zone A (Paris, grande couronne, Côte d'Azur...)",
      zone_b: "Zone B (Villes de +150 000 hab., grande couronne...)",
      zone_c: "Zone C (Reste du territoire français)",
      req_income: "Revenu exigé (SMIC pondéré) :",
      req_surface: "Surface minimale requise :",
      income_ok: "Revenus conformes",
      income_nok: "Revenus insuffisants",
      surface_ok: "Surface conforme",
      surface_nok: "Surface insuffisante",
      compliance_score: "Score de conformité du dossier :",
      cta_save: "🚀 Sauvegarder ce dossier & m'inscrire",
      chk_sponsor: "Activité du demandeur (en France) :",
      chk_family: "Composition de la famille rejoignante :",
      chk_emp: "Salarié (CDI, CDD)",
      chk_ind: "Indépendant (Libéral, Kbis)",
      chk_ret: "Autre / Retraité / Inactif",
      chk_spouse: "Conjoint(e) uniquement",
      chk_kids: "Conjoint(e) + Enfant(s)",
      chk_title: "Votre liste de pièces justificatives personnalisée :",
      chk_disclaimer: "Cette liste est fournie à titre indicatif selon les critères officiels de l'OFII. Créez un compte pour téléverser et chiffrer vos fichiers.",
      calc12_title: "🧮 Calculateur de moyenne sur 12 Mois (OFII)",
      calc12_desc: "Simulez la moyenne exacte retenue par l'administration (Avis d'imposition ou bulletins de paie).",
      calc12_mode_tax: "📄 Avis d'Imposition (Net Imposable)",
      calc12_mode_payslip: "💼 Bulletin de paie (Cumul Décembre)",
      calc12_tax_label: "Revenu Net Imposable Annuel (€) :",
      calc12_payslip_label: "Cumul Net Imposable bulletin de Décembre (€) :",
      calc12_monthly_avg: "Moyenne mensuelle calculée :",
      calc12_legal_note: "ℹ️ L'OFII retient le montant le plus favorable entre le Net Imposable de vos 12 bulletins de paie et votre Avis d'Imposition."
    },
    ar: {
      section_title: "⚡ اختبروا مطابقة ملفكم مباشرة",
      section_subtitle: "قوموا بمحاكاة شروط الدخل والسكن مجاناً وبدون تسجيل.",
      tab_sim: "📊 محاكي إكسبريس",
      tab_calc12: "🧮 حاسبة 12 شهراً",
      tab_chk: "📝 قائمة الوثائق إكسبريس",
      mode_net: "الصافي الشهري",
      mode_brut: "الإجمالي الشهري (Brut)",
      income_net_label: "متوسط الدخل الشهري الصافي:",
      income_brut_label: "متوسط الدخل الشهري الإجمالي (Brut):",
      aah_checkbox: "مستفيد من إعانة ذوي الاحتياجات (AAH) أو معاش العجز (إعفاء قانوني)",
      aah_badge: "✓ إعفاء قانوني تام (المادة L. 531-2)",
      fam_size: "عدد أفراد الأسرة (الملتحقين):",
      fam_desc: "أنت + الزوج + الأطفال",
      people: "أفراد",
      income: "متوسط الدخل الشهري:",
      surface: "المساحة الإجمالية للسكن:",
      zone: "المنطقة الجغرافية للسكن:",
      zone_a: "المنطقة أ (باريس وضواحيها، الكوت دازور...)",
      zone_b: "المنطقة ب (المدن الكبرى +150 ألف نسمة...)",
      zone_c: "المنطقة ج (باقي الأراضي الفرنسية)",
      req_income: "الدخل المطلوب (الحد الأدنى):",
      req_surface: "المساحة الدنيا المطلوبة:",
      income_ok: "الدخل مطابق للشروط",
      income_nok: "الدخل غير كافٍ",
      surface_ok: "المساحة مطابقة للشروط",
      surface_nok: "المساحة غير كافية",
      compliance_score: "نسبة مطابقة ملفكم:",
      cta_save: "🚀 حفظ هذا الملف وإنشاء حسابي",
      chk_sponsor: "نشاط مقدم الطلب (في فرنسا):",
      chk_family: "تركيبة الأسرة الملتحقة:",
      chk_emp: "موظف (عقد عمل)",
      chk_ind: "عمل حر (شركة، تاجر)",
      chk_ret: "أخرى / متقاعد / غير نشط",
      chk_spouse: "الزوج/الزوجة فقط",
      chk_kids: "الزوج/الزوجة + الأطفال",
      chk_title: "قائمة المستندات والوثائق الخاصة بكم:",
      chk_disclaimer: "هذه القائمة استرشادية بناءً على معايير مكتب الهجرة (OFII). أنشئوا حساباً لتحميل وتشفير ملفاتكم.",
      calc12_title: "🧮 حاسبة متوسط الدخل على مدى 12 شهراً",
      calc12_desc: "احسبوا متوسط الدخل الدقيق وفقاً لمعايير مكتب الهجرة (الإقرار الضريبي أو كشوف الراتب).",
      calc12_mode_tax: "📄 الإشعار الضريبي (الصافي الخاضع للضريبة)",
      calc12_mode_payslip: "💼 كشوف الراتب (مجموع الصافي في ديسمبر)",
      calc12_tax_label: "الدخل الصافي الخاضع للضريبة سنوياً (€):",
      calc12_payslip_label: "مجموع الصافي الخاضع للضريبة في كشف ديسمبر (€):",
      calc12_monthly_avg: "متوسط الدخل الشهري المحسوب:",
      calc12_legal_note: "ℹ️ يعتمد مكتب الهجرة (OFII) المبلغ الأفضل بين متوسط كشوف الراتب والإقرار الضريبي."
    },
    en: {
      section_title: "⚡ Test Your Eligibility Instantly",
      section_subtitle: "Simulate income and housing requirements without creating an account.",
      tab_sim: "📊 Express Simulator",
      tab_calc12: "🧮 12-Month Calculator",
      tab_chk: "📝 Express Checklist",
      mode_net: "Net Monthly",
      mode_brut: "Gross Monthly (Brut)",
      income_net_label: "Average net monthly income:",
      income_brut_label: "Average gross monthly income (Brut):",
      aah_checkbox: "Disability Allowance (AAH) or Invalidity Pension (Art. L. 531-2 Exemption)",
      aah_badge: "✓ Full Legal Exemption (Art. L. 531-2)",
      fam_size: "Family size (joining):",
      fam_desc: "You + spouse + children",
      people: "people",
      income: "Average monthly income:",
      surface: "Habitable surface area:",
      zone: "Geographical zone of housing:",
      zone_a: "Zone A (Paris, major cities, Côte d'Azur...)",
      zone_b: "Zone B (Cities with +150k population...)",
      zone_c: "Zone C (Rest of France)",
      req_income: "Required income (SMIC ratio):",
      req_surface: "Minimum surface required:",
      income_ok: "Income compliant",
      income_nok: "Income insufficient",
      surface_ok: "Surface compliant",
      surface_nok: "Surface insufficient",
      compliance_score: "Application compliance score:",
      cta_save: "🚀 Save this file & register",
      chk_sponsor: "Sponsor's activity (in France):",
      chk_family: "Joining family composition:",
      chk_emp: "Employee (Contracted)",
      chk_ind: "Self-employed (Business, Kbis)",
      chk_ret: "Other / Retired / Unemployed",
      chk_spouse: "Spouse only",
      chk_kids: "Spouse + Child(ren)",
      chk_title: "Your personalized document checklist:",
      chk_disclaimer: "This list is indicative based on official OFII criteria. Create an account to upload and encrypt your files.",
      calc12_title: "🧮 12-Month Detailed Eligibility Calculator",
      calc12_desc: "Calculate your exact monthly average based on OFII guidelines (Tax return or pay slips).",
      calc12_mode_tax: "📄 Tax Assessment (Annual Taxable Net)",
      calc12_mode_payslip: "💼 Pay Slips (December Cumulative Taxable Net)",
      calc12_tax_label: "Annual Taxable Net Income (€):",
      calc12_payslip_label: "December Pay Slip Cumulative Taxable Net (€):",
      calc12_monthly_avg: "Calculated Monthly Average:",
      calc12_legal_note: "ℹ️ OFII evaluates the average Taxable Net Income over the 12 months preceding your application."
    }
  };

  // Calculations for Previews
  const previewTextLocale = previewText[lang] || previewText.fr;

  // Base SMIC (2026): Net = 1426€ / Brut = 1823€
  const baseSmic = simIncomeMode === "net" ? 1426 : 1823;

  let salMult = 1.0;
  if (simFamilySize >= 4 && simFamilySize <= 5) salMult = 1.1;
  else if (simFamilySize >= 6) salMult = 1.2;

  const reqInc = Math.round(baseSmic * salMult);

  let baseSurf = 28;
  if (simZone === "A") baseSurf = 22;
  else if (simZone === "B") baseSurf = 24;

  let reqSurf = baseSurf;
  const extraPeopleCount = simFamilySize - 2;
  if (extraPeopleCount > 0) {
    if (simFamilySize <= 8) {
      reqSurf += extraPeopleCount * 10;
    } else {
      reqSurf += 60 + (simFamilySize - 8) * 5;
    }
  }

  // Option B: 12-Month Calculator Average Monthly Income
  const calc12MonthlyInc = calc12Mode === "tax"
    ? Math.round((Number(calc12TaxAnnual) || 0) / 12)
    : Math.round((Number(calc12PayslipDec) || 0) / 12);

  // Effective income depending on current preview tab
  const activeIncomeVal = previewTab === "calc12" ? calc12MonthlyInc : simIncome;

  // Option C: AAH / Invalidité Exemption override
  const isIncCompliant = isAahExempt || activeIncomeVal >= reqInc;
  const isSurfCompliant = isAahExempt || simSurface >= reqSurf;

  const incPercent = isAahExempt ? 100 : Math.min(100, Math.round((activeIncomeVal / reqInc) * 100));
  const surfPercent = isAahExempt ? 100 : Math.min(100, Math.round((simSurface / reqSurf) * 100));
  const compliancePercent = isAahExempt ? 100 : Math.round((incPercent + surfPercent) / 2);

  const handleSaveAndRegister = () => {
    localStorage.setItem("prefill_surface", simSurface.toString());
    localStorage.setItem("prefill_zone", simZone);
    onNavigate("register");
  };

  const faqItems = {
    fr: [
      {
        q: "Qu'est-ce que Chaml.fr et comment m'aide-t-il ?",
        a: "Chaml.fr est un outil d'accompagnement indépendant et collaboratif conçu pour simplifier les démarches de regroupement familial. Il permet de gérer une check-list commune entre les conjoints en France et au Maroc, de simuler la conformité des ressources et du logement, et de générer des recours administratifs en cas de retard de traitement."
      },
      {
        q: "Comment fonctionne le chiffrement de bout en bout (E2EE) de mes documents ?",
        a: "Pour garantir une confidentialité absolue, vos documents justificatifs (fiches de paie, pièces d'identité) sont chiffrés directement dans votre navigateur en AES-GCM-256 à l'aide de votre code PIN secret avant d'être envoyés sur le serveur. Nous n'avons jamais accès à votre code PIN. Seuls vous et votre conjoint pouvez déchiffrer et visualiser vos documents."
      },
      {
        q: "Les simulateurs de salaire et de logement sont-ils fiables ?",
        a: "Oui, nos simulateurs se basent sur les barèmes et critères officiels appliqués par l'OFII et le CESEDA (revenus nets exigés en fonction du SMIC et de la taille de la famille, et surface minimale requise selon la zone géographique A, B ou C de votre logement)."
      },
      {
        q: "Que se passe-t-il après la validation de mon dossier ?",
        a: "Dans le respect de notre politique RGPD et de votre vie privée, toutes vos pièces jointes chiffrées sont définitivement et irrémédiablement purgées de nos serveurs 30 jours après la validation de votre dossier. De plus, vous recevez un rappel par e-mail automatique 5 jours avant la suppression."
      }
    ],
    ar: [
      {
        q: "ما هو شمل.fr وكيف يساعدني؟",
        a: "شمل.fr هي منصة مساعدة مستقلة وتفاعلية مصممة لتبسيط إجراءات لم الشمل العائلي. تتيح لكم إدارة قائمة وثائق مشتركة بين الزوجين في فرنسا والمغرب، ومحاكاة مطابقة الموارد المالية والسكن، وإنشاء خطابات طعون إدارية في حالة تأخر المعالجة."
      },
      {
        q: "كيف يعمل التشفير التام (E2EE) لمستنداتي؟",
        a: "لضمان السرية المطلقة، يتم تشفير مستنداتكم الحساسة (بيانات الراتب، الهوية) مباشرة في متصفحكم باستخدام خوارزمية AES-GCM-256 وبواسطة رمز PIN السري الخاص بكم قبل إرسالها إلى الخادم. ليس لدينا وصول إلى رمزكم السري، وبالتالي لا يمكن لأي طرف ثالث قراءة ملفاتكم."
      },
      {
        q: "هل محاكيات الراتب والسكن دقيقة وموثوقة؟",
        a: "نعم، تعتمد محاكياتنا على الجداول والمعايير الرسمية المعتمدة من طرف مكتب الهجرة والإدماج (OFII) وقوانين الهجرة الفرنسية (صافي الدخل المطلوب حسب الحد الأدنى للأجور وحجم الأسرة، والمساحة الدنيا المطلوبة حسب المنطقة الجغرافية للسكن)."
      },
      {
        q: "ماذا يحدث بعد قبول ملفي؟",
        a: "التزاماً بحماية بياناتكم وخصوصيتكم، يتم حذف جميع وثائقكم المشفرة بشكل نهائي ولا رجعة فيه من خوادمنا بعد 30 يومًا من قبول ملفكم الإداري، مع إرسال تنبيه تذكيري تلقائي عبر البريد الإلكتروني قبل الحذف بـ 5 أيام."
      }
    ],
    en: [
      {
        q: "What is Chaml.fr and how does it help me?",
        a: "Chaml.fr is an independent collaborative tracker designed to simplify family reunification procedures. It helps manage a shared document checklist between spouses in France and Morocco, verify income and housing eligibility criteria, and generate pre-filled administrative appeal letters."
      },
      {
        q: "How does the End-to-End Encryption (E2EE) secure my documents?",
        a: "To ensure absolute privacy, your sensitive files (pay slips, ID cards) are encrypted directly in your browser using AES-GCM-256 with your secret PIN code before being uploaded. We never have access to your PIN. Only you and your spouse can decrypt and read your documents."
      },
      {
        q: "Are the income and housing surface simulators accurate?",
        a: "Yes, our simulators are based on the official guidelines and regulations applied by the OFII and CESEDA (net income requirements based on SMIC and household size, and housing surface area rules depending on zones A, B, or C)."
      },
      {
        q: "What happens after my application is approved?",
        a: "In compliance with our GDPR privacy policy, all your encrypted files are permanently and irretrievably deleted from our servers 30 days after approval. An automatic email alert is sent to you 5 days before the final purge."
      }
    ]
  };

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
            fontSize: "clamp(0.95rem, 2vw, 1.15rem)",
            lineHeight: "1.6",
            color: "var(--text-muted)",
            maxWidth: "520px"
          }}>
            {text.hero_desc}
          </p>
          <div className="form-action-group" style={{ marginTop: "1rem" }}>
            <button
              className="btn btn-primary"
              onClick={() => onNavigate("register")}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                fontWeight: "bold",
                justifyContent: "center",
                boxShadow: "0 10px 20px -5px rgba(var(--primary-rgb), 0.3)"
              }}
            >
              🚀 {text.btn_start}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => onNavigate("login")}
              style={{
                padding: "0.75rem 1.25rem",
                fontSize: "0.95rem",
                fontWeight: "bold",
                justifyContent: "center"
              }}
            >
              🔑 {text.btn_login}
            </button>
          </div>
        </div>

        {/* Localized HTML/CSS Dashboard Mockup Card (Replaces static images) */}
        <div style={{
          position: "relative",
          borderRadius: "1rem",
          overflow: "hidden",
          border: "1px solid var(--border-card)",
          boxShadow: "0 20px 40px -15px rgba(0, 0, 0, 0.25)",
          background: "#0f172a",
          padding: "clamp(1rem, 3vw, 1.5rem)",
          color: "#f8fafc",
          display: "flex",
          flexDirection: "column",
          gap: "1rem",
          fontFamily: "var(--font-main)"
        }}>
          {/* Mockup Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,0.08)", paddingBottom: "0.75rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "1.2rem" }}>📁</span>
              <div>
                <strong style={{ fontSize: "0.95rem", display: "block" }}>
                  {lang === "ar" ? "ملف لم الشمل العائلي" : lang === "en" ? "Family Reunification File" : "Dossier de Regroupement Familial"}
                </strong>
                <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                  {lang === "ar" ? "مساحة مشتركة لجمع المستندات" : lang === "en" ? "Shared space for supporting documents" : "Espace partagé pour rassembler vos pièces"}
                </span>
              </div>
            </div>
            <span style={{
              fontSize: "0.75rem",
              padding: "0.25rem 0.5rem",
              borderRadius: "0.25rem",
              background: "rgba(16, 185, 129, 0.15)",
              color: "#10b981",
              fontWeight: "bold"
            }}>
              ● Live Sync
            </span>
          </div>

          {/* E2EE Info Alert */}
          <div style={{
            background: "rgba(13, 148, 136, 0.08)",
            border: "1px solid rgba(13, 148, 136, 0.2)",
            borderRadius: "0.5rem",
            padding: "0.75rem 1rem",
            display: "flex",
            alignItems: "center",
            gap: "0.75rem"
          }}>
            <span style={{ fontSize: "1.2rem" }}>🔒</span>
            <div>
              <strong style={{ fontSize: "0.85rem", color: "#0d9488", display: "block" }}>
                {lang === "ar" ? "التشفير التام (E2EE) مفعل" : lang === "en" ? "End-to-End Encryption Active" : "Chiffrement de bout en bout activé"}
              </strong>
              <p style={{ fontSize: "0.7rem", color: "#94a3b8", margin: 0 }}>
                {lang === "ar" ? "مستنداتكم مشفرة في المتصفح قبل الإرسال." : lang === "en" ? "Your documents are encrypted locally before uploading." : "Vos documents sont cryptés localement avant téléversement."}
              </p>
            </div>
          </div>

          {/* Document list */}
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            <span style={{ fontSize: "0.75rem", fontWeight: "bold", color: "#64748b", textTransform: "uppercase" }}>
              {lang === "ar" ? "الوثائق المطلوبة (فرنسا)" : lang === "en" ? "Required Documents (France)" : "Partie Demandeur (En France)"}
            </span>

            {/* Item 1 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              padding: "0.6rem 0.85rem"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                {lang === "ar" ? "نسخة من بطاقة الإقامة" : lang === "en" ? "Valid Residence Permit" : "Titre de séjour en cours de validité"}
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "0.25rem", fontWeight: "bold" }}>
                  {lang === "ar" ? "في الانتظار" : lang === "en" ? "PENDING" : "EN ATTENTE"}
                </span>
                <span style={{ fontSize: "0.7rem", background: "#0284c7", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", color: "white" }}>
                  {lang === "ar" ? "تحميل" : lang === "en" ? "Upload" : "Télécharger"}
                </span>
              </div>
            </div>

            {/* Item 2 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              padding: "0.6rem 0.85rem"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                {lang === "ar" ? "استمارة CERFA الرسمية" : lang === "en" ? "Official CERFA Form" : "Formulaire officiel CERFA n°11436"}
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "0.25rem", fontWeight: "bold" }}>
                  {lang === "ar" ? "في الانتظار" : lang === "en" ? "PENDING" : "EN ATTENTE"}
                </span>
                <span style={{ fontSize: "0.7rem", background: "#0284c7", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", color: "white" }}>
                  {lang === "ar" ? "تحميل" : lang === "en" ? "Upload" : "Télécharger"}
                </span>
              </div>
            </div>

            {/* Item 3 */}
            <div style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(255, 255, 255, 0.03)",
              border: "1px solid rgba(255, 255, 255, 0.05)",
              borderRadius: "0.5rem",
              padding: "0.6rem 0.85rem"
            }}>
              <span style={{ fontSize: "0.8rem", color: "#cbd5e1" }}>
                {lang === "ar" ? "12 كشف راتب الأخير" : lang === "en" ? "Last 12 Pay Slips" : "12 derniers bulletins de salaire"}
              </span>
              <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                <span style={{ fontSize: "0.7rem", color: "#f59e0b", background: "rgba(245, 158, 11, 0.15)", padding: "0.2rem 0.5rem", borderRadius: "0.25rem", fontWeight: "bold" }}>
                  {lang === "ar" ? "في الانتظار" : lang === "en" ? "PENDING" : "EN ATTENTE"}
                </span>
                <span style={{ fontSize: "0.7rem", background: "#0284c7", padding: "0.25rem 0.5rem", borderRadius: "0.25rem", color: "white" }}>
                  {lang === "ar" ? "تحميل" : lang === "en" ? "Upload" : "Télécharger"}
                </span>
              </div>
            </div>

          </div>
        </div>
      </header>

      {/* ⚡ Dynamic Onboarding Previews (Concept 1 & 2) */}
      <section style={{
        background: "rgba(255, 255, 255, 0.01)",
        border: "1px solid var(--border-card)",
        borderRadius: "1rem",
        padding: "clamp(1rem, 2.5vw, 1.75rem)",
        marginBottom: "2.5rem",
        position: "relative",
        boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.15)"
      }}>
        <div style={{ textAlign: "center", marginBottom: "0.75rem" }}>
          <h2 style={{ fontSize: "clamp(1.2rem, 3vw, 1.5rem)", fontWeight: "800", color: "var(--text-main)", display: "flex", alignItems: "center", justifyContent: "center", gap: "0.4rem", margin: 0 }}>
            {previewTextLocale.section_title}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.82rem", marginTop: "0.25rem", marginBottom: 0 }}>
            {previewTextLocale.section_subtitle}
          </p>
        </div>

        {/* Compact Segmented Control Toggle (3 Tabs) */}
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "1rem"
        }}>
          <div style={{
            display: "inline-flex",
            background: "rgba(148, 163, 184, 0.1)",
            border: "1px solid var(--border-card)",
            borderRadius: "2rem",
            padding: "0.2rem",
            flexWrap: "wrap",
            justifyContent: "center",
            gap: "0.2rem"
          }}>
            <button
              onClick={() => setPreviewTab("simulator")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "1.5rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                background: previewTab === "simulator" ? "var(--primary)" : "transparent",
                color: previewTab === "simulator" ? "white" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {previewTextLocale.tab_sim}
            </button>
            <button
              onClick={() => setPreviewTab("calc12")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "1.5rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                background: previewTab === "calc12" ? "var(--primary)" : "transparent",
                color: previewTab === "calc12" ? "white" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {previewTextLocale.tab_calc12}
            </button>
            <button
              onClick={() => setPreviewTab("checklist")}
              style={{
                padding: "0.35rem 0.85rem",
                borderRadius: "1.5rem",
                fontSize: "0.8rem",
                fontWeight: 700,
                border: "none",
                background: previewTab === "checklist" ? "var(--primary)" : "transparent",
                color: previewTab === "checklist" ? "white" : "var(--text-muted)",
                cursor: "pointer",
                transition: "all 0.2s ease"
              }}
            >
              {previewTextLocale.tab_chk}
            </button>
          </div>
        </div>

        {previewTab === "simulator" ? (
          /* Concept 1: Express Simulator (Net/Brut Toggle + AAH Checkbox) */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem"
          }}>
            
            {/* Left Inputs column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                  <label className="form-label" style={{ fontWeight: "bold", margin: 0, fontSize: "0.82rem", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                    {previewTextLocale.fam_size}
                    <span title={previewTextLocale.fam_desc} style={{ cursor: "help", fontSize: "0.75rem", opacity: 0.7 }}>ℹ️</span>
                  </label>
                  <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{simFamilySize} {previewTextLocale.people}</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="10" 
                  value={simFamilySize} 
                  onChange={e => setSimFamilySize(Number(e.target.value))} 
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", cursor: "pointer", margin: "0.2rem 0 0 0" }}
                />
              </div>

              {/* Option A: Net / Brut Switcher */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <label className="form-label" style={{ fontWeight: "bold", margin: 0, fontSize: "0.82rem" }}>
                    {simIncomeMode === "net" ? previewTextLocale.income_net_label : previewTextLocale.income_brut_label}
                  </label>
                  
                  {/* Mode Selector Toggle */}
                  <div style={{ display: "flex", gap: "0.15rem", background: "rgba(148, 163, 184, 0.12)", padding: "0.15rem", borderRadius: "0.4rem" }}>
                    <button 
                      type="button" 
                      onClick={() => { setSimIncomeMode("net"); if (simIncome > 3500) setSimIncome(1800); }} 
                      style={{ 
                        padding: "0.15rem 0.45rem", 
                        fontSize: "0.72rem", 
                        borderRadius: "0.3rem", 
                        border: "none", 
                        background: simIncomeMode === "net" ? "var(--primary)" : "transparent", 
                        color: simIncomeMode === "net" ? "white" : "var(--text-muted)",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {previewTextLocale.mode_net}
                    </button>
                    <button 
                      type="button" 
                      onClick={() => { setSimIncomeMode("brut"); if (simIncome < 1200) setSimIncome(2100); }} 
                      style={{ 
                        padding: "0.15rem 0.45rem", 
                        fontSize: "0.72rem", 
                        borderRadius: "0.3rem", 
                        border: "none", 
                        background: simIncomeMode === "brut" ? "var(--primary)" : "transparent", 
                        color: simIncomeMode === "brut" ? "white" : "var(--text-muted)",
                        fontWeight: 600,
                        cursor: "pointer"
                      }}
                    >
                      {previewTextLocale.mode_brut}
                    </button>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.2rem" }}>
                  <span style={{ color: "var(--primary)", fontWeight: "bold", fontSize: "0.88rem" }}>{simIncome} € / mois</span>
                  <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                    (Ref: {simIncomeMode === "net" ? "SMIC Net ~1426 €" : "SMIC Brut ~1823 €"})
                  </span>
                </div>

                <input 
                  type="range" 
                  min={simIncomeMode === "net" ? "1000" : "1200"} 
                  max={simIncomeMode === "net" ? "3500" : "4500"} 
                  step="25"
                  value={simIncome} 
                  onChange={e => setSimIncome(Number(e.target.value))} 
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", cursor: "pointer", margin: "0.2rem 0 0 0" }}
                />
              </div>

              {/* Surface & Zone */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                  <label className="form-label" style={{ fontWeight: "bold", margin: 0, fontSize: "0.82rem" }}>{previewTextLocale.surface}</label>
                  <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{simSurface} m²</span>
                </div>
                <input 
                  type="range" 
                  min="15" 
                  max="100" 
                  value={simSurface} 
                  onChange={e => setSimSurface(Number(e.target.value))} 
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", cursor: "pointer", margin: "0.2rem 0 0 0" }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: "bold", marginBottom: "0.25rem", fontSize: "0.82rem" }}>{previewTextLocale.zone}</label>
                <select 
                  className="select-dropdown" 
                  style={{ width: "100%", padding: "0.45rem 0.65rem", borderRadius: "0.4rem", fontSize: "0.82rem" }} 
                  value={simZone} 
                  onChange={e => setSimZone(e.target.value)}
                >
                  <option value="A">{previewTextLocale.zone_a}</option>
                  <option value="B">{previewTextLocale.zone_b}</option>
                  <option value="C">{previewTextLocale.zone_c}</option>
                </select>
              </div>

              {/* Option C: AAH Exemption Checkbox */}
              <div style={{ 
                background: "rgba(13, 148, 136, 0.08)", 
                border: "1px solid rgba(13, 148, 136, 0.25)", 
                borderRadius: "0.5rem", 
                padding: "0.45rem 0.65rem", 
                marginTop: "0.25rem" 
              }}>
                <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.78rem", color: "var(--text-main)", fontWeight: 600 }}>
                  <input 
                    type="checkbox" 
                    checked={isAahExempt} 
                    onChange={e => setIsAahExempt(e.target.checked)} 
                    style={{ accentColor: "var(--primary)", width: "16px", height: "16px", cursor: "pointer" }}
                  />
                  <span>♿ {previewTextLocale.aah_checkbox}</span>
                </label>
              </div>

            </div>

            {/* Right Outcomes column (Compact Diagnostic Card) */}
            <div style={{
              background: "rgba(var(--primary-rgb), 0.02)",
              border: "1px solid var(--border-card)",
              borderRadius: "0.75rem",
              padding: "0.85rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              justifyContent: "space-between"
            }}>
              
              <div>
                {/* Inline Diagnostic Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                  <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: 0, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                    📊 Diagnostic de conformité
                  </h3>
                  <span style={{
                    fontSize: "0.9rem",
                    fontWeight: "800",
                    color: compliancePercent >= 100 ? "#10b981" : compliancePercent >= 75 ? "#f59e0b" : "#ef4444"
                  }}>
                    {compliancePercent}%
                  </span>
                </div>

                {/* Thin Progress bar */}
                <div style={{ width: "100%", height: "5px", background: "rgba(148, 163, 184, 0.15)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.65rem" }}>
                  <div style={{
                    width: `${compliancePercent}%`,
                    height: "100%",
                    background: compliancePercent >= 100 ? "linear-gradient(90deg, #10b981 0%, #059669 100%)" : compliancePercent >= 75 ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)" : "linear-gradient(90deg, #ef4444 0%, #dc2626 100%)",
                    transition: "width 0.3s ease"
                  }}></div>
                </div>

                {/* Single-line Criteria result rows */}
                <div style={{ display: "flex", flexDirection: "column", gap: "0.45rem" }}>

                  {/* Income Row */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-app)",
                    padding: "0.4rem 0.65rem",
                    borderRadius: "0.4rem",
                    fontSize: "0.8rem",
                    borderLeft: isIncCompliant ? "3px solid #10b981" : "3px solid #ef4444"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>Revenus :</span>
                      <strong style={{ color: "var(--text-main)" }}>{simIncome} €/mois</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>(exigé : {reqInc} €)</span>
                    </div>
                    <span className={`badge ${isIncCompliant ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap" }}>
                      {isIncCompliant ? `✓ ${previewTextLocale.income_ok}` : `❌ ${previewTextLocale.income_nok}`}
                    </span>
                  </div>

                  {/* Surface Row */}
                  <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    background: "var(--bg-app)",
                    padding: "0.4rem 0.65rem",
                    borderRadius: "0.4rem",
                    fontSize: "0.8rem",
                    borderLeft: isSurfCompliant ? "3px solid #10b981" : "3px solid #ef4444"
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.35rem", flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 600 }}>Surface :</span>
                      <strong style={{ color: "var(--text-main)" }}>{simSurface} m²</strong>
                      <span style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>(requis : {reqSurf} m²)</span>
                    </div>
                    <span className={`badge ${isSurfCompliant ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.72rem", padding: "0.15rem 0.45rem", whiteSpace: "nowrap" }}>
                      {isSurfCompliant ? `✓ ${previewTextLocale.surface_ok}` : `❌ ${previewTextLocale.surface_nok}`}
                    </span>
                  </div>

                </div>
              </div>

              {/* Save CTA */}
              <button 
                onClick={handleSaveAndRegister}
                className="btn btn-primary"
                style={{ 
                  width: "100%", 
                  padding: "0.65rem 1rem", 
                  fontWeight: "bold", 
                  fontSize: "0.88rem", 
                  marginTop: "0.4rem",
                  justifyContent: "center" 
                }}
              >
                {previewTextLocale.cta_save}
              </button>

            </div>

          </div>
        ) : previewTab === "calc12" ? (
          /* Concept 1B: Option B - 12-Month Detailed Calculator */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem"
          }}>
            {/* Left Inputs Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              <div>
                <h3 style={{ fontSize: "0.95rem", fontWeight: "bold", margin: "0 0 0.25rem 0" }}>
                  {previewTextLocale.calc12_title}
                </h3>
                <p style={{ fontSize: "0.78rem", color: "var(--text-muted)", margin: "0 0 0.65rem 0" }}>
                  {previewTextLocale.calc12_desc}
                </p>
              </div>

              {/* Calculation Mode selector buttons */}
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={() => setCalc12Mode("tax")}
                  className={`btn ${calc12Mode === "tax" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, padding: "0.45rem 0.65rem", fontSize: "0.78rem", fontWeight: "bold" }}
                >
                  {previewTextLocale.calc12_mode_tax}
                </button>
                <button
                  type="button"
                  onClick={() => setCalc12Mode("payslip")}
                  className={`btn ${calc12Mode === "payslip" ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, padding: "0.45rem 0.65rem", fontSize: "0.78rem", fontWeight: "bold" }}
                >
                  {previewTextLocale.calc12_mode_payslip}
                </button>
              </div>

              {calc12Mode === "tax" ? (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "bold", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                    {previewTextLocale.calc12_tax_label}
                  </label>
                  <input
                    type="number"
                    value={calc12TaxAnnual}
                    onChange={e => setCalc12TaxAnnual(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.4rem", border: "1px solid var(--border-card)", background: "var(--bg-app)", color: "var(--text-main)", fontSize: "0.9rem" }}
                  />
                </div>
              ) : (
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontWeight: "bold", fontSize: "0.82rem", marginBottom: "0.25rem" }}>
                    {previewTextLocale.calc12_payslip_label}
                  </label>
                  <input
                    type="number"
                    value={calc12PayslipDec}
                    onChange={e => setCalc12PayslipDec(e.target.value)}
                    style={{ width: "100%", padding: "0.5rem 0.75rem", borderRadius: "0.4rem", border: "1px solid var(--border-card)", background: "var(--bg-app)", color: "var(--text-main)", fontSize: "0.9rem" }}
                  />
                </div>
              )}

              {/* Family Size */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.82rem" }}>
                  <label className="form-label" style={{ fontWeight: "bold", margin: 0, fontSize: "0.82rem" }}>{previewTextLocale.fam_size}</label>
                  <span style={{ color: "var(--primary)", fontWeight: "bold" }}>{simFamilySize} {previewTextLocale.people}</span>
                </div>
                <input 
                  type="range" 
                  min="2" 
                  max="10" 
                  value={simFamilySize} 
                  onChange={e => setSimFamilySize(Number(e.target.value))} 
                  style={{ width: "100%", accentColor: "var(--primary)", height: "4px", borderRadius: "2px", cursor: "pointer", margin: "0.2rem 0 0 0" }}
                />
              </div>

              <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", background: "rgba(255,255,255,0.03)", padding: "0.45rem 0.65rem", borderRadius: "0.4rem", margin: 0 }}>
                {previewTextLocale.calc12_legal_note}
              </p>
            </div>

            {/* Right Outcomes Column */}
            <div style={{
              background: "rgba(var(--primary-rgb), 0.02)",
              border: "1px solid var(--border-card)",
              borderRadius: "0.75rem",
              padding: "0.85rem 1rem",
              display: "flex",
              flexDirection: "column",
              gap: "0.75rem",
              justifyContent: "space-between"
            }}>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
                  <span style={{ fontSize: "0.82rem", fontWeight: "bold", color: "var(--text-muted)" }}>
                    {previewTextLocale.calc12_monthly_avg}
                  </span>
                  <strong style={{ fontSize: "1.1rem", color: "var(--primary)" }}>
                    {calc12MonthlyInc} € / mois
                  </strong>
                </div>

                {/* Score bar */}
                <div style={{ width: "100%", height: "5px", background: "rgba(148, 163, 184, 0.15)", borderRadius: "3px", overflow: "hidden", marginBottom: "0.75rem" }}>
                  <div style={{ 
                    width: `${incPercent}%`, 
                    height: "100%", 
                    background: incPercent >= 100 ? "#10b981" : "#ef4444",
                    transition: "width 0.3s ease"
                  }}></div>
                </div>

                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  background: "var(--bg-app)",
                  padding: "0.6rem 0.75rem",
                  borderRadius: "0.4rem",
                  fontSize: "0.82rem",
                  borderLeft: isIncCompliant ? "4px solid #10b981" : "4px solid #ef4444"
                }}>
                  <div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block" }}>{previewTextLocale.req_income}</span>
                    <strong style={{ fontSize: "0.95rem" }}>{reqInc} € / mois (SMIC)</strong>
                  </div>
                  <span className={`badge ${isIncCompliant ? "badge-approved" : "badge-rejected"}`} style={{ fontSize: "0.78rem" }}>
                    {isIncCompliant ? `✓ ${previewTextLocale.income_ok}` : `❌ ${previewTextLocale.income_nok}`}
                  </span>
                </div>
              </div>

              <button 
                onClick={handleSaveAndRegister}
                className="btn btn-primary"
                style={{ 
                  width: "100%", 
                  padding: "0.65rem 1rem", 
                  fontWeight: "bold", 
                  fontSize: "0.88rem", 
                  justifyContent: "center" 
                }}
              >
                {previewTextLocale.cta_save}
              </button>
            </div>
          </div>
        ) : (
          /* Concept 2: Express Checklist */
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: "1.25rem"
          }}>

            {/* Left Inputs Column */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: "bold", marginBottom: "0.25rem", fontSize: "0.82rem" }}>{previewTextLocale.chk_sponsor}</label>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <button
                    onClick={() => setChkSponsorStatus("employee")}
                    className={`btn ${chkSponsorStatus === "employee" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.45rem 0.65rem", textAlign: "left", fontSize: "0.82rem" }}
                  >
                    💼 {previewTextLocale.chk_emp}
                  </button>
                  <button
                    onClick={() => setChkSponsorStatus("independent")}
                    className={`btn ${chkSponsorStatus === "independent" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.45rem 0.65rem", textAlign: "left", fontSize: "0.82rem" }}
                  >
                    🎨 {previewTextLocale.chk_ind}
                  </button>
                  <button
                    onClick={() => setChkSponsorStatus("retired")}
                    className={`btn ${chkSponsorStatus === "retired" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.45rem 0.65rem", textAlign: "left", fontSize: "0.82rem" }}
                  >
                    👴 {previewTextLocale.chk_ret}
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontWeight: "bold", marginBottom: "0.25rem", fontSize: "0.82rem" }}>{previewTextLocale.chk_family}</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <button
                    onClick={() => setChkFamilyComposition("spouse_only")}
                    className={`btn ${chkFamilyComposition === "spouse_only" ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, padding: "0.45rem 0.65rem", fontSize: "0.82rem" }}
                  >
                    ❤️ {previewTextLocale.chk_spouse}
                  </button>
                  <button
                    onClick={() => setChkFamilyComposition("spouse_and_children")}
                    className={`btn ${chkFamilyComposition === "spouse_and_children" ? "btn-primary" : "btn-secondary"}`}
                    style={{ flex: 1, padding: "0.45rem 0.65rem", fontSize: "0.82rem" }}
                  >
                    👨‍👩‍👧‍👦 {previewTextLocale.chk_kids}
                  </button>
                </div>
              </div>

            </div>

            {/* Right Generated Checklist Column */}
            <div style={{
              background: "rgba(var(--primary-rgb), 0.02)",
              border: "1px solid var(--border-card)",
              borderRadius: "1rem",
              padding: "2rem",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              justifyContent: "space-between"
            }}>

              <div>
                <h3 style={{ fontSize: "1.1rem", fontWeight: "bold", borderBottom: "1px solid var(--border-card)", paddingBottom: "0.5rem", marginBottom: "1rem" }}>
                  📋 {previewTextLocale.chk_title}
                </h3>

                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>

                  {/* Sponsor activity docs */}
                  {chkSponsorStatus === "employee" && (
                    <>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> 12 derniers bulletins de paie (Sponsor)
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Contrat de travail (CDI / CDD long)
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Avis d'imposition sur le revenu
                      </li>
                    </>
                  )}

                  {chkSponsorStatus === "independent" && (
                    <>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Justificatifs d'activité (Kbis, Inscription URSSAF)
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Deux derniers bilans comptables certifiés
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Avis d'imposition sur le revenu
                      </li>
                    </>
                  )}

                  {chkSponsorStatus === "retired" && (
                    <>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Justificatifs de pension de retraite (12 derniers mois)
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Relevés bancaires attestant le versement
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Avis d'imposition sur le revenu
                      </li>
                    </>
                  )}

                  {/* Family composition docs */}
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    <span style={{ color: "#10b981" }}>✔</span> Acte de mariage traduit en français (Adoul)
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    <span style={{ color: "#10b981" }}>✔</span> Passeport du conjoint (rejoignant)
                  </li>

                  {chkFamilyComposition === "spouse_and_children" && (
                    <>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Acte de naissance traduit pour chaque enfant
                      </li>
                      <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                        <span style={{ color: "#10b981" }}>✔</span> Carnet de vaccination / Certificat médical
                      </li>
                    </>
                  )}

                  {/* Housing docs */}
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    <span style={{ color: "#10b981" }}>✔</span> Bail de location + Quittance de loyer récente
                  </li>
                  <li style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "var(--text-main)" }}>
                    <span style={{ color: "#10b981" }}>✔</span> Facture d'électricité ou gaz (EDF / Engie)
                  </li>

                </ul>
              </div>

              {/* Disclaimer & CTA */}
              <div>
                <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", lineHeight: "1.4", margin: "0 0 1rem 0", marginTop: "1rem" }}>
                  {previewTextLocale.chk_disclaimer}
                </p>
                <button
                  onClick={() => onNavigate("register")}
                  className="btn btn-primary"
                  style={{ width: "100%", padding: "0.9rem", fontWeight: "bold", fontSize: "0.95rem" }}
                >
                  🚀 {text.btn_start}
                </button>
              </div>

            </div>

          </div>
        )}
      </section>

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

      {/* 🙋 FAQ Accordion (Replaces testimonials) */}
      <section style={{
        background: "rgba(var(--primary-rgb), 0.02)",
        border: "1px solid var(--border-card)",
        borderRadius: "1.25rem",
        padding: "3rem 2rem",
        marginBottom: "5rem"
      }}>
        <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
          <h2 style={{ fontSize: "1.8rem", fontWeight: "800", color: "var(--text-main)" }}>
            {lang === "ar" ? "الأسئلة الشائعة (FAQ)" : lang === "en" ? "Frequently Asked Questions (FAQ)" : "Questions Fréquentes (FAQ)"}
          </h2>
          <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginTop: "0.5rem" }}>
            {lang === "ar" ? "كل ما تريدون معرفته عن كيفية عمل شمل لحماية وإنجاح ملفكم." : lang === "en" ? "Everything you need to know about Chaml security and compliance." : "Tout savoir sur le fonctionnement, la sécurité et la conformité de votre dossier."}
          </p>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", maxWidth: "800px", margin: "0 auto" }}>
          {(faqItems[lang] || faqItems.fr).map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="glass-card"
                style={{
                  padding: "1rem 1.5rem",
                  background: "rgba(255, 255, 255, 0.01)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "0.75rem",
                  cursor: "pointer",
                  transition: "all 0.2s ease"
                }}
                onClick={() => setActiveFaq(isOpen ? null : idx)}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem" }}>
                  <strong style={{ fontSize: "0.92rem", color: isOpen ? "var(--primary)" : "var(--text-main)" }}>
                    {item.q}
                  </strong>
                  <span style={{ fontSize: "1.1rem", color: "var(--text-muted)", transition: "transform 0.2s", transform: isOpen ? "rotate(90deg)" : "none" }}>
                    ➔
                  </span>
                </div>
                {isOpen && (
                  <p style={{
                    marginTop: "0.75rem",
                    fontSize: "0.85rem",
                    lineHeight: "1.6",
                    color: "var(--text-muted)",
                    borderTop: "1px solid var(--border-card)",
                    paddingTop: "0.75rem",
                    margin: 0
                  }}>
                    {item.a}
                  </p>
                )}
              </div>
            );
          })}
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
          {text.cta_subtitle}
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
          {text.legal_disclaimer_text}
        </p>
        <div style={{ display: "flex", gap: "1rem", marginTop: "0.25rem" }}>
          <button
            onClick={() => setShowLegalModal(true)}
            style={{ background: "none", border: "none", color: "var(--primary)", textDecoration: "underline", fontSize: "0.8rem", cursor: "pointer" }}
          >
            {text.legal_link_text}
          </button>
        </div>
        <p style={{ marginTop: "0.25rem" }}>&copy; 2026 Chaml.fr. {text.copyright_text}</p>
      </footer>

      {/* Legal & GDPR Modal (Rendered directly via Portal into document.body for instant viewport alignment) */}
      {showLegalModal && createPortal(
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 99999,
            padding: "1rem",
            boxSizing: "border-box"
          }}
          onClick={() => setShowLegalModal(false)}
        >
          <div
            className="glass-card"
            style={{
              maxWidth: "700px",
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: "clamp(1.25rem, 4vw, 2.5rem)",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              gap: "1.5rem",
              margin: "auto"
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              <h2 style={{ fontSize: "1.5rem", color: "var(--primary)", marginBottom: "0.5rem" }}>{text.legal_modal_title}</h2>
              <p style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>{text.legal_modal_last_update}</p>
            </div>

            <hr style={{ border: "none", borderTop: "1px solid var(--border-card)", margin: 0 }} />

            <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem", fontSize: "0.88rem", lineHeight: "1.6", color: "var(--text-muted)" }}>
              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>{text.legal_sec1_title}</h3>
                <p>
                  {text.legal_sec1_desc}<br />
                  Contact : <a href="mailto:support@chaml.fr" style={{ color: "var(--primary)" }}>support@chaml.fr</a>.
                </p>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>{text.legal_sec2_title}</h3>
                <p>
                  {text.legal_sec2_desc}
                </p>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>{text.legal_sec3_title}</h3>
                <p>
                  {text.legal_sec3_desc}
                </p>
                <ul style={{ paddingLeft: "1.25rem", marginTop: "0.5rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                  <li>{text.legal_sec3_li1}</li>
                  <li>{text.legal_sec3_li2}</li>
                  <li>{text.legal_sec3_li3}</li>
                  <li>{text.legal_sec3_li4}</li>
                  <li>{text.legal_sec3_li5}</li>
                </ul>
              </div>

              <div>
                <h3 style={{ color: "var(--text-main)", fontSize: "1.05rem", marginBottom: "0.4rem" }}>{text.legal_sec4_title}</h3>
                <p>
                  {text.legal_sec4_desc}
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
                {text.legal_modal_btn_close}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}
