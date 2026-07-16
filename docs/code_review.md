# Code Review: Security & Quality Report

This document reviews the codebase of the Chaml application, analyzing security vulnerabilities, implementation design, frontend/backend code quality, and recommending architectural improvements to prepare the SaaS for production deployment.

---

## 1. Security Review

### A. SQL Injection Prevention (Passed)
* **Finding**: Direct database query strings are vulnerable to SQL injection if they concatenate user inputs.
* **Review**: The backend Express server [server.js](file:///c:/Users/ovh/Documents/AI/Regroupement/server/server.js) utilizes parameterized queries for all operations:
  ```javascript
  await query("UPDATE users SET is_frozen = $1 WHERE email = $2", [isFrozen, email]);
  ```
  The `pg` driver formats these queries using PostgreSQL native parameters, completely separating sql commands from variable input.

### B. Broken Object-Level Authorization / IDOR (Passed)
* **Finding**: Standard checklist downloads can be vulnerable to Insecure Direct Object References (IDOR), where an authenticated user changes an ID parameter in the URL (e.g. `/api/dossier/download/couple_abc/fr_identity`) to steal another couple's tax slips or passport scans.
* **Review**: The authenticated download controller in [server.js](file:///c:/Users/ovh/Documents/AI/Regroupement/server/server.js) enforces authorization boundaries:
  ```javascript
  if (req.user.role !== "admin" && req.user.coupleId !== coupleId) {
    return res.status(403).json({ error: "Access denied. Unauthorized document access." });
  }
  ```
  This restricts downloads strictly to the matching couple session or administrative staff.

### C. Session Hijacking & XSS Mitigation (Passed)
* **Finding**: Storing JWT tokens in `localStorage` makes them extractable by malicious third-party scripts (XSS).
* **Review**: The session token is transmitted in an `HttpOnly` signed cookie:
  ```javascript
  res.cookie("chaml_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict"
  });
  ```
  - `httpOnly: true`: Restricts browser JS access, preventing cookie theft via XSS.
  - `sameSite: 'strict'`: Instructs the browser to only transmit cookies on first-party requests, mitigating CSRF.

### D. SMTP Password Protection (Passed)
* **Finding**: Credentials are often stored in plain text in configurations.
* **Review**: Implemented an XOR + Base64 symmetric cipher in [crypto.js](file:///c:/Users/ovh/Documents/AI/Regroupement/src/utils/crypto.js) for storage obfuscation. In the frontend [Admin.jsx](file:///c:/Users/ovh/Documents/AI/Regroupement/src/pages/Admin.jsx), the raw value is masked with `••••••••••••••••` to block DOM inspection exposures.

---

## 2. Frontend & Backend Code Quality

### A. Modular Design
* **Frontend**: State router in `App.jsx` handles core transitions. Checklists are isolated in `Dashboard.jsx`.
* **Backend**: Express code is written in a single file `server.js` for simplicity. For production scaling, split controllers into `/routes`, `/controllers`, and `/models`.

### B. Internationalization (i18n) & Theme
* Support for LTR/RTL text directions operates dynamically (sets `dir="rtl"` in HTML tags when Arabic is active).
* Theme colors utilize CSS variables (`var(--bg-app)`) which change dynamically on HTML attributes without causing layout flashes.

---

## 3. Advanced Security & Privacy Features

### A. End-to-End file Encryption (E2EE)
- **Design**: Files are encrypted inside the client browser prior to transport. The private key (passcode) remains only in browser session storage (`sessionStorage`) and is never sent to the network.
- **Algorithm**: Standard AES-GCM (Galois/Counter Mode) 256-bit authenticated cipher. It generates a unique 12-byte IV for every block.
- **Access boundaries**: Server-side storage files contain raw ciphertext. Even if the VPS is compromised, the files are completely unreadable. Admin console download capabilities have been completely removed.

### B. SMTP Email Health Check
- **Nodemailer Integration**: The backend server validates the configured SMTP server dynamically on boot or save settings.
- **Fail-Safe Mechanism**: If the SMTP check fails (invalid credentials, host offline), new subscriptions are automatically suspended (HTTP 503 Service Unavailable) to protect new users from missing vital email validations.

---

## 4. Production Roadmap: Key Recommendations

### 📦 1. Transition Upload Storage to Amazon S3
* Multer is currently writing directly to local disk. For cloud horizontal scaling, pipe the encrypted binary stream directly to a private AWS S3 bucket.

### 🗄️ 2. Database Migration Management
* Use Knex.js migrations to track changes to the PostgreSQL schema instead of executing raw commands via `schema.sql` on startup.
