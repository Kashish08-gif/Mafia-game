import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Layout from "./shared/Layout";
import {
  AuthPage,
  DashboardPage,
  ProfilePage,
  FriendsPage,
  LeaderboardPage,
  CreateRoomPage,
  JoinRoomPage,
  RoomLobbyPage,
  StorePage,
  SettingsPage,
  LoadingScreen,
  RoleRevealPage,
  GameMapPage,
} from "./pages";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AuthPage />} />
        <Route path="/loading/:roomId" element={<LoadingScreen />} />
        <Route path="/role-reveal/:roomId" element={<RoleRevealPage />} />
        <Route path="/game/:roomId" element={<GameMapPage />} />

        <Route element={<Layout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/friends" element={<FriendsPage />} />
          <Route path="/leaderboard" element={<LeaderboardPage />} />
          <Route path="/create-room" element={<CreateRoomPage />} />
          <Route path="/join-room" element={<JoinRoomPage />} />
          <Route path="/lobby/:roomId" element={<RoomLobbyPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
