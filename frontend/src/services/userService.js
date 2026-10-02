import axios from "axios";

const api = axios.create({
  baseURL: `${import.meta.env.VITE_API_URL}`
});

export const getUserData = (token, userId) =>
  api.get(`/user/${userId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
