import axios from "axios";

const api = axios.create({
  baseURL:  `${import.meta.env.VITE_API_URL}/api`,
});

export const signIn = (email, password) =>
  api.post("/auth/sign-in", { email, password });

export const signUp = (username, email, password, confirmPassword) =>
  api.post("/auth/sign-up", {
    username,
    email,
    password,
    confirmPassword,
  });