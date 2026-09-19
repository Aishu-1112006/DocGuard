import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:8000";

const api = axios.create({ baseURL: API_BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("docguard_token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (email, password) =>
  api.post("/auth/login", { email, password });

export const register = (data) =>
  api.post("/auth/register", data);

export const getMe = () => api.get("/auth/me");

export const listCases = () => api.get("/cases/");

export const createCase = (airportData) =>
  api.post("/cases/", airportData || {
    airport_name: "Chennai International Airport",
    airport_code: "MAA",
    airport_city: "Chennai",
    airport_state: "Tamil Nadu"
  });

export const getCase = (id) => api.get(`/cases/${id}`);

export const decideCase = (id, decision, note) =>
  api.post(`/cases/${id}/decision`, { decision, note });

export const finalizeCase = (id) => api.post(`/cases/${id}/finalize`);

export const uploadDocument = (caseId, file, documentType) => {
  const formData = new FormData();
  formData.append("document", file);
  formData.append("document_type", documentType);
  return api.post(`/cases/${caseId}/documents`, formData);
};

export const uploadSelfie = (caseId, file) => {
  const formData = new FormData();
  formData.append("selfie", file);
  return api.post(`/cases/${caseId}/selfie`, formData);
};

export const getDocumentImageUrl = (caseId, documentId) =>
  `${API_BASE_URL}/cases/${caseId}/documents/${documentId}/image`;

export const getDocumentHeatmapUrl = (caseId, documentId) =>
  `${API_BASE_URL}/cases/${caseId}/documents/${documentId}/heatmap`;

export const getSelfieImageUrl = (caseId) =>
  `${API_BASE_URL}/cases/${caseId}/selfie/image`;

export const listReappeals = (statusFilter) =>
  api.get("/reappeals/", { params: { status_filter: statusFilter } });

export const submitReappeal = (reappealData) =>
  api.post("/reappeals/submit", reappealData);

export const submitPassengerRequest = (caseId, requestData) =>
  api.post(caseId ? `/passenger/cases/${caseId}/requests` : `/passenger/requests`, requestData);

export const createDirectPassengerRequest = (requestData) =>
  api.post("/passenger/requests", requestData);

export const getPassengerRequests = (caseId) =>
  api.get("/passenger/requests", { params: { case_id: caseId } });

export const getPassengerRequestsForCase = (caseId) =>
  api.get(`/passenger/cases/${caseId}/requests`);

export const getAllPassengerRequests = (params) =>
  api.get("/passenger/requests/all", { params });

export const getPassengerRequest = (requestId) =>
  api.get(`/passenger/requests/${requestId}`);

export const getRequestMessages = (requestId) =>
  api.get(`/passenger/requests/${requestId}/messages`);

export const addRequestMessage = (requestId, message, senderType = "PASSENGER", senderName) =>
  api.post(`/passenger/requests/${requestId}/messages`, { message, sender_type: senderType, sender_name: senderName });

export const uploadRequestAttachment = (requestId, file) => {
  const formData = new FormData();
  formData.append("file", file);
  return api.post(`/passenger/requests/${requestId}/attachments`, formData);
};

export const submitReverificationSelfie = (requestId, file) => {
  const formData = new FormData();
  formData.append("selfie", file);
  return api.post(`/passenger/requests/${requestId}/reverify`, formData);
};

export const officerRespondPassengerRequest = (requestId, status, officerResponse, actionType = "REPLY") =>
  api.post(`/passenger/requests/${requestId}/action`, { status, officer_response: officerResponse, action_type: actionType });

export const askPassengerChatbot = (caseId, question, chatHistory = [], language = "en") =>
  api.post(`/passenger/cases/${caseId}/chat`, { case_id: caseId, question, chat_history: chatHistory, language });

export const getCaseReportUrl = (caseId) =>
  `${API_BASE_URL}/cases/${caseId}/pdf-report`;

export const getReappealForCase = (caseId) =>
  api.get(`/reappeals/case/${caseId}`);

export const processReappealAction = (reappealId, actionType, note) =>
  api.post(`/reappeals/${reappealId}/action`, { action_type: actionType, note });

export const searchHistorical = (query, docType, risk, limit) =>
  api.get("/historical/search", { params: { q: query, doc_type: docType, risk, limit } });

export const getHistoricalAnalytics = () =>
  api.get("/historical/analytics");

export const translateText = (text, targetLang, sourceLang = "en") =>
  api.post("/bhashini/translate", { text, target_language: targetLang, source_language: sourceLang });

export const askPassengerAssistant = (caseId, question, language = "en") =>
  api.post("/passenger/cases/" + caseId + "/chat", { case_id: caseId, question, language });

export const getAuditLogs = (limit = 100, caseId) =>
  api.get("/audit/", { params: { limit, case_id: caseId } });

export default api;
