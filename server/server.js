import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import helmet from "helmet";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import nodemailer from "nodemailer";
import { query, initializeDatabase } from "./db.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

// Security and Parsers Middleware
app.use(helmet({
  contentSecurityPolicy: false, // Turn off CSP headers for local proxy requests if needed
}));
app.use(cors({
  origin: true, // Allow request origin
  credentials: true
}));
app.use(express.json());
app.use(cookieParser(process.env.COOKIE_SECRET || "chaml_secret_cookie_vault"));

// Multer Upload configuration (Secure local folder)
const uploadsDir = path.join(__dirname, "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "chaml_jwt_secret_token_vault_key_2026";

// Auth helper: generate JWT
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

// ----------------------------------------------------
// SMTP VERIFICATION & SYSTEM STATUS CHECKS
// ----------------------------------------------------
const SYSTEM_VAULT_KEY = "chaml_secure_db_vault_key_2026";
let isSMTPAvailable = false;

const decryptSMTPPassword = (cipherText) => {
  if (!cipherText) return "";
  try {
    const buffer = Buffer.from(cipherText, "base64");
    const hexStr = buffer.toString("utf-8");
    let result = "";
    for (let i = 0; i < hexStr.length; i += 2) {
      const hexChar = hexStr.slice(i, i + 2);
      const charCode = parseInt(hexChar, 16);
      const keyChar = SYSTEM_VAULT_KEY.charCodeAt((i / 2) % SYSTEM_VAULT_KEY.length);
      result += String.fromCharCode(charCode ^ keyChar);
    }
    return result;
  } catch (e) {
    console.error("Failed to decrypt SMTP password in backend:", e.message);
    return "";
  }
};

const checkSMTP = async () => {
  try {
    const configRes = await query("SELECT * FROM site_config WHERE id = 1");
    if (configRes.rows.length === 0) {
      isSMTPAvailable = false;
      console.log("❌ SMTP Check: No site configuration found in database.");
      return;
    }
    const c = configRes.rows[0];

    // If host, port, or user is missing, it is not configured yet
    if (!c.smtp_host || !c.smtp_port || !c.smtp_user) {
      isSMTPAvailable = false;
      console.log("❌ SMTP Check: SMTP is not configured yet (host/port/user is empty). Subscriptions suspended.");
      return;
    }

    const decryptedPassword = decryptSMTPPassword(c.smtp_password);
    const secure = c.smtp_protocol === "SSL";

    const transporter = nodemailer.createTransport({
      host: c.smtp_host,
      port: Number(c.smtp_port),
      secure: secure,
      auth: {
        user: c.smtp_user,
        pass: decryptedPassword
      },
      connectionTimeout: 8000,
      greetingTimeout: 8000
    });

    await transporter.verify();
    isSMTPAvailable = true;
    console.log("✅ SMTP Check: SMTP server verified and ready to send emails.");
  } catch (err) {
    isSMTPAvailable = false;
    console.error("❌ SMTP Check: SMTP connection failed. Subscriptions suspended. Details:", err.message);
  }
};

// Middleware: Authenticate User
const authenticateUser = async (req, res, next) => {
  const token = req.cookies.chaml_token;
  if (!token) {
    return res.status(401).json({ error: "Unauthorized. Missing session token." });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded; // { id, email, role, coupleId }
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid session token." });
  }
};

// Middleware: Admin Only Check
const requireAdmin = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Access denied. Admins only." });
  }
  next();
};

// Logger utility
const logAction = async (action, details, email) => {
  try {
    await query(
      "INSERT INTO audit_logs (action, details, user_email) VALUES ($1, $2, $3)",
      [action, details, email || "System"]
    );
  } catch (err) {
    console.error("Audit logging error:", err.message);
  }
};

