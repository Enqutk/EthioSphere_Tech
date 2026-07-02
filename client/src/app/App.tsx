import { Routes, Route } from 'react-router-dom';
import { AppFrame } from '@/shared/components/AppFrame';
import { Nav } from '@/shared/components/Nav';
import { Footer } from '@/shared/components/Footer';
import Home from '@/pages/Home';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import Profile from '@/pages/Profile';
import ProfileEdit from '@/pages/ProfileEdit';
import Projects from '@/pages/Projects';
import ProjectDetail from '@/pages/ProjectDetail';
import ProjectNew from '@/pages/ProjectNew';
import Community from '@/pages/Community';
import CommunityPost from '@/pages/CommunityPost';
import CommunityNew from '@/pages/CommunityNew';
import Challenges from '@/pages/Challenges';
import ChallengeDetail from '@/pages/ChallengeDetail';
import ChallengeNew from '@/pages/ChallengeNew';
import Inbox from '@/pages/Inbox';
import InboxChat from '@/pages/InboxChat';
import Admin from '@/pages/Admin';
import FindBuddies from '@/pages/FindBuddies';
import Privacy from '@/pages/Privacy';
import Terms from '@/pages/Terms';
import Settings from '@/pages/Settings';
import AuthCallback from '@/pages/AuthCallback';

export default function App() {
  return (
    <AppFrame>
      <Nav />
      <main className="min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
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
      </main>
      <Footer />
    </AppFrame>
  );
}
