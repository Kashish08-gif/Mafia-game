import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import './styles/chat.css';
import App from "./App.jsx";

// ── GLB Global Cache Setup ────────────────────────────────────────
// Enable Three.js's built-in FileLoader cache so every GLB (including
// gameready_casino_scene.glb) is kept in RAM after the first download.
// This prevents re-fetching when the Canvas remounts (e.g. navigating
// away and back to the game page).
import * as THREE from "three";
THREE.Cache.enabled = true;

// Start fetching gameready_casino_scene.glb immediately — long before GameMapPage
// mounts — so the file is already in browser cache / THREE.Cache by the
// time the player reaches the game.
import { useGLTF } from "@react-three/drei";
useGLTF.setDecoderPath("/draco/");
useGLTF.preload("/models/casino/gameready_casino_scene.glb");


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