// ----------------------------------------------------
// DATABASE INITIAL SEEDING FUNCTIONS
// ----------------------------------------------------
const seedDatabase = async () => {
  try {
    // 1. Seed site configuration
    const configCheck = await query("SELECT * FROM site_config WHERE id = 1");
    if (configCheck.rows.length === 0) {
      console.log("Seeding default site config...");
      await query(`
        INSERT INTO site_config (id, app_name, app_logo, smic_value, surface_zone_a, surface_zone_b, surface_zone_c)
        VALUES (1, 'Chaml', '🕌', 1823, 22, 24, 28)
      `);
    }

    // 2. Seed default admin account with a secure randomly generated password on first boot
    const adminCheck = await query("SELECT * FROM users WHERE role = 'admin'");
    if (adminCheck.rows.length === 0) {
      // Generate a secure 12-character random alphanumeric password
      const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
      let randomAdminPass = "";
      for (let i = 0; i < 12; i++) {
        randomAdminPass += charset.charAt(Math.floor(Math.random() * charset.length));
      }
      
      console.log("================================================================");
      console.log("🛡️  INITIAL ADMINISTRATOR ACCOUNT CREATED");
      console.log("👉 Email: admin@chaml.fr");
      console.log(`👉 Temporary Password: ${randomAdminPass}`);
      console.log("👉 PLEASE LOG IN AND CHANGE THIS PASSWORD IMMEDIATELY!");
      console.log("================================================================");

      const adminHash = await bcrypt.hash(randomAdminPass, 10);
      await query(`
        INSERT INTO users (id, email, password_hash, role, first_name, last_name, is_approved, is_email_verified)
        VALUES ('admin_01', 'admin@chaml.fr', $1, 'admin', 'Chaml', 'Admin', true, true)
      `, [adminHash]);
    }
  } catch (err) {
    console.error("Seeding error:", err.message);
  }
};

// ----------------------------------------------------
// AUTHENTICATION API ROUTES
// ----------------------------------------------------

// Get Active Session / User details
app.get("/api/auth/me", async (req, res) => {
  const token = req.cookies.chaml_token;
  if (!token) return res.json({ user: null });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    // Fetch fresh user state from DB
    const userRes = await query("SELECT * FROM users WHERE id = $1", [decoded.id]);
    if (userRes.rows.length === 0) return res.json({ user: null });
    
    const user = userRes.rows[0];
    if (user.is_frozen) {
      res.clearCookie("chaml_token");
      return res.status(403).json({ error: "frozen" });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        coupleId: user.couple_id,
        firstName: user.first_name,
        lastName: user.last_name,
        isEmailVerified: user.is_email_verified,
        isApproved: user.is_approved
      }
    });
  } catch (err) {
    res.clearCookie("chaml_token");
    res.json({ user: null });
  }
});

