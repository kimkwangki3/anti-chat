import { useEffect, lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { SocketProvider } from './socket/SocketContext';

// 즉시 로드 (자주 사용하는 페이지)
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import ChatPage from './pages/ChatPage';
import Sidebar from './components/Common/Sidebar';
import BottomNav from './components/Common/BottomNav';

// 지연 로드 (필요할 때만 로드)
const ChannelSearchPage = lazy(() => import('./pages/ChannelSearchPage'));
const AdminMemberManagement = lazy(() => import('./pages/AdminMemberManagement'));
const AdminEditChannel = lazy(() => import('./pages/AdminEditChannel'));
const NoticePage = lazy(() => import('./pages/NoticePage'));
const BoardPage = lazy(() => import('./pages/BoardPage'));
const PostDetailPage = lazy(() => import('./pages/PostDetailPage'));
const PollPage = lazy(() => import('./pages/PollPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const SuperAdminUsers = lazy(() => import('./pages/SuperAdminUsers'));
const SuperAdminAdmins = lazy(() => import('./pages/SuperAdminAdmins'));
const SuperAdminDirectChat = lazy(() => import('./pages/SuperAdminDirectChat'));
const SuperAdminChannels = lazy(() => import('./pages/SuperAdminChannels'));
const SuperAdminChannelDetail = lazy(() => import('./pages/SuperAdminChannelDetail'));
const SuperAdminChats = lazy(() => import('./pages/SuperAdminChats'));
const SuperAdminPolls = lazy(() => import('./pages/SuperAdminPolls'));

// 로딩 fallback
const PageLoader = () => (
  <div className="flex items-center justify-center h-full">
    <div className="w-8 h-8 border-2 border-[#FF8C69] border-t-transparent rounded-full animate-spin" />
  </div>
);

const ProtectedLayout = ({ children }) => {
  const { token } = useAuthStore();
  if (!token) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen h-[100dvh] w-full min-w-0 overflow-hidden bg-[#1a1a24] isolation-auto">
      <div className="hidden md:flex">
        <Sidebar />
      </div>
      <main className="flex-1 h-full overflow-y-auto relative pb-24 md:pb-0 pt-safe">
        <Suspense fallback={<PageLoader />}>
          {children}
        </Suspense>
      </main>
      <BottomNav />
    </div>
  );
};

const PublicRoute = ({ children }) => {
  const { token } = useAuthStore();
  return !token ? children : <Navigate to="/" />;
};

function App() {
  const { checkAuth } = useAuthStore();

  useEffect(() => {
    checkAuth();
  }, []);

  return (
    <BrowserRouter>
      <SocketProvider>
        <Routes>
          <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />
          <Route path="/" element={<ProtectedLayout><Dashboard /></ProtectedLayout>} />
          <Route path="/chat" element={<ProtectedLayout><ChatPage /></ProtectedLayout>} />
          <Route path="/search-channels" element={<ProtectedLayout><ChannelSearchPage /></ProtectedLayout>} />
          <Route path="/admin/members" element={<ProtectedLayout><AdminMemberManagement /></ProtectedLayout>} />
          <Route path="/admin/edit-channel" element={<ProtectedLayout><AdminEditChannel /></ProtectedLayout>} />
          <Route path="/notices" element={<ProtectedLayout><NoticePage /></ProtectedLayout>} />
          <Route path="/board" element={<ProtectedLayout><BoardPage /></ProtectedLayout>} />
          <Route path="/board/:id" element={<ProtectedLayout><PostDetailPage /></ProtectedLayout>} />
          <Route path="/settings" element={<ProtectedLayout><SettingsPage /></ProtectedLayout>} />
          <Route path="/polls" element={<ProtectedLayout><PollPage /></ProtectedLayout>} />
          <Route path="/superadmin/users" element={<ProtectedLayout><SuperAdminUsers /></ProtectedLayout>} />
          <Route path="/superadmin/admins" element={<ProtectedLayout><SuperAdminAdmins /></ProtectedLayout>} />
          <Route path="/superadmin/direct-chat" element={<ProtectedLayout><SuperAdminDirectChat /></ProtectedLayout>} />
          <Route path="/superadmin/channels" element={<ProtectedLayout><SuperAdminChannels /></ProtectedLayout>} />
          <Route path="/superadmin/channels/:id" element={<ProtectedLayout><SuperAdminChannelDetail /></ProtectedLayout>} />
          <Route path="/superadmin/chats" element={<ProtectedLayout><SuperAdminChats /></ProtectedLayout>} />
          <Route path="/superadmin/polls" element={<ProtectedLayout><SuperAdminPolls /></ProtectedLayout>} />
          <Route path="/privacy-policy" element={<Suspense fallback={<PageLoader />}><PrivacyPolicy /></Suspense>} />
        </Routes>
      </SocketProvider>
    </BrowserRouter>
  );
}

export default App;
