import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const Contact: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => navigate(-1)}
        className="absolute top-8 left-8 rounded-full p-4 text-3xl"
        style={{ fontSize: '2.5rem', padding: '1.5rem' }}
        aria-label="Back"
      >
        ←
      </Button>
      <Card className="w-full max-w-xl p-8 mt-8 text-center">
        <h1 className="text-2xl font-bold mb-6">Contact Us</h1>
        <p className="text-lg text-alike-navy">
          Need to contact us? <br />
          Email us at theofficialditto@gmail.com
        </p>
      </Card>
    </div>
  );
};

export default Contact; 