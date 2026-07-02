import { lazy, Suspense } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AppFrame } from '@/shared/components/AppFrame';
import { Nav } from '@/shared/components/Nav';
import { Footer } from '@/shared/components/Footer';

const Home = lazy(() => import('@/pages/Home'));
const Login = lazy(() => import('@/pages/Login'));
const Register = lazy(() => import('@/pages/Register'));
const AuthCallback = lazy(() => import('@/pages/AuthCallback'));
const ForgotPassword = lazy(() => import('@/pages/ForgotPassword'));
const ResetPassword = lazy(() => import('@/pages/ResetPassword'));
const Settings = lazy(() => import('@/pages/Settings'));
const ProfileEdit = lazy(() => import('@/pages/ProfileEdit'));
const Profile = lazy(() => import('@/pages/Profile'));
const Inbox = lazy(() => import('@/pages/Inbox'));
const InboxChat = lazy(() => import('@/pages/InboxChat'));
const Projects = lazy(() => import('@/pages/Projects'));
const ProjectNew = lazy(() => import('@/pages/ProjectNew'));
const ProjectDetail = lazy(() => import('@/pages/ProjectDetail'));
const FindBuddies = lazy(() => import('@/pages/FindBuddies'));
const Community = lazy(() => import('@/pages/Community'));
const CommunityNew = lazy(() => import('@/pages/CommunityNew'));
const CommunityPost = lazy(() => import('@/pages/CommunityPost'));
const Challenges = lazy(() => import('@/pages/Challenges'));
const ChallengeNew = lazy(() => import('@/pages/ChallengeNew'));
const ChallengeDetail = lazy(() => import('@/pages/ChallengeDetail'));
const Admin = lazy(() => import('@/pages/Admin'));
const Privacy = lazy(() => import('@/pages/Privacy'));
const Terms = lazy(() => import('@/pages/Terms'));

function RouteFallback() {
  return <div className="mx-auto max-w-4xl px-6 py-16 text-center text-slate-400">Loading…</div>;
}

export default function App() {
  return (
    <AppFrame>
      <Nav />
      <main className="min-h-[calc(100vh-4rem)]">
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/register" element={<Register />} />
            <Route path="/auth/callback" element={<AuthCallback />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/profile/edit" element={<ProfileEdit />} />
            <Route path="/profile/:username" element={<Profile />} />
            <Route path="/inbox" element={<Inbox />} />
            <Route path="/inbox/:userId" element={<InboxChat />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/projects/new" element={<ProjectNew />} />
            <Route path="/projects/:id" element={<ProjectDetail />} />
            <Route path="/buddies" element={<FindBuddies />} />
            <Route path="/community" element={<Community />} />
            <Route path="/community/new" element={<CommunityNew />} />
            <Route path="/community/:id" element={<CommunityPost />} />
            <Route path="/challenges" element={<Challenges />} />
            <Route path="/challenges/new" element={<ChallengeNew />} />
            <Route path="/challenges/:id" element={<ChallengeDetail />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </AppFrame>
  );
}
