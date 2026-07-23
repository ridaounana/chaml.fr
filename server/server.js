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
import Stripe from "stripe";
import cron from "node-cron";
import { query, initializeDatabase } from "./db.js";
import crypto from "crypto";

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
const stripe = new Stripe((process.env.STRIPE_SECRET_KEY || "sk_test_mock_stripe_secret_key_chaml_2026").trim());

// Webhook route needs raw body for signature verification - MUST be defined before global express.json() parser
app.post("/api/payment/webhook", express.raw({ type: "*/*" }), async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.trim() : undefined;
  let event;

  console.log("=== 🔍 STRIPE WEBHOOK RECEIVED ===");
  console.log("- Signature Header present:", !!sig);
  console.log("- Webhook Secret present:", !!webhookSecret);
  if (webhookSecret) {
    console.log(`- Webhook Secret (starts with): ${webhookSecret.slice(0, 10)}...`);
  }
  console.log("- Body is Buffer:", Buffer.isBuffer(req.body));
  if (req.body) {
    console.log("- Body length (bytes):", req.body.length);
    console.log("- Body content snippet (first 100 chars):", req.body.toString().slice(0, 100));
  }

  try {
    if (webhookSecret && sig) {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      console.log("✅ Webhook signature verified successfully! Event type:", event.type);
    } else {
      console.warn("⚠️ Stripe webhook secret not configured or signature missing. Parsing unverified payload.");
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.warn(`⚠️ Webhook signature verification failed: ${err.message}. Attempting secure fallback via direct Stripe API retrieval...`);
    try {
      const payload = JSON.parse(req.body.toString());
      if (payload && payload.id) {
        // Retrieve the event directly from Stripe API using our secret key - 100% secure
        event = await stripe.events.retrieve(payload.id);
        console.log(`✅ Fallback Success: Verified event ${payload.id} directly via Stripe API. Event type:`, event.type);
      } else {
        throw new Error("Payload is empty or missing 'id' field.");
      }
    } catch (fallbackErr) {
      console.error(`❌ Webhook fallback verification failed:`, fallbackErr.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const coupleId = session.metadata?.coupleId;
    const userEmail = session.metadata?.userEmail || "system@chaml.fr";

    if (coupleId) {
      try {
        await query("UPDATE couples SET is_premium = true WHERE id = $1", [coupleId]);
        console.log(`🎉 Couple ${coupleId} successfully upgraded to Premium!`);
        
        await query(
          "INSERT INTO audit_logs (action, details, user_email) VALUES ($1, $2, $3)",
          ["Premium Upgraded", `Couple ${coupleId} upgraded to Premium via Stripe checkout session.`, userEmail]
        );
      } catch (dbErr) {
        console.error("❌ Failed to update premium status in database:", dbErr.message);
        return res.status(500).json({ error: "Database update failed" });
      }
    }
  }

  res.json({ received: true });
});

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
const upload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB Max per file
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== ".pdf") {
      const err = new Error("Seuls les fichiers PDF (.pdf) sont autorisés.");
      err.code = "ONLY_PDF_ALLOWED";
      return cb(err, false);
    }
    cb(null, true);
  }
});

// JWT Secret Key
const JWT_SECRET = process.env.JWT_SECRET || "chaml_jwt_secret_token_vault_key_2026";

// Auth helper: generate JWT
const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
};

// ----------------------------------------------------
// PII AES-256 ENCRYPTION VAULT AT REST
// ----------------------------------------------------
const PII_VAULT_SECRET = process.env.PII_ENCRYPTION_KEY || "chaml_pii_master_vault_secret_2026";
const PII_KEY = crypto.createHash("sha256").update(PII_VAULT_SECRET).digest();

const encryptPII = (plainText) => {
  if (plainText === null || plainText === undefined || plainText === "") return "";
  const str = String(plainText);
  if (str.startsWith("enc:")) return str;
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv("aes-256-cbc", PII_KEY, iv);
    let encrypted = cipher.update(str, "utf8", "hex");
    encrypted += cipher.final("hex");
    return `enc:${iv.toString("hex")}:${encrypted}`;
  } catch (err) {
    console.error("❌ PII Encryption Error:", err.message);
    return str;
  }
};

