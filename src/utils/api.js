// Client API services querying the Express.js + PostgreSQL backend (proxied via /api)

// Helper: HTTP request wrapper that handles errors and JSON payloads
async function request(url, options = {}) {
  options.headers = options.headers || {};
  if (options.body && !(options.body instanceof FormData)) {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(options.body);
  }
  
  // Credentials 'include' is essential to send HttpOnly session cookies
  options.credentials = "include";

  const response = await fetch(url, options);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    const err = new Error(errorData.error || `HTTP error ${response.status}`);
    err.payload = errorData;
    throw err;
  }
  return response.json();
}

// 1. Auth Services
export const getMe = () => request("/api/auth/me");
export const getConfig = () => request("/api/config");

export const loginUser = (email, password) => 
  request("/api/auth/login", {
    method: "POST",
    body: { email, password }
  });

export const logoutUser = () => 
  request("/api/auth/logout", { method: "POST" });

export const registerApplicant = (data) => 
  request("/api/auth/register", {
    method: "POST",
    body: data
  });

export const verifyEmail = (coupleId) => 
  request("/api/auth/verify-email", {
    method: "POST",
    body: { coupleId }
  });

export const resendVerificationEmail = (coupleId, email) =>
  request("/api/auth/resend-verification-email", {
    method: "POST",
    body: { coupleId, email }
  });

export const forgotPassword = (email) =>
  request("/api/auth/forgot-password", {
    method: "POST",
    body: { email }
  });

export const resetPassword = (token, newPassword) =>
  request("/api/auth/reset-password", {
    method: "POST",
    body: { token, newPassword }
  });

// 2. Client Dossier Services
export const getDossier = () => request("/api/dossier");

export const uploadDocument = (docKey, owner, file) => {
  const formData = new FormData();
  formData.append("docKey", docKey);
  formData.append("owner", owner);
  formData.append("file", file);

  return request("/api/dossier/upload", {
    method: "POST",
    body: formData
  });
};

export const deleteDocument = (docKey) => 
  request("/api/dossier/delete", {
    method: "POST",
    body: { docKey }
  });

export const getDownloadUrl = (coupleId, docKey) => {
  return `/api/dossier/download/${coupleId}/${docKey}`;
};

export const submitDossier = (lang = "fr") => 
  request("/api/dossier/submit", { method: "POST", body: { lang } });

// 3. Admin Moderation Services
export const getAdminCouples = () => request("/api/admin/couples");

export const deleteCoupleAccount = (coupleId) => 
  request(`/api/admin/couples/${coupleId}`, { method: "DELETE" });

export const toggleFreezeUser = (email, isFrozen) => 
  request("/api/admin/users/freeze", {
    method: "POST",
    body: { email, isFrozen }
  });

export const approveCouple = (coupleId) => 
  request("/api/admin/couples/approve", {
    method: "POST",
    body: { coupleId }
  });

export const reviewDocument = (coupleId, docKey, status, comment) => 
  request("/api/admin/documents/review", {
    method: "POST",
    body: { coupleId, docKey, status, comment }
  });

export const deleteDocumentAdmin = (coupleId, docKey) => 
  request("/api/admin/documents/delete", {
    method: "POST",
    body: { coupleId, docKey }
  });

export const updateAdminSettings = (settings) => 
  request("/api/admin/settings", {
    method: "POST",
    body: settings
  });

export const getAdminLogs = () => request("/api/admin/logs");

export const updateSubmittedDate = (coupleId, date) => 
  request("/api/admin/couples/submitted-date", {
    method: "POST",
    body: { coupleId, date }
  });

export const changePassword = (currentPassword, newPassword) =>
  request("/api/auth/change-password", {
    method: "POST",
    body: { currentPassword, newPassword }
  });

export const inviteSpouse = (email, firstName, lastName, phone, city) => 
  request("/api/dossier/invite-spouse", {
    method: "POST",
    body: { email, firstName, lastName, phone, city }
  });

export const acceptInvite = (coupleId, email, password) => 
  request("/api/auth/accept-invite", {
    method: "POST",
    body: { coupleId, email, password }
  });

export const verifyStripeSession = (sessionId) => 
  request("/api/payment/verify-session", {
    method: "POST",
    body: { sessionId }
  });
