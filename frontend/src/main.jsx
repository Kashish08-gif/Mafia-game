import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// ── GLB Global Cache Setup ────────────────────────────────────────
// Enable Three.js's built-in FileLoader cache so every GLB (including
// grand_casino.glb at 290 MB) is kept in RAM after the first download.
// This prevents re-fetching when the Canvas remounts (e.g. navigating
// away and back to the game page).
import * as THREE from "three";
THREE.Cache.enabled = true;

// Start fetching grand_casino.glb immediately — long before GameMapPage
// mounts — so the file is already in browser cache / THREE.Cache by the
// time the player reaches the game.
import { useGLTF } from "@react-three/drei";
useGLTF.setDecoderPath("/draco/");
useGLTF.preload("/models/casino/grand_casino.glb");
useGLTF.preload("/models/casino/bar.glb");
useGLTF.preload("/models/casino/fountain_water_simulation.glb");
useGLTF.preload("/models/characters/casual_male-architectural_updated.glb");


createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
