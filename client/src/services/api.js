import axios from "axios";

const API_URL = String(import.meta.env.VITE_API_URL || "")
  .trim()
  .replace(/\/+$/, "")
  .replace(/\/api$/i, "");

const api = axios.create({
  baseURL: API_URL || undefined,
});

// Attach JWT automatically for protected requests.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  config.headers = config.headers || {};
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = Number(error?.response?.status || 0);
    if (status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("currentUser");
      window.dispatchEvent(new CustomEvent("auth:unauthorized"));
    }
    return Promise.reject(error);
  }
);

export const registerUser = async (payload) => {
  const formData = new FormData();
  Object.keys(payload).forEach((key) => {
    if (payload[key] !== null && payload[key] !== undefined && payload[key] !== "") {
      formData.append(key, payload[key]);
    }
  });

  const { data } = await api.post("/api/auth/register", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const loginUser = async (payload) => {
  const { data } = await api.post("/api/auth/login", payload);
  return data;
};

export const auth0LoginUser = async (payload) => {
  const { data } = await api.post("/api/auth/auth0-login", payload);
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post("/api/auth/logout");
  return data;
};

export const fetchMe = async () => {
  const { data } = await api.get("/api/auth/me");
  return data;
};

export const fetchUsers = async () => {
  const { data } = await api.get("/api/users");
  return data;
};

export const updateProfile = async (payload) => {
  const { data } = await api.put("/api/users/update-profile", payload);
  return data;
};

export const updatePreferences = async (payload) => {
  const { data } = await api.put("/api/users/preferences", payload);
  return data;
};

export const changePassword = async (payload) => {
  const { data } = await api.put("/api/users/change-password", payload);
  return data;
};

export const fetchConversation = async (userId) => {
  const { data } = await api.get(`/api/messages/${userId}`);
  return data;
};

export const fetchConversations = async () => {
  const { data } = await api.get("/api/messages/conversations");
  return data;
};

export const markMessagesRead = async (chatId) => {
  const { data } = await api.put(`/api/messages/mark-read/${chatId}`);
  return data;
};

export const fetchGroups = async () => {
  const { data } = await api.get("/api/groups");
  return data;
};

export const createGroup = async (payload) => {
  const { data } = await api.post("/api/groups/create", payload);
  return data;
};

export const addGroupMembers = async (groupId, members) => {
  const { data } = await api.put(`/api/groups/${groupId}/add-members`, { members });
  return data;
};

export const removeGroupMember = async (groupId, memberId) => {
  const { data } = await api.put(`/api/groups/${groupId}/remove-member/${memberId}`);
  return data;
};

export const makeGroupAdmin = async (groupId, userId) => {
  const { data } = await api.put(`/api/groups/${groupId}/make-admin`, { userId });
  return data;
};

export const updateGroupDescription = async (groupId, description) => {
  const { data } = await api.put(`/api/groups/${groupId}/description`, { description });
  return data;
};

export const exitGroup = async (groupId) => {
  const { data } = await api.post(`/api/groups/${groupId}/exit`);
  return data;
};

export const deleteGroup = async (groupId) => {
  const { data } = await api.delete(`/api/groups/${groupId}`);
  return data;
};

export const deleteChat = async (chatId) => {
  const { data } = await api.delete(`/api/chats/${chatId}`);
  return data;
};

export const fetchGroupMessages = async (groupId) => {
  const { data } = await api.get(`/api/messages/group/${groupId}`);
  return data;
};

export const fetchGroupSummary = async (groupId) => {
  const { data } = await api.get(`/api/groups/${groupId}/summary`);
  return data;
};

export const generateGroupSummary = async (groupId) => {
  const { data } = await api.post(`/api/groups/${groupId}/generate-summary`);
  return data;
};

export const markGroupSeen = async (groupId) => {
  const { data } = await api.post(`/api/groups/${groupId}/mark-seen`);
  return data;
};

export const fetchTasks = async () => {
  const { data } = await api.get("/api/tasks");
  return data;
};

export const completeTask = async (taskId) => {
  const { data } = await api.patch(`/api/tasks/${taskId}/complete`);
  return data;
};

export const deleteTask = async (taskId) => {
  const { data } = await api.delete(`/api/tasks/${taskId}`);
  return data;
};

export const createMessage = async (payload) => {
  const { data } = await api.post("/api/messages", payload);
  return data;
};

export const createAudioMessage = async (formData) => {
  const { data } = await api.post("/api/messages/audio", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
};

export const deleteMessage = async (messageId) => {
  const { data } = await api.delete(`/api/messages/${messageId}`);
  return data;
};

export const reactToMessage = async (messageId, emoji) => {
  const { data } = await api.post(`/api/messages/${messageId}/react`, { emoji });
  return data;
};

export const chatWithAI = async (payload) => {
  const { data } = await api.post("/api/ai/chat", payload);
  return data;
};

export const fetchAIChat = async () => {
  const { data } = await api.get("/api/ai/chat");
  return data;
};

export const createAIChat = async () => {
  const { data } = await api.post("/api/ai/chat/create");
  return data;
};

export const fetchReplySuggestions = async (payload) => {
  const { data } = await api.post("/api/ai/suggestions", payload);
  return data;
};

export const analyzeMessage = async (payload) => {
  const { data } = await api.post("/api/ai/analyze", payload);
  return data;
};

export const correctGrammar = async (payload) => {
  const { data } = await api.post("/api/ai/correct-grammar", payload);
  return data;
};

export default api;
