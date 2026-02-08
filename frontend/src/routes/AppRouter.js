import React from 'react';
import { Routes, Route } from 'react-router-dom';

import LandingPage from '../pages/LandingPage';
import AuthPage from '../pages/AuthPage';
import DashboardRedirect from '../pages/student/DashboardRedirect';
import VisualDashboard from '../pages/student/VisualDashboard';
import HearingDashboard from '../pages/student/HearingDashboard';
import CognitiveDashboard from '../pages/student/CognitiveDashboard';
import MobilityDashboard from '../pages/student/MobilityDashboard';
import AdminDashboard from '../pages/admin/AdminDashboard';
import Profile from '../pages/student/Profile';
import CourseList from '../pages/admin/CourseList';
import CourseUpload from '../pages/admin/CourseUpload';
import UserManagement from '../pages/admin/UserManagement';
import AdminUserAttempts from '../pages/admin/AdminUserAttempts';
import QuizUpload from '../pages/admin/QuizUpload'; 
import QuizList from '../pages/admin/QuizList';
import CourseViewer from '../pages/student/CourseViewer'; 
import QuizTaker from '../pages/student/QuizTaker'; 
import Settings from '../pages/student/Settings';
import NewCourses from '../pages/student/NewCourses';
import CoursesHistory from '../pages/student/CoursesHistory';
import QuizzesHistory from '../pages/student/QuizzesHistory';

const AppRouter = () => {
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/auth" element={<AuthPage />} />

      {/* Student Routes */}
      {/* NOTE: We'll add ProtectedRoute wrapper later */}
      <Route path="/dashboard" element={<DashboardRedirect />} />
      <Route path="/dashboard/visual" element={<VisualDashboard />} />
      <Route path="/dashboard/hearing" element={<HearingDashboard />} />
      <Route path="/dashboard/cognitive" element={<CognitiveDashboard />} />
      <Route path="/dashboard/mobility" element={<MobilityDashboard />} />
      <Route path="/profile" element={<Profile />} />

      {/* Admin Routes */}
      {/* NOTE: We'll add AdminRoute wrapper later */}
      <Route path="/admin/dashboard" element={<AdminDashboard />} />
      <Route path="/admin/course-list" element={<CourseList />} />
      <Route path="/admin/course-upload" element={<CourseUpload />} />
      <Route path="/admin/user-management" element={<UserManagement />} />
      <Route path="/admin/user/:id/attempts" element={<AdminUserAttempts />} />
      <Route path="/admin/quiz-list" element={<QuizList />} />         
      <Route path="/admin/quiz-upload" element={<QuizUpload />} />
      <Route path="/course/:courseId" element={<CourseViewer />} />
      <Route path="/quiz/:quizId" element={<QuizTaker />} />
      <Route path="/settings" element={<Settings />} />
      <Route path="/new-courses" element={<NewCourses />} />
      <Route path="/courses-history" element={<CoursesHistory />} />
      <Route path="/quizzes-history" element={<QuizzesHistory />} />
    </Routes>
  );
};

export default AppRouter;