const decryptPII = (cipherText) => {
  if (!cipherText || typeof cipherText !== "string" || !cipherText.startsWith("enc:")) {
    return cipherText || "";
  }
  try {
    const parts = cipherText.slice(4).split(":");
    if (parts.length !== 2) return cipherText;
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv("aes-256-cbc", PII_KEY, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (err) {
    console.error("❌ PII Decryption Error:", err.message);
    return cipherText;
  }
};

const decryptUserObject = (user) => {
  if (!user) return user;
  const u = { ...user };
  if (u.first_name) u.first_name = decryptPII(u.first_name);
  if (u.last_name) u.last_name = decryptPII(u.last_name);
  if (u.firstName) u.firstName = decryptPII(u.firstName);
  if (u.lastName) u.lastName = decryptPII(u.lastName);
  if (u.address) u.address = decryptPII(u.address);
  if (u.city) u.city = decryptPII(u.city);
  if (u.department) u.department = decryptPII(u.department);
  if (u.phone) u.phone = decryptPII(u.phone);
  return u;
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

const sendSystemEmail = async (to, subject, text, html) => {
  try {
    const configRes = await query("SELECT * FROM site_config WHERE id = 1");
    if (configRes.rows.length === 0) {
      throw new Error("Configuration missing inside database.");
    }
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

    const mailOptions = {
      from: `"${c.smtp_sender_name}" <${c.smtp_sender_email}>`,
      to,
      subject,
      text,
      html
    };

    await transporter.sendMail(mailOptions);
    return true;
  } catch (err) {
    console.error("❌ sendSystemEmail helper failed:", err.message);
    throw err;
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
        VALUES ('admin_01', 'admin@chaml.fr', $1, 'admin', $2, $3, true, true)
      `, [adminHash, encryptPII("Chaml"), encryptPII("Admin")]);
    }

    // 3. Migrate existing database PII records to AES-256 encrypted format if unencrypted
    const allUsers = await query("SELECT id, first_name, last_name, address, city, department, phone FROM users");
    for (const u of allUsers.rows) {
      const encFn = encryptPII(u.first_name);
      const encLn = encryptPII(u.last_name);
      const encAddr = encryptPII(u.address);
      const encCity = encryptPII(u.city);
      const encDep = encryptPII(u.department);
      const encPhone = encryptPII(u.phone);

      if (encFn !== u.first_name || encLn !== u.last_name || encAddr !== u.address || encCity !== u.city || encDep !== u.department || encPhone !== u.phone) {
        await query(`
          UPDATE users 
          SET first_name = $1, last_name = $2, address = $3, city = $4, department = $5, phone = $6
          WHERE id = $7
        `, [encFn, encLn, encAddr, encCity, encDep, encPhone, u.id]);
      }
    }
  } catch (err) {
    console.error("Seeding & PII encryption migration error:", err.message);
  }
};

// ----------------------------------------------------
// STRIPE PAYMENT API ROUTES
// ----------------------------------------------------
app.post("/api/payment/create-checkout-session", authenticateUser, async (req, res) => {
  try {
    const coupleId = req.user.coupleId;
    const userEmail = req.user.email;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      line_items: [
        {
          price_data: {
            currency: "eur",
            product_data: {
              name: "Chaml Premium - Accès à vie",
              description: "Débloquez l'invitation conjoint, le téléversement de documents chiffrés de bout en bout et la suppression automatique sécurisée sous 30 jours.",
            },
            unit_amount: 1900, // 19.00 EUR
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL || "http://localhost:5173"}/?payment=cancel`,
      metadata: {
        coupleId: coupleId,
        userEmail: userEmail,
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("❌ Failed to create Stripe session:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Verification route to check Stripe checkout session status and upgrade the couple
app.post("/api/payment/verify-session", authenticateUser, async (req, res) => {
  const { sessionId } = req.body;
  console.log(`🔍 Received verify-session request for session ID: ${sessionId} (User: ${req.user.email})`);
  if (!sessionId) {
    console.warn("⚠️ verify-session aborted: Missing sessionId");
    return res.status(400).json({ error: "Missing sessionId parameter." });
  }

  try {
    // Retrieve checkout session details from Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    // Security validation: verify metadata coupleId matches the authenticated user's coupleId
    if (session.metadata?.coupleId !== req.user.coupleId) {
      console.warn(`⚠️ verify-session unauthorized: Metadata coupleId (${session.metadata?.coupleId}) does not match request user coupleId (${req.user.coupleId})`);
      return res.status(403).json({ error: "Unauthorized session access." });
    }

    // Check payment validation status
    if (session.payment_status === "paid" || session.status === "complete") {
      await query("UPDATE couples SET is_premium = true WHERE id = $1", [req.user.coupleId]);
      await logAction("Premium Upgraded Via Callback", `Couple ${req.user.coupleId} upgraded via checkout verification.`, req.user.email);
      console.log(`✅ Success: Couple ${req.user.coupleId} upgraded to Premium via direct verification callback!`);
      return res.json({ success: true });
    } else {
      console.warn(`⚠️ verify-session failed: Payment status is ${session.payment_status}, session status is ${session.status}`);
      return res.status(400).json({ error: "Le paiement n'a pas été complété." });
    }
  } catch (err) {
    console.error("❌ Stripe session verification failed:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Google OAuth Authentication Routes
app.get("/api/auth/google", (req, res) => {
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  let fallbackUrl = `${protocol}://${host}`;
  if (host.includes("localhost:5000")) {
    fallbackUrl = "http://localhost:5173";
  }
  const clientUrl = process.env.CLIENT_URL || fallbackUrl;
  const redirectUri = `${clientUrl}/api/auth/google/callback`;
  const clientId = process.env.GOOGLE_CLIENT_ID || "";
  
  if (!clientId) {
    console.warn("⚠️ GOOGLE_CLIENT_ID is not configured in .env");
    return res.status(500).send("Google OAuth is not configured. Please add GOOGLE_CLIENT_ID to your .env file.");
  }

  const googleUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
    `client_id=${clientId}&` +
    `redirect_uri=${encodeURIComponent(redirectUri)}&` +
    `response_type=code&` +
    `scope=openid%20email%20profile`;
  res.redirect(googleUrl);
});

app.get("/api/auth/google/callback", async (req, res) => {
  const { code } = req.query;
  const protocol = req.headers["x-forwarded-proto"] || req.protocol;
  const host = req.headers["x-forwarded-host"] || req.get("host");
  let fallbackUrl = `${protocol}://${host}`;
  if (host.includes("localhost:5000")) {
    fallbackUrl = "http://localhost:5173";
  }
  const clientUrl = process.env.CLIENT_URL || fallbackUrl;
  const redirectUri = `${clientUrl}/api/auth/google/callback`;

  if (!code) {
    return res.redirect(`${clientUrl}/?error=missing_code`);
  }

  try {
    // Exchange auth code for access token
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID || "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET || "",
        redirect_uri: redirectUri,
        grant_type: "authorization_code"
      })
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok) {
      throw new Error(tokenData.error_description || "Failed to exchange Google OAuth code");
    }

    // Fetch profile info from Google
    const profileRes = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();

    const email = profile.email;
    const firstName = profile.given_name || "";
    const lastName = profile.family_name || "";

    // Check if user already exists
    const existingUser = await query("SELECT * FROM users WHERE email = $1", [email]);
    if (existingUser.rows.length > 0) {
      const user = existingUser.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, role: user.role, coupleId: user.couple_id },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("chaml_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.redirect(clientUrl);
    } else {
      // Redirect to registration page with Google pre-fills
      return res.redirect(`${clientUrl}/?google_register=true&email=${encodeURIComponent(email)}&firstName=${encodeURIComponent(firstName)}&lastName=${encodeURIComponent(lastName)}`);
    }
  } catch (err) {
    console.error("❌ Google OAuth Error:", err.message);
    res.redirect(`${clientUrl}/?error=${encodeURIComponent(err.message)}`);
  }
});

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

    // Check if user is email verified and approved
    if (user.role !== "admin" && (!user.is_email_verified || !user.is_approved)) {
      res.clearCookie("chaml_token");
      return res.json({ user: null });
    }

    res.json({
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        coupleId: user.couple_id,
        firstName: decryptPII(user.first_name),
        lastName: decryptPII(user.last_name),
        address: decryptPII(user.address),
        city: decryptPII(user.city),
        department: decryptPII(user.department),
        phone: decryptPII(user.phone),
        zone: user.zone,
        livingSurface: Number(user.living_surface || 0),
        familySize: Number(user.family_size || 2),
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
  // Honeypot anti-bot check
  if (req.body.hp_website_check) {
    return res.status(400).json({ error: "Invalid registration request." });
  }

  if (!isSMTPAvailable) {
    return res.status(503).json({ error: "Les inscriptions sont temporairement suspendues car le serveur de messagerie (SMTP) n'est pas disponible ou est mal configuré. Veuillez contacter l'administrateur." });
  }

  const { email, password, firstName, lastName, phone, address, city, department, zone, livingSurface, familySize, isGoogle } = req.body;
  if (!isGoogle && !isSMTPAvailable) {
    return res.status(503).json({ error: "Les inscriptions sont temporairement suspendues car le serveur de messagerie (SMTP) n'est pas disponible ou est mal configuré. Veuillez contacter l'administrateur." });
  }

  if (!email || (!isGoogle && !password) || !firstName || !lastName) {
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
    const passToHash = password || Math.random().toString(36);
    const passwordHash = await bcrypt.hash(passToHash, 10);

    const isApprovedVal = isGoogle ? true : false;
    const isEmailVerifiedVal = isGoogle ? true : false;

    // 1. Create Couple
    await query("INSERT INTO couples (id, is_approved, dossier_status) VALUES ($1, $2, 'draft')", [coupleId, isApprovedVal]);

    // 2. Create Spouse in France (Applicant) with AES-256 Encrypted PII
    await query(`
      INSERT INTO users (id, email, password_hash, role, couple_id, first_name, last_name, phone, address, city, department, zone, living_surface, family_size, is_approved, is_email_verified)
      VALUES ($1, $2, $3, 'demandeur', $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
    `, [
      userId, 
      email, 
      passwordHash, 
      coupleId, 
      encryptPII(firstName), 
      encryptPII(lastName), 
      encryptPII(phone || ""), 
      encryptPII(address || ""), 
      encryptPII(city || ""), 
      encryptPII(department || ""), 
      zone || "A", 
      Number(livingSurface || 0), 
      Number(familySize || 2), 
      isApprovedVal, 
      isEmailVerifiedVal
    ]);

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

    if (isGoogle) {
      // Auto login: generate JWT token and set cookie
      const token = jwt.sign(
        { id: userId, email, role: 'demandeur', coupleId },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      res.cookie("chaml_token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
      });

      return res.json({ success: true, coupleId, autoLogin: true });
    }

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

      const protocol = req.headers["x-forwarded-proto"] || req.protocol;
      const host = req.headers["x-forwarded-host"] || req.get("host");
      let fallbackUrl = `${protocol}://${host}`;
      if (host.includes("localhost:5000")) fallbackUrl = "http://localhost:5173";
      const baseUrl = process.env.CLIENT_URL || fallbackUrl;
      const activationUrl = `${baseUrl}/api/auth/verify-email?coupleId=${coupleId}`;
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
        firstName: decryptPII(user.first_name),
        lastName: decryptPII(user.last_name),
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

// Request Password Reset (Forgot Password)
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "L'adresse email est requise." });
  }

  try {
    const userRes = await query("SELECT * FROM users WHERE email = $1", [email.toLowerCase().trim()]);
    if (userRes.rows.length === 0) {
      // Security best practice: don't reveal if user exists, return success anyway
      return res.json({ success: true, message: "Si cette adresse existe, un email a été envoyé." });
    }

    const user = userRes.rows[0];
    const token = crypto.randomBytes(32).toString("hex");
    const expires = new Date(Date.now() + 3600000); // 1 hour expiration

    await query(
      "UPDATE users SET reset_password_token = $1, reset_password_expires = $2 WHERE id = $3",
      [token, expires, user.id]
    );

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    let fallbackUrl = `${protocol}://${host}`;
    if (host.includes("localhost:5000")) {
      fallbackUrl = "http://localhost:5173";
    }
    const clientUrl = process.env.CLIENT_URL || fallbackUrl;
    const resetLink = `${clientUrl}/?auth_view=reset_password&token=${token}`;

    const subject = "Réinitialisation de votre mot de passe - Chaml.fr";
    const text = `Bonjour,\n\nVous avez demandé la réinitialisation de votre mot de passe sur Chaml.fr.\n\nVeuillez cliquer sur le lien suivant pour choisir un nouveau mot de passe (valable 1 heure) :\n${resetLink}\n\nSi vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail.\n\nCordialement,\nL'équipe Chaml.fr`;
    const html = `<p>Bonjour,</p>
                  <p>Vous avez demandé la réinitialisation de votre mot de passe sur <strong>Chaml.fr</strong>.</p>
                  <p>Veuillez cliquer sur le bouton ci-dessous pour choisir un nouveau mot de passe (ce lien est valable 1 heure) :</p>
                  <p style="margin: 2rem 0;">
                    <a href="${resetLink}" style="background: #0d9488; color: white; padding: 0.8rem 1.5rem; text-decoration: none; border-radius: 0.5rem; font-weight: bold;">Réinitialiser mon mot de passe</a>
                  </p>
                  <p>Si le bouton ne fonctionne pas, copiez-collez ce lien dans votre navigateur :<br/>${resetLink}</p>
                  <p>Si vous n'êtes pas à l'origine de cette demande, vous pouvez ignorer cet e-mail en toute sécurité.</p>
                  <p>Cordialement,<br/>L'équipe Chaml.fr</p>`;

    await sendSystemEmail(user.email, subject, text, html);
    await logAction("Password Reset Requested", `Token generated for: ${user.email}`, user.email);

    res.json({ success: true, message: "Si cette adresse existe, un email a été envoyé." });
  } catch (err) {
    console.error("❌ Forgot password endpoint error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Perform Password Reset (Submit new password)
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) {
    return res.status(400).json({ error: "Le jeton et le nouveau mot de passe sont requis." });
  }

  try {
    const userRes = await query(
      "SELECT * FROM users WHERE reset_password_token = $1 AND reset_password_expires > CURRENT_TIMESTAMP",
      [token]
    );

    if (userRes.rows.length === 0) {
      return res.status(400).json({ error: "Le lien de réinitialisation est invalide ou a expiré." });
    }

    const user = userRes.rows[0];
    const passwordHash = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token fields
    await query(
      "UPDATE users SET password_hash = $1, reset_password_token = NULL, reset_password_expires = NULL WHERE id = $2",
      [passwordHash, user.id]
    );

    await logAction("Password Reset Success", `Password changed for: ${user.email}`, user.email);

    res.json({ success: true, message: "Votre mot de passe a été modifié avec succès. Vous pouvez maintenant vous connecter." });
  } catch (err) {
    console.error("❌ Reset password endpoint error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET Email Verification Link Redirect (Real link clicks)
app.get("/api/auth/verify-email", async (req, res) => {
  const { coupleId } = req.query;
  if (!coupleId) return res.status(400).send("Lien d'activation invalide.");
  try {
    // Set both email verified and approved automatically upon email confirmation
    await query("UPDATE users SET is_email_verified = true, is_approved = true WHERE couple_id = $1", [coupleId]);
    await query("UPDATE couples SET is_approved = true WHERE id = $1", [coupleId]);
    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    let fallbackUrl = `${protocol}://${host}`;
    if (host.includes("localhost:5000")) {
      fallbackUrl = "http://localhost:5173";
    }
    const clientUrl = process.env.CLIENT_URL || fallbackUrl;
    res.redirect(`${clientUrl}/?verified=true`);
  } catch (err) {
    res.status(500).send("Erreur lors de la validation de l'e-mail: " + err.message);
  }
});

// Resend Verification Email Endpoint with Rate Limiting (60s Cooldown)
const resendCooldownMap = new Map();

app.post("/api/auth/resend-verification-email", async (req, res) => {
  const { coupleId, email } = req.body;
  if (!coupleId && !email) {
    return res.status(400).json({ error: "Missing couple ID or email." });
  }

  const lookupKey = coupleId || email;
  const now = Date.now();
  const lastSent = resendCooldownMap.get(lookupKey);

  // Enforce 60-second cooldown between resends
  if (lastSent && (now - lastSent < 60000)) {
    const remainingSec = Math.ceil((60000 - (now - lastSent)) / 1000);
    return res.status(429).json({ 
      error: `Veuillez patienter ${remainingSec} secondes avant de renvoyer un nouvel e-mail.` 
    });
  }

  try {
    const userRes = await query(
      "SELECT id, email, first_name, last_name, couple_id, is_email_verified FROM users WHERE couple_id = $1 OR email = $2 ORDER BY created_at ASC LIMIT 1",
      [coupleId || "", email || ""]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Aucun compte correspondant n'a été trouvé." });
    }

    const user = userRes.rows[0];
    if (user.is_email_verified) {
      return res.status(400).json({ error: "Ce compte a déjà été vérifié." });
    }

    const protocol = req.headers["x-forwarded-proto"] || req.protocol;
    const host = req.headers["x-forwarded-host"] || req.get("host");
    let fallbackUrl = `${protocol}://${host}`;
    if (host.includes("localhost:5000")) fallbackUrl = "http://localhost:5173";
    const baseUrl = process.env.CLIENT_URL || fallbackUrl;
    const activationUrl = `${baseUrl}/api/auth/verify-email?coupleId=${user.couple_id}`;

    await sendSystemEmail(
      user.email,
      "Chaml.fr - Activez votre compte de regroupement familial",
      `Bonjour ${user.first_name},\n\nVeuillez activer votre dossier Chaml.fr en cliquant sur ce lien :\n${activationUrl}`,
      `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #0d9488; text-align: center;">🕌 Bienvenue sur Chaml.fr</h2>
          <p>Bonjour <strong>${user.first_name} ${user.last_name}</strong>,</p>
          <p>Voici votre nouveau lien de confirmation pour activer votre compte sur Chaml.fr :</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${activationUrl}" style="background-color: #0d9488; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Activer mon compte</a>
          </div>
          <p style="font-size: 0.85rem; color: #64748b;">Si le bouton ne fonctionne pas, copiez-collez ce lien :<br/>${activationUrl}</p>
        </div>
      `
    );

    resendCooldownMap.set(lookupKey, now);
    await logAction("Resend Activation Email", `Resent activation link to ${user.email}`, user.email);
    res.json({ success: true, email: user.email });
  } catch (err) {
    console.error("❌ Resend verification email failed:", err.message);
    res.status(500).json({ error: err.message || "Impossible d'envoyer l'e-mail pour le moment." });
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
    const usersRes = await query("SELECT first_name, last_name, role, city, department, email, phone, password_hash FROM users WHERE couple_id = $1", [coupleId]);
    const docsRes = await query("SELECT * FROM documents WHERE couple_id = $1 ORDER BY id ASC", [coupleId]);

    const decryptedUsers = usersRes.rows.map(decryptUserObject);
    const demandeur = decryptedUsers.find(u => u.role === "demandeur") || {};
    const beneficiaire = decryptedUsers.find(u => u.role === "beneficiaire") || null;

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
        isPremium: coupleRes.rows[0].is_premium,
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
app.post("/api/dossier/upload", authenticateUser, (req, res, next) => {
  upload.single("file")(req, res, (err) => {
    if (err) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({ error: "file_too_large", message: "La taille maximale du fichier est limitée à 15 Mo." });
      }
      if (err.code === "ONLY_PDF_ALLOWED" || err.message?.includes("PDF")) {
        return res.status(400).json({ error: "pdf_only", message: "Seuls les fichiers au format PDF (.pdf) sont autorisés." });
      }
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  const { docKey, owner } = req.body;
  if (!docKey || !req.file) {
    return res.status(400).json({ error: "Missing document key or file payload." });
  }
  const coupleId = req.user.coupleId;

  // Strict extension check
  const ext = path.extname(req.file.originalname).toLowerCase();
  if (ext !== ".pdf") {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: "pdf_only", message: "Seuls les fichiers au format PDF (.pdf) sont autorisés." });
  }

  try {
    const coupleRes = await query("SELECT is_premium, dossier_status FROM couples WHERE id = $1", [coupleId]);
    if (coupleRes.rows[0]?.dossier_status === "submitted") {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(403).json({ error: "dossier_locked", message: "Le dossier est actuellement soumis et verrouillé. Déverrouillez-le pour pouvoir modifier les pièces." });
    }

    if (owner === "beneficiaire" && !coupleRes.rows[0]?.is_premium) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(402).json({ error: "premium_required", message: "Le statut Premium est requis pour téléverser les pièces du conjoint." });
    }

    await query(`
      UPDATE documents
      SET uploaded = true, file_name = $1, file_path = $2, uploaded_at = CURRENT_TIMESTAMP, status = 'under_review', comment = NULL
      WHERE couple_id = $3 AND doc_key = $4
    `, [req.file.originalname, req.file.path, coupleId, docKey]);

    await logAction("Document Uploaded", `Uploaded file ${req.file.originalname} for document: ${docKey}`, req.user.email);
    res.json({ success: true, fileName: req.file.originalname });
  } catch (err) {
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
    res.status(500).json({ error: err.message });
  }
});

// Delete Document File API
app.post("/api/dossier/delete", authenticateUser, async (req, res) => {
  const { docKey } = req.body;
  const coupleId = req.user.coupleId;
  if (!docKey) return res.status(400).json({ error: "Missing docKey parameter." });

  try {
    const coupleRes = await query("SELECT dossier_status FROM couples WHERE id = $1", [coupleId]);
    if (coupleRes.rows[0]?.dossier_status === "submitted") {
      return res.status(403).json({ error: "dossier_locked", message: "Le dossier est actuellement soumis et verrouillé. Déverrouillez-le pour pouvoir modifier les pièces." });
    }

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
  const { lang = "fr" } = req.body;

  if (req.user.role !== "demandeur") {
    return res.status(403).json({ error: "demandeur_only", message: "Seul le demandeur en France est autorisé à soumettre le dossier." });
  }

  try {
    await query("UPDATE couples SET dossier_status = 'submitted', submitted_at = CURRENT_TIMESTAMP WHERE id = $1", [coupleId]);
    await logAction("Dossier Submitted", `Dossier submitted to authorities for couple ID: ${coupleId}`, req.user.email);

    // Fetch user details for sending confirmation email
    const userRes = await query("SELECT email, first_name, last_name FROM users WHERE id = $1", [req.user.id]);
    if (userRes.rows.length > 0) {
      const u = decryptUserObject(userRes.rows[0]);
      const userEmail = u.email;
      const firstName = u.first_name || u.firstName || "Demandeur";
      const lastName = u.last_name || u.lastName || "";
      const fullName = `${firstName} ${lastName}`.trim();

      if (isSMTPAvailable) {
        try {
          const isAr = lang === "ar";
          const isEn = lang === "en";

          const subject = isAr 
            ? "🚀 Chaml.fr - تأكيد تقديم ملفكم بنجاح (الجمع العائلي)"
            : isEn
            ? "🚀 Chaml.fr - Application Submission Confirmation (Family Reunification)"
            : "🚀 Chaml.fr - Confirmation de soumission de votre dossier (Regroupement Familial)";

          const textMsg = isAr
            ? `مرحباً ${firstName}،\n\nتهانينا! تم تأكيد وتقديم ملفكم الخاص بالجمع العائلي بنجاح على منصة Chaml.fr.\n\nالخطوات التالية الموصى بها:\n1. تقديم طلبكم الرسمي على بوابة الدولة: https://administration-etrangers-en-france.interieur.gouv.fr (ANEF) أو إرساله عبر البريد المضمون إلى مكتب الهجرة (OFII).\n2. تحميل ملخص ملفكم والوثائق الموثقة من لوحة التحكم الخاصة بكم.\n\nرابط لوحة التحكم: https://chaml.fr/?view=login\n\nفريق Chaml.fr`
            : isEn
            ? `Hello ${firstName},\n\nCongratulations! Your family reunification application has been successfully marked as submitted on Chaml.fr.\n\nRecommended Next Steps:\n1. File your official application on the state portal: https://administration-etrangers-en-france.interieur.gouv.fr (ANEF) or mail your file via registered mail to your territorial OFII office.\n2. Download your certified summary and documents from your dashboard.\n\nDashboard link: https://chaml.fr/?view=login\n\nBest regards,\nThe Chaml.fr Team`
            : `Bonjour ${firstName},\n\nFélicitations ! Votre dossier de regroupement familial a été marqué comme soumis avec succès sur Chaml.fr.\n\nProchaines étapes recommandées :\n1. Déposez votre demande officielle sur le portail ANEF (https://administration-etrangers-en-france.interieur.gouv.fr) ou transmettez votre dossier par courrier AR à l'OFII de votre département.\n2. Téléchargez votre fiche récapitulative et vos pièces justificatives certifiées depuis votre tableau de bord.\n\nAccéder au Tableau de Bord : https://chaml.fr/?view=login\n\nCordialement,\nL'équipe Chaml.fr`;

          const dir = isAr ? "rtl" : "ltr";
          const textAlign = isAr ? "right" : "left";

          const htmlMsg = `
            <!DOCTYPE html>
            <html lang="${lang}" dir="${dir}">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); text-align: ${textAlign};">
                      
                      <!-- Header Banner -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%); padding: 32px 28px; text-align: center;">
                          <div style="font-size: 32px; margin-bottom: 6px;">🕌</div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0; tracking: 0.5px;">Chaml.fr</h1>
                          <p style="color: #99f6e4; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                            ${isAr ? "المنصة المستقلة للم الشمل العائلي" : isEn ? "Family Reunification Platform" : "Plateforme de Regroupement Familial"}
                          </p>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 32px 28px; direction: ${dir};">
                          
                          <!-- Status Badge -->
                          <div style="background-color: #f0fdf4; border: 1px solid #6ee7b7; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
                            <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 8px;">
                              ✓ ${isAr ? "ملف موثق ومقدم" : isEn ? "Certified & Submitted File" : "Dossier Certifié & Soumis"}
                            </span>
                            <h2 style="color: #065f46; font-size: 20px; margin: 6px 0 0 0; font-weight: 800;">
                              ${isAr ? "تهانينا! تم تأكيد تقديم ملفكم بنجاح" : isEn ? "Congratulations! Application Submitted Successfully" : "Félicitations ! Dossier soumis avec succès"}
                            </h2>
                          </div>

                          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0;">
                            ${isAr ? `مرحباً <strong>${fullName}</strong>،` : isEn ? `Hello <strong>${fullName}</strong>,` : `Bonjour <strong>${fullName}</strong>,`}
                          </p>

                          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                            ${isAr 
                              ? "يسرنا إبلاغكم بأن جميع الوثائق المطلوبة لملفكم قد تم فحصها وتوثيقها، وتم تسجيل تقديم ملفكم بنجاح على منصة Chaml.fr." 
                              : isEn 
                              ? "We are pleased to inform you that all required documents for your application have been verified, certified, and officially marked as submitted on Chaml.fr." 
                              : "Nous avons le plaisir de vous informer que toutes les pièces justificatives de votre dossier ont été vérifiées, certifiées et enregistrées comme <strong>soumises</strong> sur la plateforme Chaml.fr."}
                          </p>

                          <!-- Instructions Box -->
                          <div style="background-color: #f8fafc; border-left: 4px solid #0d9488; border-radius: 8px; padding: 20px; margin: 24px 0;">
                            <h3 style="color: #0f766e; font-size: 16px; margin: 0 0 12px 0;">
                              📍 ${isAr ? "الخطوات النهائية لاستكمال معاملتكم لدى السلطات الفرنسية:" : isEn ? "Final Official Submission Steps:" : "Prochaines étapes officielles auprès de l'Administration :"}
                            </h3>
                            <ul style="margin: 0; padding-${isAr ? "right" : "left"}: 20px; color: #334155; font-size: 14px; line-height: 1.7;">
                              <li style="margin-bottom: 10px;">
                                <strong>${isAr ? "الخطوة 1 - البوابة الرسمية للدولة (ANEF):" : isEn ? "Step 1 - Official State Portal (ANEF):" : "Étape 1 - Portail Officiel ANEF :"}</strong><br />
                                ${isAr 
                                  ? "قم بإجراء طلبك الإلكتروني الرسمي عبر بوابة الدولة الفرنسية (ANEF) أو قم بإرسال الملف الورقي عبر البريد المضمون (LRAR) إلى المديرية الإقليمية لـ OFII التابع لها سكنك." 
                                  : isEn 
                                  ? "Submit your official application online on the French State Portal (ANEF) or mail your complete file via registered mail (LRAR) to your territorial OFII office." 
                                  : "Effectuez votre télédéclaration officielle en ligne sur le portail de l'État (ANEF) ou transmettez votre dossier complet par courrier recommandé avec accusé de réception (LRAR) à la direction territoriale de l'OFII de votre logement."}
                              </li>
                              <li>
                                <strong>${isAr ? "الخطوة 2 - لوحة التحكم والوثائق الموثقة:" : isEn ? "Step 2 - Dashboard & Certified Files:" : "Étape 2 - Fiche Récapitulative & Pièces Certifiées :"}</strong><br />
                                ${isAr 
                                  ? "يمكنك تحميل كشف الحساب الموثق وجميع مستنداتك المشفرة مباشرة من لوحة التحكم الخاصة بك في أي وقت." 
                                  : isEn 
                                  ? "Download your certified summary sheet and encrypted documents directly from your Chaml.fr dashboard at any time." 
                                  : "Téléchargez votre fiche récapitulative certifiée et l'ensemble de vos documents chiffrés directement depuis votre espace client."}
                              </li>
                            </ul>
                          </div>

                          <!-- Call To Action Buttons -->
                          <div style="text-align: center; margin: 32px 0 24px 0;">
                            <a href="https://chaml.fr/?view=login" target="_blank" style="background-color: #0d9488; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3); margin-bottom: 12px;">
                              🚀 ${isAr ? "الدخول إلى لوحة التحكم Chaml.fr" : isEn ? "Access My Chaml.fr Dashboard" : "Accéder à mon Tableau de Bord Chaml.fr"}
                            </a>
                            <br />
                            <a href="https://administration-etrangers-en-france.interieur.gouv.fr" target="_blank" style="color: #0d9488; font-size: 13px; font-weight: bold; text-decoration: underline; display: inline-block; margin-top: 6px;">
                              🏛️ ${isAr ? "الانتقال إلى البوابة الرسمية للدولة (ANEF)" : isEn ? "Go to Official French State Portal (ANEF)" : "Accéder au Portail Officiel ANEF (État Français)"}
                            </a>
                          </div>

                          <!-- Security Note -->
                          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; text-align: center;">
                            🔒 ${isAr ? "تشفير عالي الأمان AES-256 واحترام تام لخصوصية البيانات (RGPD)" : isEn ? "High Security AES-256 Encryption & GDPR Compliant" : "Sécurité accrue : Données chiffrées AES-256 & Conformité RGPD"}
                          </div>

                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
                          <p style="margin: 0 0 6px 0; font-weight: bold; color: #334155;">Chaml.fr</p>
                          <p style="margin: 0 0 12px 0;">
                            ${isAr 
                              ? "منصة مرافقة معاملة الجمع العائلي في فرنسا" 
                              : isEn 
                              ? "Family Reunification Guidance Platform in France" 
                              : "Plateforme d'accompagnement au regroupement familial en France"}
                          </p>
                          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            ${isAr 
                              ? "تم إرسال هذا البريد الإلكتروني تلقائياً نتيجة تقديم ملفكم. للمساعدة، يرجى التواصل مع support@chaml.fr" 
                              : isEn 
                              ? "This email was automatically generated following your application submission. For assistance, contact support@chaml.fr" 
                              : "Cet e-mail a été généré automatiquement suite à la soumission de votre dossier. Pour toute assistance, contactez support@chaml.fr"}
                          </p>
                          <p style="margin: 10px 0 0 0; font-size: 11px; color: #cbd5e1;">
                            © 2026 Chaml.fr. Tous droits réservés.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `;

          await sendSystemEmail(userEmail, subject, textMsg, htmlMsg);
          console.log(`✉️ Multilingual submission confirmation email sent to ${userEmail} (${lang})`);
        } catch (emailErr) {
          console.error("❌ Failed to send submission email:", emailErr.message);
        }
      }
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Re-open / Unlock Dossier for modification
app.post("/api/dossier/reopen", authenticateUser, async (req, res) => {
  const coupleId = req.user.coupleId;
  if (req.user.role !== "demandeur") {
    return res.status(403).json({ error: "demandeur_only", message: "Seul le demandeur en France est autorisé à déverrouiller le dossier." });
  }

  try {
    await query("UPDATE couples SET dossier_status = 'draft', submitted_at = NULL WHERE id = $1", [coupleId]);
    await logAction("Dossier Reopened", `Dossier reopened for modification for couple ID: ${coupleId}`, req.user.email);
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

    const decryptedUsers = usersRes.rows.map(decryptUserObject);

    // Map couples with their corresponding spouses and document checklists
    const result = couplesRes.rows.map(c => {
      const demandeur = decryptedUsers.find(u => u.couple_id === c.id && u.role === "demandeur") || {};
      const beneficiaire = decryptedUsers.find(u => u.couple_id === c.id && u.role === "beneficiaire") || null;
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
    await query(`
      UPDATE couples 
      SET is_approved = true, dossier_status = 'approved', dossier_completed_at = CURRENT_TIMESTAMP 
      WHERE id = $1
    `, [coupleId]);
    await query("UPDATE users SET is_approved = true WHERE couple_id = $1", [coupleId]);
    await logAction("Account Approved", `Approved couple accounts for ID: ${coupleId}`, req.user.email);

    // Send confirmation email to applicant
    const userRes = await query("SELECT email, first_name FROM users WHERE couple_id = $1 AND role = 'demandeur'", [coupleId]);
    if (userRes.rows.length > 0) {
      const { email, first_name } = userRes.rows[0];
      try {
        await sendSystemEmail(
          email,
          "Chaml.fr - Votre dossier de regroupement familial a été validé ! 🎉",
          `Bonjour ${first_name},\n\nExcellente nouvelle ! Votre dossier de regroupement familial a été validé par notre équipe.\n\nNotez que pour des raisons de confidentialité et de sécurité RGPD, toutes vos pièces justificatives cryptées seront définitivement supprimées de nos serveurs 30 jours après cette approbation.\n\nL'équipe Chaml.fr`,
          `
            <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0d9488; text-align: center;">🎉 Dossier Validé !</h2>
              <p>Bonjour <strong>${first_name}</strong>,</p>
              <p>Nous avons le plaisir de vous informer que votre dossier de regroupement familial partagé a été validé et approuvé avec succès par notre équipe.</p>
              <p>Vous pouvez dès maintenant télécharger votre dossier complet et le soumettre à l'OFII.</p>
              <div style="background-color: #f8fafc; border-left: 4px solid #ef4444; padding: 12px; margin: 20px 0; border-radius: 4px;">
                <strong style="color: #ef4444; display: block; margin-bottom: 0.25rem;">⚠️ Avis de confidentialité (RGPD) :</strong>
                Pour garantir la sécurité absolue de vos données, <strong>toutes vos pièces justificatives cryptées seront définitivement détruites</strong> de nos serveurs dans un délai de 30 jours. Pensez à conserver vos copies locales.
              </div>
              <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
              <p style="font-size: 0.85rem; text-align: center; color: #94a3b8;">L'équipe Chaml.fr - Reuniting your family, without borders</p>
            </div>
          `
        );
        console.log(`✉️ Approval email sent successfully to ${email}`);
      } catch (mailErr) {
        console.error("Failed to send approval email. Details:", mailErr.message);
      }
    }

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

  const { email, firstName, lastName, phone, city, channel = "email" } = req.body;
  if (!firstName || !lastName) {
    return res.status(400).json({ error: "Prénom et nom requis." });
  }

  if (channel === "email" && !email) {
    return res.status(400).json({ error: "L'adresse e-mail est requise pour l'envoi par e-mail." });
  }

  const cleanPhone = (phone || "").replace(/[^\d+]/g, "");
  if (channel === "whatsapp" && !cleanPhone) {
    return res.status(400).json({ error: "Le numéro de téléphone est requis pour l'envoi par WhatsApp." });
  }

  // Use real email or auto-generated unique placeholder email for WhatsApp
  const targetEmail = (email && email.trim()) 
    ? email.trim() 
    : `spouse_${cleanPhone.replace("+", "")}_${Date.now()}@chaml.local`;

  try {
    const coupleRes = await query("SELECT is_premium FROM couples WHERE id = $1", [req.user.coupleId]);
    if (!coupleRes.rows[0]?.is_premium) {
      return res.status(402).json({ error: "premium_required", message: "Le statut Premium est requis pour inviter votre conjoint." });
    }

    // Check if couple already has a spouse
    const partnerCheck = await query("SELECT id FROM users WHERE couple_id = $1 AND role = 'beneficiaire'", [req.user.coupleId]);
    if (partnerCheck.rows.length > 0) {
      return res.status(400).json({ error: "Un conjoint a déjà été invité ou créé pour ce dossier." });
    }

    // Check if email already exists in users table
    if (email && email.trim()) {
      const emailCheck = await query("SELECT id FROM users WHERE email = $1", [targetEmail]);
      if (emailCheck.rows.length > 0) {
        return res.status(400).json({ error: "Cette adresse e-mail est déjà utilisée." });
      }
    }

    const userId = `user_ma_${Date.now()}`;

    // Insert user in pending_invite state (password_hash = 'INVITATION_PENDING')
    await query(`
      INSERT INTO users (id, email, password_hash, role, couple_id, first_name, last_name, phone, city, is_approved, is_email_verified)
      VALUES ($1, $2, 'INVITATION_PENDING', 'beneficiaire', $3, $4, $5, $6, $7, true, false)
    `, [
      userId, 
      targetEmail, 
      req.user.coupleId, 
      encryptPII(firstName), 
      encryptPII(lastName), 
      encryptPII(phone || ""), 
      encryptPII(city || "")
    ]);

    await logAction("Spouse Invited", `Invited spouse ${targetEmail} via ${channel} to join couple: ${req.user.coupleId}`, req.user.email);

    // Fetch inviter's real decrypted name
    const inviterRes = await query("SELECT first_name, last_name FROM users WHERE id = $1", [req.user.id]);
    let inviterName = "Votre conjoint(e)";
    if (inviterRes.rows.length > 0) {
      const inviter = decryptUserObject(inviterRes.rows[0]);
      if (inviter.first_name) {
        inviterName = `${inviter.first_name} ${inviter.last_name || ""}`.trim();
      }
    }

    const inviteUrl = `https://www.chaml.fr/?inviteCoupleId=${req.user.coupleId}&inviteEmail=${encodeURIComponent(targetEmail)}`;
    const waText = `Bonjour ${firstName}, ${inviterName} vous invite à le/la rejoindre sur Chaml.fr pour préparer votre dossier de regroupement familial.\n\nCliquez sur ce lien pour activer votre accès :\n${inviteUrl}`;
    const whatsappUrl = `https://wa.me/${cleanPhone.replace("+", "")}?text=${encodeURIComponent(waText)}`;

    // Send real invitation email ONLY if channel is email AND email is valid (not placeholder)
    if (isSMTPAvailable && channel === "email" && !targetEmail.endsWith("@chaml.local")) {
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

        const mailOptions = {
          from: `"${c.smtp_sender_name}" <${c.smtp_sender_email}>`,
          to: email,
          subject: `🕌 Chaml.fr - ${inviterName} vous invite à rejoindre votre dossier conjoint`,
          text: `Bonjour ${firstName},\n\nVotre conjoint(e) ${inviterName} vous invite à le/la rejoindre sur Chaml.fr pour préparer votre dossier de regroupement familial.\n\nVeuillez accepter l'invitation et choisir votre mot de passe en cliquant sur le lien suivant :\n${inviteUrl}\n\nUne fois votre mot de passe créé, vous aurez accès immédiatement à votre tableau de bord.\n\nCordialement,\nL'équipe Chaml.fr`,
          html: `
            <!DOCTYPE html>
            <html lang="fr" dir="ltr">
            <head>
              <meta charset="UTF-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; background-color: #0f172a; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 30px 10px;">
                <tr>
                  <td align="center">
                    <table role="presentation" width="100%" style="max-width: 620px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3); text-align: left;">
                      
                      <!-- Header Banner -->
                      <tr>
                        <td style="background: linear-gradient(135deg, #0f172a 0%, #0d9488 100%); padding: 32px 28px; text-align: center;">
                          <div style="font-size: 32px; margin-bottom: 6px;">🕌</div>
                          <h1 style="color: #ffffff; font-size: 24px; font-weight: 800; margin: 0;">Chaml.fr</h1>
                          <p style="color: #99f6e4; font-size: 13px; margin: 4px 0 0 0; text-transform: uppercase; letter-spacing: 1px; font-weight: 600;">
                            Plateforme de Regroupement Familial
                          </p>
                        </td>
                      </tr>

                      <!-- Body Content -->
                      <tr>
                        <td style="padding: 32px 28px;">
                          
                          <!-- Status Badge -->
                          <div style="background-color: #f0fdf4; border: 1px solid #6ee7b7; border-radius: 12px; padding: 16px; text-align: center; margin-bottom: 24px;">
                            <span style="background-color: #10b981; color: #ffffff; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: inline-block; margin-bottom: 8px;">
                              💌 Invitation Reçue
                            </span>
                            <h2 style="color: #065f46; font-size: 20px; margin: 6px 0 0 0; font-weight: 800;">
                              Rejoignez votre conjoint(e) sur Chaml.fr
                            </h2>
                          </div>

                          <p style="font-size: 16px; line-height: 1.6; color: #1e293b; margin-top: 0;">
                            Bonjour <strong>${firstName} ${lastName}</strong>,
                          </p>

                          <p style="font-size: 15px; line-height: 1.6; color: #334155;">
                            Votre conjoint(e) <strong>${inviterName}</strong> vous invite à rejoindre son dossier conjoint sur Chaml.fr afin de collaborer et rassembler vos pièces justificatives pour votre demande de regroupement familial.
                          </p>

                          <!-- Call To Action Button -->
                          <div style="text-align: center; margin: 32px 0 24px 0;">
                            <a href="${inviteUrl}" target="_blank" style="background-color: #0d9488; color: #ffffff; padding: 14px 28px; border-radius: 8px; font-weight: bold; font-size: 15px; text-decoration: none; display: inline-block; box-shadow: 0 4px 12px rgba(13, 148, 136, 0.3);">
                              🔐 Définir mon mot de passe et rejoindre le dossier
                            </a>
                          </div>

                          <!-- Security Note -->
                          <div style="background-color: #f1f5f9; border-radius: 8px; padding: 12px 16px; font-size: 12px; color: #64748b; text-align: center;">
                            🔒 Sécurité & Confidentialité : Vos pièces justificatives sont chiffrées de bout en bout (AES-256)
                          </div>

                        </td>
                      </tr>

                      <!-- Footer -->
                      <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 24px 28px; text-align: center; font-size: 12px; color: #64748b; line-height: 1.6;">
                          <p style="margin: 0 0 6px 0; font-weight: bold; color: #334155;">Chaml.fr</p>
                          <p style="margin: 0 0 12px 0;">Plateforme d'accompagnement au regroupement familial en France</p>
                          <p style="margin: 0; font-size: 11px; color: #94a3b8;">
                            Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br />
                            <a href="${inviteUrl}" style="color: #0d9488;">${inviteUrl}</a>
                          </p>
                          <p style="margin: 10px 0 0 0; font-size: 11px; color: #cbd5e1;">
                            © 2026 Chaml.fr. Tous droits réservés.
                          </p>
                        </td>
                      </tr>

                    </table>
                  </td>
                </tr>
              </table>
            </body>
            </html>
          `
        };

        await transporter.sendMail(mailOptions);
        console.log(`✉️ Spouse invitation email sent to ${email}`);
      } catch (mailErr) {
        console.error("Failed to send spouse invitation email:", mailErr.message);
      }
    }

    res.json({ success: true, channel, whatsappUrl, inviteUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Accept Spouse Invitation Route
app.post("/api/auth/accept-invite", async (req, res) => {
  const { coupleId, email, password } = req.body;
  if (!coupleId || !email || !password) {
    return res.status(400).json({ error: "Champs requis manquants." });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    // Find pending spouse user by coupleId & role = 'beneficiaire' & password_hash = 'INVITATION_PENDING' or by email
    const userRes = await query(
      "SELECT id, email FROM users WHERE couple_id = $1 AND role = 'beneficiaire' AND (email = $2 OR password_hash = 'INVITATION_PENDING')",
      [coupleId, cleanEmail]
    );

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: "Invitation invalide ou expirée." });
    }

    const userId = userRes.rows[0].id;

    // Check if new email is taken by another account
    if (userRes.rows[0].email !== cleanEmail) {
      const existingEmail = await query("SELECT id FROM users WHERE email = $1 AND id != $2", [cleanEmail, userId]);
      if (existingEmail.rows.length > 0) {
        return res.status(400).json({ error: "Cette adresse e-mail est déjà associée à un autre compte." });
      }
    }

    const hash = await bcrypt.hash(password, 10);
    await query(
      "UPDATE users SET email = $1, password_hash = $2, is_email_verified = true WHERE id = $3",
      [cleanEmail, hash, userId]
    );

    await logAction("Spouse Activated", `Spouse completed account setup for: ${cleanEmail}`, cleanEmail);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Cancel / Reset Pending Spouse Invitation Route
app.post("/api/dossier/cancel-invite", authenticateUser, async (req, res) => {
  if (req.user.role !== "demandeur") {
    return res.status(403).json({ error: "Seul le demandeur peut annuler l'invitation." });
  }
  const coupleId = req.user.coupleId;

  try {
    await query(
      "DELETE FROM users WHERE couple_id = $1 AND role = 'beneficiaire' AND password_hash = 'INVITATION_PENDING'",
      [coupleId]
    );
    await logAction("Spouse Invitation Cancelled", `Cancelled pending spouse invitation for couple: ${coupleId}`, req.user.email);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// AUTO-DESTRUCT CRON JOB (Daily at 2:00 AM)
// ----------------------------------------------------
const startAutoDestructCron = () => {
  cron.schedule("0 2 * * *", async () => {
    console.log("⏰ Daily Auto-Destruct Cron starting...");
    try {
      // 1. Process Day 25 Warning Alerts
      const alertRes = await query(`
        SELECT c.id, u.email, u.first_name 
        FROM couples c
        JOIN users u ON u.couple_id = c.id
        WHERE c.dossier_status = 'approved'
          AND c.dossier_completed_at IS NOT NULL
          AND c.dossier_completed_at <= NOW() - INTERVAL '25 days'
          AND c.deletion_alert_sent = false
          AND u.role = 'demandeur'
      `);

      for (const row of alertRes.rows) {
        const { id, email, first_name } = row;
        try {
          await sendSystemEmail(
            email,
            "Chaml.fr - Alerte de suppression définitive de vos pièces justificatives",
            `Bonjour ${first_name},\n\nConformément à nos engagements de confidentialité, toutes vos pièces justificatives cryptées associées à votre dossier seront définitivement supprimées de nos serveurs dans 5 jours.\n\nSi vous ne les avez pas sauvegardées localement, veuillez vous connecter et le faire dès maintenant.\n\nL'équipe Chaml.fr`,
            `
              <div style="font-family: Arial, sans-serif; line-height: 1.6; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                <h2 style="color: #ef4444; text-align: center;">⚠️ Alerte de Suppression (RGPD)</h2>
                <p>Bonjour <strong>${first_name}</strong>,</p>
                <p>Conformément à notre engagement de confidentialité et à la réglementation RGPD, nous vous rappelons que votre dossier de regroupement familial a été validé il y a 25 jours.</p>
                <p>Par conséquent, <strong>tous vos documents justificatifs cryptés téléversés sur Chaml.fr seront définitivement supprimés dans 5 jours</strong>.</p>
                <p>Si vous n'avez pas encore téléchargé et enregistré les copies décryptées de vos fichiers sur votre ordinateur, nous vous invitons à le faire dès maintenant.</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="https://chaml.fr/dashboard" style="background-color: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Accéder à mon espace</a>
                </div>
                <p style="font-size: 0.82rem; color: #64748b; font-style: italic;">Après suppression, ces fichiers seront irrécupérables car nous ne stockons aucun historique ni sauvegarde en clair.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;"/>
                <p style="font-size: 0.85rem; text-align: center; color: #94a3b8;">L'équipe Chaml.fr - Reuniting your family, without borders</p>
              </div>
            `
          );
          await query("UPDATE couples SET deletion_alert_sent = true WHERE id = $1", [id]);
          console.log(`✉️ Deletion alert email sent successfully to ${email}`);
        } catch (alertErr) {
          console.error(`Failed to send deletion alert for couple ${id}:`, alertErr.message);
        }
      }

      // 2. Process Day 30 Purge and Auto-Destruct
      const purgeRes = await query(`
        SELECT id FROM couples 
        WHERE dossier_status = 'approved' 
          AND dossier_completed_at IS NOT NULL 
          AND dossier_completed_at <= NOW() - INTERVAL '30 days'
      `);
      
      for (const row of purgeRes.rows) {
        const coupleId = row.id;
        
        const docRes = await query(
          "SELECT id, file_path, file_name FROM documents WHERE couple_id = $1 AND uploaded = true",
          [coupleId]
        );
        
        let deletedCount = 0;
        for (const doc of docRes.rows) {
          if (doc.file_path) {
            try {
              if (fs.existsSync(doc.file_path)) {
                fs.unlinkSync(doc.file_path);
                deletedCount++;
              }
            } catch (fileErr) {
              console.error(`Failed to physically delete file ${doc.file_path}:`, fileErr.message);
            }
          }
        }
        
        if (deletedCount > 0 || docRes.rows.length > 0) {
          await query(`
            UPDATE documents
            SET uploaded = false, file_name = NULL, file_path = NULL, uploaded_at = NULL, status = 'pending', comment = 'Fichier supprimé automatiquement (Purge 30 jours)'
            WHERE couple_id = $1 AND uploaded = true
          `, [coupleId]);
          
          await query(
            "INSERT INTO audit_logs (action, details, user_email) VALUES ($1, $2, $3)",
            ["Auto-Destruct Purge", `Auto-deleted ${deletedCount} files for completed couple ${coupleId} (30 days threshold)`, "system-cron@chaml.fr"]
          );
          console.log(`🗑️ Purged ${deletedCount} files for completed couple ${coupleId}`);
        }
      }
    } catch (err) {
      console.error("❌ Auto-Destruct Cron failed:", err.message);
    }
  });
  console.log("⏰ Auto-Destruct Cron scheduled daily at 2:00 AM.");
};

// Start Express Server
initializeDatabase().then(() => {
  seedDatabase().then(() => {
    checkSMTP().then(() => {
      startAutoDestructCron();
      app.listen(PORT, () => {
        console.log(`Chaml backend running on http://localhost:${PORT}`);
      });
    });
  });
});
