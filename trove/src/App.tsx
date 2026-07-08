import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { AppProviders, AppNav } from './components';
import Landing from './pages/Landing';
import HowItWorks from './pages/HowItWorks';
import { Login, Signup } from './pages/Auth';
import Onboarding from './pages/Onboarding';
import FreelancerDashboard from './pages/FreelancerDashboard';
import ClientDashboard from './pages/ClientDashboard';
import FindWork from './pages/FindWork';
import JobDetail from './pages/JobDetail';
import PostJob from './pages/PostJob';
import Applicants from './pages/Applicants';
import FindTalent from './pages/FindTalent';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Contracts from './pages/Contracts';
import Workspace from './pages/Workspace';
import FundEscrow from './pages/FundEscrow';
import Wallet from './pages/Wallet';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => window.scrollTo(0, 0), [pathname]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProviders>
        <ScrollToTop />
        <AppNav />
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/how-it-works" element={<HowItWorks />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<FreelancerDashboard />} />
          <Route path="/client" element={<ClientDashboard />} />
          <Route path="/jobs" element={<FindWork />} />
          <Route path="/jobs/:id" element={<JobDetail />} />
          <Route path="/jobs/:id/applicants" element={<Applicants />} />
          <Route path="/post-job" element={<PostJob />} />
          <Route path="/talent" element={<FindTalent />} />
          <Route path="/f/:id" element={<Profile />} />
          <Route path="/messages" element={<Messages />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/contracts/:id" element={<Workspace />} />
          <Route path="/contracts/:id/fund" element={<FundEscrow />} />
          <Route path="/wallet" element={<Wallet />} />
          <Route path="*" element={<Landing />} />
        </Routes>
      </AppProviders>
    </BrowserRouter>
  );
}
