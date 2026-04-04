import { Routes, Route } from 'react-router-dom';
import { Nav } from '@/shared/components/Nav';
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
import Inbox from '@/pages/Inbox';
import InboxChat from '@/pages/InboxChat';
import Admin from '@/pages/Admin';
import FindBuddies from '@/pages/FindBuddies';

export default function App() {
  return (
    <div className="min-h-screen font-sans">
      <Nav />
      <main className="min-h-[calc(100vh-4rem)]">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
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
          <Route path="/challenges/:id" element={<ChallengeDetail />} />
          <Route path="/admin" element={<Admin />} />
        </Routes>
      </main>
    </div>
  );
}