// App Settings Configuration Endpoint
app.get("/api/config", async (req, res) => {
  try {
    const configRes = await query("SELECT * FROM site_config WHERE id = 1");
    if (configRes.rows.length === 0) {
      return res.status(404).json({ error: "Configuration missing." });
    }
    const c = configRes.rows[0];
    res.json({
      appName: c.app_name,
      appLogo: c.app_logo,
      smicValue: Number(c.smic_value),
      surfaceZoneA: Number(c.surface_zone_a),
      surfaceZoneB: Number(c.surface_zone_b),
      surfaceZoneC: Number(c.surface_zone_c),
      smtpConfig: {
        host: c.smtp_host,
        port: c.smtp_port,
        user: c.smtp_user,
        password: c.smtp_password,
        protocol: c.smtp_protocol,
        senderName: c.smtp_sender_name,
        senderEmail: c.smtp_sender_email
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Register new couple (SaaS SignUp)
app.post("/api/auth/register", async (req, res) => {
  if (!isSMTPAvailable) {
    return res.status(503).json({ error: "Les inscriptions sont temporairement suspendues car le serveur de messagerie (SMTP) n'est pas disponible ou est mal configuré. Veuillez contacter l'administrateur." });
  }

  const { email, password, firstName, lastName, phone, city, department, zone, livingSurface, familySize } = req.body;
  if (!email || !password || !firstName || !lastName) {
    return res.status(400).json({ error: "Missing required registration parameters." });
  }

  try {
    // Check if email already exists
    const emailCheck = await query("SELECT email FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Cette adresse e-mail est déjà enregistrée." });
    }

    const coupleId = `couple_${Date.now()}`;
    const userId = `user_fr_${Date.now()}`;

    // Hash password
    const passwordHash = await bcrypt.hash(password, 10);

    // 1. Create Couple
    await query("INSERT INTO couples (id, is_approved, dossier_status) VALUES ($1, false, 'draft')", [coupleId]);

    // 2. Create Spouse in France (Applicant)
    await query(`
      INSERT INTO users (id, email, password_hash, role, couple_id, first_name, last_name, phone, city, department, zone, living_surface, family_size, is_approved, is_email_verified)
      VALUES ($1, $2, $3, 'demandeur', $4, $5, $6, $7, $8, $9, $10, $11, $12, false, false)
    `, [userId, email, passwordHash, coupleId, firstName, lastName, phone, city, department, zone || "A", Number(livingSurface || 0), Number(familySize || 2)]);

    // 3. Seed documents checklist
    const initialDocs = [
      { key: "fr_identity", owner: "demandeur", cat: "identity" },
      { key: "fr_cerfa", owner: "demandeur", cat: "civil" },
      { key: "fr_marriage", owner: "demandeur", cat: "civil" },
      { key: "fr_income", owner: "demandeur", cat: "income" },
      { key: "fr_tax", owner: "demandeur", cat: "income" },
      { key: "fr_housing", owner: "demandeur", cat: "housing" },
      { key: "fr_surface", owner: "demandeur", cat: "housing" },
      { key: "ma_identity", owner: "beneficiaire", cat: "identity" },
      { key: "ma_birth", owner: "beneficiaire", cat: "civil" },
      { key: "ma_marriage", owner: "beneficiaire", cat: "civil" },
      { key: "ma_translation", owner: "beneficiaire", cat: "civil" },
      { key: "ma_cin", owner: "beneficiaire", cat: "identity" }
    ];

    for (const d of initialDocs) {
      await query(`
        INSERT INTO documents (couple_id, doc_key, owner, category, required, uploaded)
        VALUES ($1, $2, $3, $4, true, false)
      `, [coupleId, d.key, d.owner, d.cat]);
    }

    await logAction("Couple Registered", `Created applicant account: ${email}`, email);

    // Send real activation email to applicant's address
    try {
      const configRes = await query("SELECT * FROM site_config WHERE id = 1");
      const c = configRes.rows[0];
      const decryptedPassword = decryptSMTPPassword(c.smtp_password);
      const secure = c.smtp_protocol === "SSL";

      const transporter = nodemailer.createTransport({
        host: c.smtp_host,
        port: Number(c.smtp_port),
        secure: secure,
        auth: {
          user: c.smtp_user,
          pass: decryptedPassword
        }
      });

      const activationUrl = `https://www.chaml.fr/api/auth/verify-email?coupleId=${coupleId}`;
      const mailOptions = {
        from: `"${c.smtp_sender_name}" <${c.smtp_sender_email}>`,
        to: email,
        subject: "Chaml.fr - Activez votre compte de regroupement familial",
        text: `Bonjour ${firstName},\n\nMerci de vous être inscrit sur Chaml.fr.\n\nVeuillez activer votre dossier de regroupement familial partagé en cliquant sur le lien suivant :\n${activationUrl}\n\nUne fois l'e-mail validé, l'administrateur pourra approuver l'accès à votre tableau de bord.\n\nCordialement,\nL'équipe Chaml.fr`,
        html: `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
            <h2 style="color: #0d9488; text-align: center;">🕌 Bienvenue sur Chaml.fr</h2>
            <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
            <p>Merci d'avoir créé votre compte sur Chaml.fr, votre tracker collaboratif de regroupement familial.</p>
            <p>Pour activer votre dossier et commencer à préparer votre regroupement, veuillez cliquer sur le bouton ci-dessous :</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${activationUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activer mon compte</a>
            </div>
            <p style="font-size: 0.85rem; color: #64748b;">Si le bouton ne fonctionne pas, copiez-collez le lien suivant dans votre navigateur :<br/>${activationUrl}</p>
            <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
            <p style="font-size: 0.85rem; text-align: center; color: #94a3b8;">L'équipe Chaml.fr - Reuniting your family, without borders</p>
          </div>
        `
      };

      await transporter.sendMail(mailOptions);
      console.log(`✉️ Activation email sent successfully to ${email}`);
    } catch (mailErr) {
      console.error("Failed to send real activation email. Details:", mailErr.message);
    }

    res.json({ success: true, coupleId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login user
app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password." });
  }

  try {
    const userRes = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "invalid_credentials" });
    }

    const user = userRes.rows[0];
    if (user.is_frozen) {
      return res.status(403).json({ error: "frozen" });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).json({ error: "invalid_credentials" });
    }

    // Check email verification / approval for non-admins
    if (user.role !== "admin") {
      if (!user.is_email_verified) {
        return res.status(403).json({ error: "unverified", userId: user.id });
      }
      if (!user.is_approved) {
        return res.status(403).json({ error: "unapproved", coupleId: user.couple_id });
      }
    }

    // Generate Session JWT
    const token = generateToken({
      id: user.id,
      email: user.email,
      role: user.role,
      coupleId: user.couple_id
    });

    res.cookie("chaml_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    await logAction("User Login", `User logged in: ${user.email}`, user.email);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        coupleId: user.couple_id,
        firstName: user.first_name,
        lastName: user.last_name,
        isEmailVerified: user.is_email_verified,
        isApproved: user.is_approved
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("chaml_token");
  res.json({ success: true });
});

// GET Email Verification Link Redirect (Real link clicks)
app.get("/api/auth/verify-email", async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).send("Lien d'activation invalide.");
  try {
    await query("UPDATE users SET is_email_verified = true WHERE couple_id = $1", [coupleId]);
    await logAction("Email Verified", `Verified email via link click for couple: ${coupleId}`, "System");
    res.redirect("/?verified=true");
  } catch (err) {
    res.status(500).send("Erreur lors de la validation de l'e-mail: " + err.message);
  }
});

// Simulate Email Verification Link Click
app.post("/api/auth/verify-email", async (req, res) => {
  const { coupleId } = req.body;
  if (!coupleId) return res.status(400).json({ error: "Missing couple ID." });
  try {
    // Set is_email_verified = true for both users in couple
    await query("UPDATE users SET is_email_verified = true WHERE couple_id = $1", [coupleId]);
    await logAction("Email Verified", `Verified email simulation for couple: ${coupleId}`, "System");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// DOSSIER / CLIENT OPERATIONS API ROUTES
// ----------------------------------------------------

// Fetch complete dossier documents for active couple
app.get("/api/dossier", authenticateUser, async (req, res) => {
  const coupleId = req.user.coupleId;
  if (!coupleId) return res.status(400).json({ error: "No couple folder linked to this account." });
  try {
    const coupleRes = await query("SELECT * FROM couples WHERE id = $1", [coupleId]);
    const usersRes = await query("SELECT first_name, last_name, role, city, department FROM users WHERE couple_id = $1", [coupleId]);
    const docsRes = await query("SELECT * FROM documents WHERE couple_id = $1 ORDER BY id ASC", [coupleId]);

    const demandeur = usersRes.rows.find(u => u.role === "demandeur") || {};
    const beneficiaire = usersRes.rows.find(u => u.role === "beneficiaire") || null;

    const partner = req.user.role === "demandeur" ? beneficiaire : demandeur;
    const partnerName = partner ? partner.first_name : "Partner";

    const docs = docsRes.rows.map(d => ({
      id: d.doc_key,
      nameKey: d.doc_key === "fr_identity" ? "doc_fr_identity" : 
               d.doc_key === "fr_cerfa" ? "doc_fr_cerfa" :
               d.doc_key === "fr_marriage" ? "doc_fr_marriage" :
               d.doc_key === "fr_income" ? "doc_fr_income" :
               d.doc_key === "fr_tax" ? "doc_fr_tax" :
               d.doc_key === "fr_housing" ? "doc_fr_housing" :
               d.doc_key === "fr_surface" ? "doc_fr_surface" :
               d.doc_key === "ma_identity" ? "doc_ma_identity" :
               d.doc_key === "ma_birth" ? "doc_ma_birth" :
               d.doc_key === "ma_marriage" ? "doc_ma_marriage" :
               d.doc_key === "ma_translation" ? "doc_ma_translation" : "doc_ma_cin",
      category: d.category,
      required: d.required,
      uploaded: d.uploaded,
      fileName: d.file_name,
      uploadedAt: d.uploaded_at,
      status: d.status,
      comment: d.comment,
      owner: d.owner
    }));

    const franceDocs = docs.filter(d => d.owner === "demandeur");
    const moroccoDocs = docs.filter(d => d.owner === "beneficiaire");

    res.json({
      partnerName,
      couple: {
        id: coupleRes.rows[0].id,
        demandeur: {
          firstName: demandeur.first_name,
          lastName: demandeur.last_name,
          city: demandeur.city,
          department: demandeur.department
        },
        beneficiaire: beneficiaire ? {
          firstName: beneficiaire.first_name,
          lastName: beneficiaire.last_name
        } : null
      },
      dossier: {
        id: coupleRes.rows[0].id,
        status: coupleRes.rows[0].dossier_status,
        submittedAt: coupleRes.rows[0].submitted_at,
        franceDocs,
        moroccoDocs
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Upload Document File API
app.post("/api/dossier/upload", authenticateUser, upload.single("file"), async (req, res) => {
  const { docKey, owner } = req.body;
  if (!docKey || !req.file) {
    return res.status(400).json({ error: "Missing document key or file payload." });
  }
  const coupleId = req.user.coupleId;

  try {
    await query(`
      UPDATE documents
      SET uploaded = true, file_name = $1, file_path = $2, uploaded_at = CURRENT_TIMESTAMP, status = 'under_review', comment = NULL
      WHERE couple_id = $3 AND doc_key = $4
    `, [req.file.originalname, req.file.path, coupleId, docKey]);

    await logAction("Document Uploaded", `Uploaded file ${req.file.originalname} for document: ${docKey}`, req.user.email);
    res.json({ success: true, fileName: req.file.originalname });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Document File API
app.post("/api/dossier/delete", authenticateUser, async (req, res) => {
  const { docKey } = req.body;
  const coupleId = req.user.coupleId;
  if (!docKey) return res.status(400).json({ error: "Missing docKey parameter." });

  try {
    // Find file path to delete locally
    const fileRes = await query("SELECT file_path, file_name FROM documents WHERE couple_id = $1 AND doc_key = $2", [coupleId, docKey]);
    if (fileRes.rows.length > 0 && fileRes.rows[0].file_path) {
      const p = fileRes.rows[0].file_path;
      if (fs.existsSync(p)) {
        fs.unlinkSync(p);
      }
    }

    await query(`
      UPDATE documents
      SET uploaded = false, file_name = NULL, file_path = NULL, uploaded_at = NULL, status = 'pending', comment = NULL
      WHERE couple_id = $1 AND doc_key = $2
    `, [coupleId, docKey]);

    await logAction("Document Deleted", `Removed file for document: ${docKey}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Authenticated private file downloader (Prevents public access leaks)
app.get("/api/dossier/download/:coupleId/:docKey", authenticateUser, async (req, res) => {
  const { coupleId, docKey } = req.params;

  // Security authorization check: User must be either the owner couple or an admin
  if (req.user.role !== "admin" && req.user.coupleId !== coupleId) {
    return res.status(403).json({ error: "Access denied. Unauthorized document access." });
  }

  try {
    const docRes = await query("SELECT file_path, file_name FROM documents WHERE couple_id = $1 AND doc_key = $2", [coupleId, docKey]);
    if (docRes.rows.length === 0 || !docRes.rows[0].file_path) {
      return res.status(404).json({ error: "File not found." });
    }

    const { file_path, file_name } = docRes.rows[0];
    if (!fs.existsSync(file_path)) {
      return res.status(404).json({ error: "Physical file missing on server disk." });
    }

    res.download(file_path, file_name);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit Dossier
app.post("/api/dossier/submit", authenticateUser, async (req, res) => {
  const coupleId = req.user.coupleId;
  try {
    await query("UPDATE couples SET dossier_status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1", [coupleId]);
    await logAction("Dossier Submitted", `Dossier submitted to authorities for couple ID: ${coupleId}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// ADMIN OPERATIONS API ROUTES
// ----------------------------------------------------

// Fetch all registered couples lists
app.get("/api/admin/couples", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const couplesRes = await query("SELECT * FROM couples ORDER BY id DESC");
    const usersRes = await query("SELECT id, email, role, couple_id, first_name, last_name, is_frozen, is_approved, is_email_verified FROM users WHERE role != 'admin'");
    const docsRes = await query("SELECT couple_id, doc_key, uploaded, category, required, status, comment, owner FROM documents");

    // Map couples with their corresponding spouses and document checklists
    const result = couplesRes.rows.map(c => {
      const demandeur = usersRes.rows.find(u => u.couple_id === c.id && u.role === "demandeur") || {};
      const beneficiaire = usersRes.rows.find(u => u.couple_id === c.id && u.role === "beneficiaire") || null;
      const coupleDocs = docsRes.rows.filter(d => d.couple_id === c.id);

      const franceDocs = coupleDocs.filter(d => d.owner === "demandeur").map(d => ({
        id: d.doc_key,
        nameKey: d.doc_key,
        category: d.category,
        required: d.required,
        uploaded: d.uploaded,
        status: d.status,
        comment: d.comment,
        owner: d.owner
      }));

      const moroccoDocs = coupleDocs.filter(d => d.owner === "beneficiaire").map(d => ({
        id: d.doc_key,
        nameKey: d.doc_key,
        category: d.category,
        required: d.required,
        uploaded: d.uploaded,
        status: d.status,
        comment: d.comment,
        owner: d.owner
      }));

      return {
        id: c.id,
        dossier: {
          id: c.id,
          status: c.dossier_status,
          submittedAt: c.submitted_at,
          franceDocs,
          moroccoDocs
        },
        demandeur: {
          email: demandeur.email,
          firstName: demandeur.first_name,
          lastName: demandeur.last_name,
          isFrozen: demandeur.is_frozen,
          isApproved: demandeur.is_approved,
          isEmailVerified: demandeur.is_email_verified
        },
        beneficiaire: beneficiaire ? {
          email: beneficiaire.email,
          firstName: beneficiaire.first_name,
          lastName: beneficiaire.last_name,
          isFrozen: beneficiaire.is_frozen,
          isApproved: beneficiaire.is_approved,
          isEmailVerified: beneficiaire.is_email_verified
        } : null
      };
    });

    res.json({ couples: result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete Couple pairing Account
app.delete("/api/admin/couples/:id", authenticateUser, requireAdmin, async (req, res) => {
  const { id } = req.params;
  try {
    // Get file paths to delete files locally
    const fileRes = await query("SELECT file_path FROM documents WHERE couple_id = $1", [id]);
    for (const row of fileRes.rows) {
      if (row.file_path && fs.existsSync(row.file_path)) {
        fs.unlinkSync(row.file_path);
      }
    }

    await query("DELETE FROM couples WHERE id = $1", [id]);
    await logAction("Couple Account Deleted", `Permanently deleted couple account ID: ${id}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Toggle Frozen status
app.post("/api/admin/users/freeze", authenticateUser, requireAdmin, async (req, res) => {
  const { email, isFrozen } = req.body;
  if (!email) return res.status(400).json({ error: "Missing user email." });
  try {
    await query("UPDATE users SET is_frozen = $1 WHERE email = $2", [isFrozen, email]);
    await logAction(isFrozen ? "Account Frozen" : "Account Unfrozen", `Suspended/Unsuspended user: ${email}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Approve couple accounts
app.post("/api/admin/couples/approve", authenticateUser, requireAdmin, async (req, res) => {
  const { coupleId } = req.body;
  if (!coupleId) return res.status(400).json({ error: "Missing coupleId parameter." });
  try {
    await query("UPDATE couples SET is_approved = true WHERE id = $1", [coupleId]);
    await query("UPDATE users SET is_approved = true WHERE couple_id = $1", [coupleId]);
    await logAction("Account Approved", `Approved couple accounts for ID: ${coupleId}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Moderator: review document (Approve / Reject)
app.post("/api/admin/documents/review", authenticateUser, requireAdmin, async (req, res) => {
  const { coupleId, docKey, status, comment } = req.body;
  if (!coupleId || !docKey || !status) {
    return res.status(400).json({ error: "Missing review arguments." });
  }
  try {
    await query(`
      UPDATE documents
      SET status = $1, comment = $2
      WHERE couple_id = $3 AND doc_key = $4
    `, [status, comment || null, coupleId, docKey]);

    await logAction("Document Reviewed", `Reviewed document ${docKey} for couple ${coupleId} (Status: ${status})`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete document (Moderator command)
app.post("/api/admin/documents/delete", authenticateUser, requireAdmin, async (req, res) => {
  const { coupleId, docKey } = req.body;
  try {
    const fileRes = await query("SELECT file_path FROM documents WHERE couple_id = $1 AND doc_key = $2", [coupleId, docKey]);
    if (fileRes.rows.length > 0 && fileRes.rows[0].file_path) {
      const p = fileRes.rows[0].file_path;
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }
    await query(`
      UPDATE documents
      SET uploaded = false, file_name = NULL, file_path = NULL, uploaded_at = NULL, status = 'pending', comment = NULL
      WHERE couple_id = $1 AND doc_key = $2
    `, [coupleId, docKey]);

    await logAction("Admin Deleted Document", `Removed file for document ${docKey} of couple ${coupleId}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change submission date (Testing alert triggers)
app.post("/api/admin/couples/submitted-date", authenticateUser, requireAdmin, async (req, res) => {
  const { coupleId, date } = req.body;
  try {
    const parsedDate = date ? new Date(date) : null;
    await query("UPDATE couples SET submitted_at = $1 WHERE id = $2", [parsedDate, coupleId]);
    await logAction("Admin Date Modified", `Modified submission date for couple ${coupleId} to ${date || "null"}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Save Admin Settings configuration
app.post("/api/admin/settings", authenticateUser, requireAdmin, async (req, res) => {
  const { appName, appLogo, smicValue, surfaceZoneA, surfaceZoneB, surfaceZoneC, smtpConfig } = req.body;
  try {
    await query(`
      UPDATE site_config
      SET app_name = $1, app_logo = $2, smic_value = $3, surface_zone_a = $4, surface_zone_b = $5, surface_zone_c = $6,
          smtp_host = $7, smtp_port = $8, smtp_user = $9, smtp_password = $10, smtp_protocol = $11, smtp_sender_name = $12, smtp_sender_email = $13
      WHERE id = 1
    `, [appName, appLogo, Number(smicValue), Number(surfaceZoneA), Number(surfaceZoneB), Number(surfaceZoneC),
        smtpConfig.host, Number(smtpConfig.port), smtpConfig.user, smtpConfig.password, smtpConfig.protocol, smtpConfig.senderName, smtpConfig.senderEmail]);

    await logAction("Admin Settings Saved", `Updated app settings configuration`, req.user.email);
    await checkSMTP();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get Audit Logs (Grouped by daily YYYY-MM-DD keys)
app.get("/api/admin/logs", authenticateUser, requireAdmin, async (req, res) => {
  try {
    const logsRes = await query("SELECT created_at, action, details, user_email FROM audit_logs ORDER BY created_at DESC");
    
    // Group logs by YYYY-MM-DD key
    const grouped = {};
    for (const log of logsRes.rows) {
      const dateKey = new Date(log.created_at).toISOString().slice(0, 10);
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push({
        time: new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        action: log.action,
        details: log.details,
        user: log.user_email
      });
    }

    res.json({ logs: grouped });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Change User Password Endpoint
app.post("/api/auth/change-password", authenticateUser, async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "Both current and new passwords are required." });
  }

  try {
    const userRes = await query("SELECT id, password_hash, email FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }
    const user = userRes.rows[0];

    const match = await bcrypt.compare(currentPassword, user.password_hash);
    if (!match) {
      return res.status(400).json({ error: "Le mot de passe actuel est incorrect." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await query("UPDATE users SET password_hash = $1 WHERE id = $2", [newHash, req.user.id]);

    await logAction("Password Changed", `User changed password for: ${user.email}`, user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Invite Spouse (Morocco Conjoint) Route
app.post("/api/dossier/invite-spouse", authenticateUser, async (req, res) => {
  if (req.user.role !== "demandeur") {
    return res.status(403).json({ error: "Only the primary applicant can invite the spouse." });
  }

  const { email, firstName, lastName, phone, city } = req.body;
  if (!email || !firstName || !lastName) {
    return res.status(400).json({ error: "Email, first name, and last name are required." });
  }

  try {
    // Check if couple already has a spouse
    const partnerCheck = await query("SELECT id FROM users WHERE couple_id = $1 AND role = 'beneficiaire'", [req.user.coupleId]);
    if (partnerCheck.rows.length > 0) {
      return res.status(400).json({ error: "Un conjoint a déjà été invité ou créé pour ce dossier." });
    }

    // Check if email already exists in users table
    const emailCheck = await query("SELECT id FROM users WHERE email = $1", [email]);
    if (emailCheck.rows.length > 0) {
      return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
    }

    const userId = `user_ma_${Date.now()}`;

    // Insert user in pending_invite state (password_hash = 'INVITATION_PENDING')
    // Automatically set is_approved = true because the main account is already approved/reviewed!
    await query(`
      INSERT INTO users (id, email, password_hash, role, couple_id, first_name, last_name, phone, city, is_approved, is_email_verified)
      VALUES ($1, $2, 'INVITATION_PENDING', 'beneficiaire', $3, $4, $5, $6, $7, true, false)
    `, [userId, email, req.user.coupleId, firstName, lastName, phone || "", city || ""]);

    await logAction("Spouse Invited", `Invited spouse ${email} to join couple: ${req.user.coupleId}`, req.user.email);

    // Send real invitation email
    if (isSMTPAvailable) {
      try {
        const configRes = await query("SELECT * FROM site_config WHERE id = 1");
        const c = configRes.rows[0];
        const decryptedPassword = decryptSMTPPassword(c.smtp_password);
        const secure = c.smtp_protocol === "SSL";

        const transporter = nodemailer.createTransport({
          host: c.smtp_host,
          port: Number(c.smtp_port),
          secure: secure,
          auth: {
            user: c.smtp_user,
            pass: decryptedPassword
          }
        });

        const inviteUrl = `https://www.chaml.fr/?inviteCoupleId=${req.user.coupleId}&inviteEmail=${encodeURIComponent(email)}`;
        const mailOptions = {
          from: `"${c.smtp_sender_name}" <${c.smtp_sender_email}>`,
          to: email,
          subject: "🕌 Chaml.fr - Invitation à rejoindre votre dossier conjoint",
          text: `Bonjour ${firstName},\n\nVotre conjoint(e) vous invite à le/la rejoindre sur Chaml.fr pour préparer votre dossier de regroupement familial.\n\nVeuillez accepter l'invitation et choisir votre mot de passe en cliquant sur le lien suivant :\n${inviteUrl}\n\nUne fois votre mot de passe créé, vous aurez accès immédiatement à votre tableau de bord.\n\nCordialement,\nL'équipe Chaml.fr`,
          html: `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0d9488; text-align: center;">🕌 Rejoignez votre conjoint(e) sur Chaml.fr</h2>
              <p>Bonjour <strong>${firstName} ${lastName}</strong>,</p>
              <p>Votre conjoint(e) <strong>${req.user.firstName}</strong> vous invite à rejoindre son dossier conjoint sur Chaml.fr afin de collaborer sur vos démarches de regroupement familial.</p>
              <p>Pour accepter cette invitation et définir votre mot de passe de connexion, veuillez cliquer sur le bouton ci-dessous :</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${inviteUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Définir mon mot de passe</a>
              </div>
              <p style="font-size: 0.85rem; color: #64748b;">Si le bouton ne fonctionne pas, copiez-collez le lien suivant dans votre navigateur :<br/>${inviteUrl}</p>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
              <p style="font-size: 0.85rem; text-align: center; color: #94a3b8;">L'équipe Chaml.fr - Reuniting your family, without borders</p>
            </div>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Spouse invitation email sent to ${email}`);
      } catch (mailErr) {
        console.error("Failed to send spouse invitation email:", mailErr.message);
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Spouse Invitation Route
app.post("/api/auth/accept-invite", async (req, res) => {
  const { coupleId, email, password } = req.body;
  if (!coupleId || !email || !password) {
    return res.status(400).json({ error: "Missing coupleId, email, or password." });
  }

  try {
    const userRes = await query("SELECT id FROM users WHERE couple_id = $1 AND email = $2 AND password_hash = 'INVITATION_PENDING'", [coupleId, email]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Invitation invalide ou expirée." });
    }

    const hash = await bcrypt.hash(password, 10);
    await query("UPDATE users SET password_hash = $1, is_email_verified = true WHERE couple_id = $2 AND email = $3", [hash, coupleId, email]);

    await logAction("Spouse Activated", `Spouse completed setup for: ${email}`, email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start Express Server
initializeDatabase().then(() => {
  seedDatabase().then(() => {
    checkSMTP().then(() => {
      app.listen(PORT, () => {
        console.log(`Chaml backend running on http://localhost:${PORT}`);
      });
    });
  });
});
