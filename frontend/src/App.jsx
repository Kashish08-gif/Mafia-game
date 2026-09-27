import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";

import Layout from "./shared/Layout";

import DashboardPage from "./pages/DashboardPage";
import ProfilePage from "./pages/ProfilePage";
import FriendsPage from "./pages/FriendsPage";
import LeaderboardPage from "./pages/LeaderboardPage";
import CreateRoomPage from "./pages/CreateRoomPage";
import JoinRoomPage from "./pages/JoinRoomPage";
import RoomLobbyPage from "./pages/RoomLobbyPage";
import StorePage from "./pages/StorePage";
import SettingsPage from "./pages/SettingsPage";

import AuthPage from "./pages/AuthPage";
import LoadingScreen from "./pages/LoadingScreen";
import RoleRevealPage from "./pages/RoleRevealPage";
import GameMapPage from "./pages/GameMapPage";
import InvitePage from "./pages/InvitePage";
import GameEndScreen from "./pages/GameEndScreen";



export default function App() {
  return (
    <BrowserRouter>
      <Routes>

        {/* Authentication */}
        <Route path="/" element={<AuthPage />} />

        {/* Invite */}
        <Route path="/invite/:token" element={<InvitePage />} />

        {/* JOIN THROUGH INVITATION LINK */}
        <Route
          path="/join/:roomId"
          element={<JoinRoomPage />}
        />

        {/* Game Flow */}
        <Route
          path="/loading/:roomId"
          element={<LoadingScreen />}
        />

        <Route
          path="/role-reveal/:roomId"
          element={<RoleRevealPage />}
        />

        <Route
          path="/game/:roomId"
          element={<GameMapPage />}
        />

        {/* Game End */}
        <Route
          path="/game-end/:roomId"
          element={<GameEndScreen />}
        />

        {/* Main Application Layout */}
        <Route element={<Layout />}>

          <Route
            path="/dashboard"
            element={<DashboardPage />}
          />

          <Route
            path="/profile"
            element={<ProfilePage />}
          />

          <Route
            path="/friends"
            element={<FriendsPage />}
          />

          <Route
            path="/leaderboard"
            element={<LeaderboardPage />}
          />

          <Route
            path="/create-room"
            element={<CreateRoomPage />}
          />

          {/* Existing Join Room page */}
          <Route
            path="/join-room"
            element={<JoinRoomPage />}
          />

          <Route
            path="/lobby/:roomId"
            element={<RoomLobbyPage />}
          />

          <Route
            path="/store"
            element={<StorePage />}
          />

          <Route
            path="/settings"
            element={<SettingsPage />}
          />

          {/* Unknown routes */}
          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />

        </Route>
        <Route path="/game-end" element={<GameEndScreen />} />

        {/* Final fallback */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />

      </Routes>
    </BrowserRouter>
  );
}