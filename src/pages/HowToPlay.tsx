import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HowToPlay: React.FC = () => {
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
        <h1 className="text-2xl font-bold mb-6">How to Play</h1>
        <div className="text-lg text-alike-navy space-y-4">
          <p>Welcome to Ditto — the daily social polling game that brings people closer with every vote.</p>
          <p>Each day, you'll answer a fun, thought-provoking question. Then, compare your answer with the world! To see past results, click on and change the calendar date.</p>
          <p>Want to get more personal? Create custom groups to compare responses with your friends and family.</p>
          <p>Tap on any option to see exactly who voted for what — no secrets here!</p>
          <p>And for a little extra fun, check out the icon next to each chat name to see your match percentage — it shows how often you and someone else answer the same way, based on shared questions you've both completed.</p>
          <p>Curious what others think? Let's find out.</p>
        </div>
      </Card>
    </div>
  );
};

export default HowToPlay; 