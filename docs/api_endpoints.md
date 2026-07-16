# REST API Reference Manual

This catalog documents the Express.js backend REST API endpoints serving the Chaml application.

---

## 1. Authentication Endpoints

### GET `/api/auth/me`
Fetches active user details based on the session token.
* **Headers**: Required `Cookie: chaml_token` (HTTP-only)
* **Response (Success)**:
  ```json
  {
    "user": {
      "id": "user_anass",
      "email": "anass@chaml.fr",
      "role": "demandeur",
      "coupleId": "couple_001",
      "firstName": "Anass",
      "lastName": "El Amrani",
      "isEmailVerified": true,
      "isApproved": true
    }
  }
  ```
* **Response (No Session)**: `{ "user": null }`

---

### POST `/api/auth/login`
Authenticates user, sets signed JWT cookie session.
* **Request Body**:
  ```json
  {
    "email": "anass@chaml.fr",
    "password": "password"
  }
  ```
* **Response (Success)**: Returns user object (same schema as `/api/auth/me`) + sets cookie `chaml_token`.
* **Response (Unverified Email)**: `HTTP 403 { "error": "unverified", "userId": "user_anass" }`
* **Response (Pending Admin Approval)**: `HTTP 403 { "error": "unapproved", "coupleId": "couple_001" }`
* **Response (Suspended User)**: `HTTP 403 { "error": "frozen" }`

---

### POST `/api/auth/register`
SaaS single applicant registration form handler. Seeds empty checklists.
* **Request Body**:
  ```json
  {
    "email": "conjoint@chaml.fr",
    "password": "password",
    "firstName": "Salma",
    "lastName": "Bennani",
    "phone": "+33 6...",
    "city": "Paris",
    "department": "75",
    "zone": "A",
    "livingSurface": 32
  }
  ```
* **Response (Success)**: `HTTP 200 { "success": true, "coupleId": "couple_17842" }`
* **Response (Error - Email Taken)**: `HTTP 400 { "error": "Email address already registered." }`

---

### POST `/api/dossier/invite-spouse`
Sends an email invitation with a secure token to the spouse in Morocco.
* **Headers**: Required `Cookie: chaml_token`
* **Request Body**:
  ```json
  {
    "email": "spouse.maroc@gmail.com",
    "firstName": "Anass",
    "lastName": "El Amrani",
    "phone": "+212 6...",
    "city": "Casablanca"
  }
  ```
* **Response (Success)**: `HTTP 200 { "success": true }`

---

### POST `/api/auth/accept-invite`
Accepts spouse invitation, hashes the selected password, and activates the account.
* **Request Body**:
  ```json
  {
    "coupleId": "couple_17842",
    "email": "spouse.maroc@gmail.com",
    "password": "new_secure_password"
  }
  ```
* **Response (Success)**: `HTTP 200 { "success": true }`

---

### POST `/api/auth/logout`
Destroys JWT session token.
* **Response**: `HTTP 200 { "success": true }` (Clears `chaml_token` cookie).

---

### POST `/api/auth/verify-email`
Simulates link click in verification email.
* **Request Body**: `{ "coupleId": "couple_001" }`
* **Response**: `HTTP 200 { "success": true }`

---

## 2. Dossier & Checklists Endpoints

### GET `/api/dossier`
Returns active couple's document checklists and partner name.
* **Headers**: Required `Cookie: chaml_token`
* **Response (Success)**:
  ```json
  {
    "partnerName": "Salma",
    "couple": {
      "id": "couple_001",
      "demandeur": { "firstName": "Anass", "lastName": "El Amrani", "city": "Paris", "department": "75" },
      "beneficiaire": { "firstName": "Salma", "lastName": "Bennani" }
    },
    "dossier": {
      "id": "couple_001",
      "status": "draft",
      "submittedAt": null,
      "franceDocs": [
        { "id": "fr_identity", "nameKey": "doc_fr_identity", "category": "identity", "required": true, "uploaded": false }
      ],
      "moroccoDocs": []
    }
  }
  ```

---

### POST `/api/dossier/upload`
Uploads a document scan (multipart/form-data).
* **Payload**: Form fields `docKey` (string), `owner` (string), and `file` (binary PDF/Image).
* **Response**: `HTTP 200 { "success": true, "fileName": "pay_slip.pdf" }`

---

### POST `/api/dossier/delete`
Deletes uploaded document and physical file.
* **Request Body**: `{ "docKey": "fr_income" }`
* **Response**: `HTTP 200 { "success": true }`

---

### GET `/api/dossier/download/:coupleId/:docKey`
Authenticated file stream.
* **Headers**: Required `Cookie: chaml_token`
* **Access Boundary**: Restricts to matching couple folder session or admins.
* **Response**: Binary file stream attachment.

---

### POST `/api/dossier/submit`
Submits entire dossier. Sets 6-month alerte.
* **Response**: `HTTP 200 { "success": true }`

---

## 3. Moderator Control Endpoints

### GET `/api/admin/couples`
Returns lists of all registered couples with checklists.
* **Headers**: Required admin token cookie.
* **Response**: `HTTP 200 { "couples": [...] }`

---

### POST `/api/admin/couples/approve`
Approves/activates couple accounts.
* **Request Body**: `{ "coupleId": "couple_002" }`
* **Response**: `HTTP 200 { "success": true }`

---

### POST `/api/admin/users/freeze`
Freezes / Reactivates a user profile.
* **Request Body**: `{ "email": "a@c.com", "isFrozen": true }`
* **Response**: `HTTP 200 { "success": true }`

---

### POST `/api/admin/documents/review`
Reviews document status (Approved / Rejected) and adds a comment feedback.
* **Request Body**:
  ```json
  {
    "coupleId": "couple_001",
    "docKey": "fr_marriage",
    "status": "rejected",
    "comment": "Copie illisible. Veuillez numériser l'original."
  }
  ```
* **Response**: `HTTP 200 { "success": true }`

---

### POST `/api/admin/settings`
Updates global SaaS brand configurations and SMTP details.
* **Request Body**:
  ```json
  {
    "appName": "Chaml",
    "appLogo": "🕌",
    "smicValue": 1823,
    "surfaceZoneA": 22,
    "surfaceZoneB": 24,
    "surfaceZoneC": 28,
    "smtpConfig": {
      "host": "smtp.mailgun.org",
      "port": 587,
      "user": "postmaster@chaml.ma",
      "password": "AES_ENCRYPTED_PASSWORD_CIPHER_STRING",
      "protocol": "TLS",
      "senderName": "Chaml Team",
      "senderEmail": "noreply@chaml.ma"
    }
  }
  ```
* **Response**: `HTTP 200 { "success": true }`

---

### GET `/api/admin/logs`
Fetches all database daily audit logs.
* **Response**: `HTTP 200 { "logs": { "2026-07-16": [...] } }`
