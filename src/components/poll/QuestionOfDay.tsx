import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import { getBrowserFingerprint } from '@/utils/fingerprint';

interface QuestionProps {
  question: string;
  options: string[];
  questionId: string;
  onVoteSubmit: (option: string) => void;
}

const QuestionOfDay: React.FC<QuestionProps> = ({ question, options, questionId, onVoteSubmit }) => {
  const [selectedOption, setSelectedOption] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      toast({
        title: "Selection required",
        description: "Please select an option before submitting your vote",
        variant: "destructive"
      });
      return;
    }
    setIsLoading(true);
    try {
      const fingerprint = await getBrowserFingerprint();
      const { error } = await supabase
        .from('votes')
        .insert({
          user_id: user?.id || null,
          question_id: questionId,
          selected_option: selectedOption,
          browser_fingerprint: !user ? fingerprint : null
        });
      if (error) {
        if (error.code === '23505') { // Unique violation
          toast({
            title: "Already voted",
            description: "You have already voted on this question",
            variant: "destructive"
          });
        } else {
          throw error;
        }
      } else {
        toast({
          title: "Vote submitted",
          description: "Your vote has been recorded. Check out the results!",
        });
        // Show results immediately - the ad will be triggered by the button click
        onVoteSubmit(selectedOption);
        // Inject AdSterra script after vote
        const script = document.createElement('script');
        script.type = 'text/javascript';
        script.src = '//pl27115629.profitableratecpm.com/f3/37/d7/f337d7ebed9456682fa392f5347c3076.js';
        document.body.appendChild(script);
      }
    } catch (error: any) {
      toast({
        title: "Error submitting vote",
        description: error.message || "An error occurred while submitting your vote",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1">
        <p className="text-sm text-muted-foreground">{currentDate}</p>
        <span className="text-lg font-bold text-alike-navy">Question of the Day</span>
        <h2 className="text-xl font-semibold text-alike-navy">{question}</h2>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {options.map((option) => (
              <div key={option} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value={option} id={option.replace(/\s+/g, '-').toLowerCase()} disabled={isLoading} />
                <Label htmlFor={option.replace(/\s+/g, '-').toLowerCase()} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12 show-interstitial"
            disabled={isLoading}
          >
            {isLoading ? "Submitting..." : "Submit"}
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default QuestionOfDay;
