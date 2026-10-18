import axios from "axios";
import { API_BASE_URL } from "../config/api.js";

const api = axios.create({
  baseURL: API_BASE_URL,
});

export const getUserData = (token, userId) =>
  api.get(`/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });

export const updateUserProfile = (token, formData) =>
  api.put(`/profile`, formData, {
    headers: {
      "Content-Type": "multipart/form-data",
      Authorization: `Bearer ${token}`,
    },
  });

export default api;
