import axios from "axios";
import { API_BASE_URL } from "../config/api.js";

const api = axios.create({
  baseURL: API_BASE_URL,
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