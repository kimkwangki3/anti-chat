import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChannelSearchPage from './pages/ChannelSearchPage';
import AdminMemberManagement from './pages/AdminMemberManagement';
import ChatPage from './pages/ChatPage';
import NoticePage from './pages/NoticePage';
import BoardPage from './pages/BoardPage';
import PostDetailPage from './pages/PostDetailPage';
import Sidebar from './components/Common/Sidebar';
import BottomNav from './components/Common/BottomNav';
import AdminEditChannel from './pages/AdminEditChannel';
import SettingsPage from './pages/SettingsPage';

const ProtectedLayout = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" />;

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[#1a1a24]">
      {/* PC 사이드바: 768px 이상에서만 노출 */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      <main className="flex-1 h-full overflow-hidden pb-16 md:pb-0 relative">
        {children}
      </main>

      {/* 모바일 하단바: 768px 미만에서만 노출 */}
      <BottomNav />
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/" />;
};

import { SocketProvider } from './socket/SocketContext';

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          } />
          <Route path="/register" element={
            <PublicRoute>
              <Register />
            </PublicRoute>
          } />
          <Route path="/" element={
            <ProtectedLayout>
              <Dashboard />
            </ProtectedLayout>
          } />
          <Route path="/search-channels" element={
            <ProtectedLayout>
              <ChannelSearchPage />
            </ProtectedLayout>
          } />
          <Route path="/admin/members" element={
            <ProtectedLayout>
              <AdminMemberManagement />
            </ProtectedLayout>
          } />
          <Route path="/admin/edit-channel" element={
            <ProtectedLayout>
              <AdminEditChannel />
            </ProtectedLayout>
          } />
          <Route path="/chat" element={
            <ProtectedLayout>
              <ChatPage />
            </ProtectedLayout>
          } />
          <Route path="/notices" element={
            <ProtectedLayout>
              <NoticePage />
            </ProtectedLayout>
          } />
          <Route path="/board" element={
            <ProtectedLayout>
              <BoardPage />
            </ProtectedLayout>
          } />
          <Route path="/board/:id" element={
            <ProtectedLayout>
              <PostDetailPage />
            </ProtectedLayout>
          } />
          <Route path="/settings" element={
            <ProtectedLayout>
              <SettingsPage />
            </ProtectedLayout>
          } />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
