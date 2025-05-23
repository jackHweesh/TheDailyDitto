import React from 'react';
import ProfileView from '@/components/profile/ProfileView';
import { useNavigate } from 'react-router-dom';

const Profile: React.FC = () => {
  const navigate = useNavigate();
  return <ProfileView onBack={() => navigate(-1)} />;
};

export default Profile; 