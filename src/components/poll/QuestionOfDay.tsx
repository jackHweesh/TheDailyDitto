
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { useToast } from '@/components/ui/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';

interface QuestionProps {
  onVoteSubmit: (option: string) => void;
}

const QuestionOfDay: React.FC<QuestionProps> = ({ onVoteSubmit }) => {
  const [selectedOption, setSelectedOption] = useState('');
  const { toast } = useToast();
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOption) {
      toast({
        title: "Selection required",
        description: "Please select an option before submitting your vote",
        variant: "destructive"
      });
      return;
    }
    
    onVoteSubmit(selectedOption);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentDate}</p>
          <div className="bg-alike-teal rounded-full px-3 py-1">
            <span className="text-xs font-medium text-white">Question of the Day</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-alike-navy">What do you prefer to watch?</h2>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <RadioGroup value={selectedOption} onValueChange={setSelectedOption}>
            {["Hollywood Movies", "Netflix Shows", "YouTube Videos", "TV Series", "Social Media Short videos"].map((option) => (
              <div key={option} className="flex items-center space-x-2 border rounded-md p-3 hover:bg-accent cursor-pointer">
                <RadioGroupItem value={option} id={option.replace(/\s+/g, '-').toLowerCase()} />
                <Label htmlFor={option.replace(/\s+/g, '-').toLowerCase()} className="flex-1 cursor-pointer">{option}</Label>
              </div>
            ))}
          </RadioGroup>
        </CardContent>
        <CardFooter>
          <Button 
            type="submit" 
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12"
          >
            Submit
          </Button>
        </CardFooter>
      </form>
    </Card>
  );
};

export default QuestionOfDay;
