import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, parse, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

interface ResultsViewProps {
  question: string;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
    color: string;
  }>;
  onViewGroups: () => void;
  onProfile: () => void;
  isLoading?: boolean;
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
  question, 
  results, 
  onViewGroups,
  onProfile,
  isLoading = false 
}) => {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [allQuestions, setAllQuestions] = React.useState<any[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [viewingQuestion, setViewingQuestion] = React.useState<any | null>(null);
  const [viewingResults, setViewingResults] = React.useState<any[]>(results);
  const [isHistorical, setIsHistorical] = React.useState(false);

  React.useEffect(() => {
    // Fetch all questions for calendar
    (async () => {
      const { data } = await supabase
        .from('daily_questions')
        .select('id, question, options, created_at');
      if (data) setAllQuestions(data);
    })();
  }, []);

  React.useEffect(() => {
    if (!selectedDate) return;
    // Find which question would be shown on this date
    const sorted = [...allQuestions].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
    const start = new Date(selectedDate.getFullYear(), 0, 0);
    const diff = selectedDate.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    const questionIndex = dayOfYear % sorted.length;
    const q = sorted[questionIndex];
    setViewingQuestion(q);
    // Fetch results for this question
    (async () => {
      const { data: votes } = await supabase
        .from('votes')
        .select('selected_option')
        .eq('question_id', q.id);
      // Count votes for each option
      const parsedOptions = typeof q.options === 'string' ? JSON.parse(q.options) : q.options;
      const voteCounts: Record<string, number> = {};
      parsedOptions.forEach((option: string) => { voteCounts[option] = 0; });
      if (votes && votes.length > 0) {
        votes.forEach((vote: any) => { voteCounts[vote.selected_option] = (voteCounts[vote.selected_option] || 0) + 1; });
      }
      const totalVotes = Object.values(voteCounts).reduce((sum, count) => sum + count, 0);
      const formattedResults = parsedOptions.map((option: string, index: number) => ({
        option,
        votes: voteCounts[option] || 0,
        percentage: totalVotes > 0 ? Math.round((voteCounts[option] || 0) / totalVotes * 100) : 0,
        color: ['#4FD1C5', '#667EEA', '#F6AD55', '#FC8181', '#9F7AEA'][index % 5],
      }));
      setViewingResults(formattedResults);
      setIsHistorical(!isSameDay(selectedDate, new Date()));
    })();
  }, [selectedDate, allQuestions]);

  const currentDate = selectedDate
    ? format(selectedDate, 'MMMM d, yyyy')
    : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  // Only enable dates that have a question (simulate all days since first question)
  const minDate = allQuestions.length > 0 ? new Date(allQuestions[0].created_at) : undefined;
  const maxDate = new Date();
  const availableDates = [];
  if (minDate) {
    let d = new Date(minDate);
    while (d <= maxDate) {
      availableDates.push(new Date(d));
      d.setDate(d.getDate() + 1);
    }
  }

  // Make sure we always have data to display
  const resultsWithData = results.length === 0 
    ? [{ option: 'No votes yet', votes: 0, percentage: 0, color: '#cccccc' }] 
    : results;

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <Popover open={showCalendar} onOpenChange={setShowCalendar}>
            <PopoverTrigger asChild>
              <button className="text-sm text-muted-foreground underline underline-offset-2 cursor-pointer bg-transparent border-0 p-0" type="button">
                {currentDate}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-auto p-0">
              <Calendar
                mode="single"
                selected={selectedDate || new Date()}
                onSelect={setSelectedDate}
                fromDate={minDate}
                toDate={maxDate}
                disabled={(date) => false}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: 'bg-alike-teal/20',
                }}
              />
            </PopoverContent>
          </Popover>
          <div className="bg-alike-teal rounded-full px-3 py-1 cursor-pointer" onClick={onProfile}>
            <span className="text-xs font-medium text-white">Profile</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-alike-navy">Global Results</h2>
        <p className="text-base text-alike-navy font-medium">{isHistorical && viewingQuestion ? viewingQuestion.question : question}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Updating results...</p>
          </div>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={isHistorical ? viewingResults : resultsWithData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="option" width={120} />
                  <Tooltip 
                    formatter={(value, name, props) => [`${value}%`, 'Percentage']} 
                    labelFormatter={(label) => label}
                  />
                  <Bar 
                    dataKey="percentage" 
                    radius={[0, 4, 4, 0]}
                    label={{ 
                      position: 'right',
                      formatter: (value) => `${value}%`
                    }}
                  >
                    {(isHistorical ? viewingResults : resultsWithData).map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-col space-y-2">
              {(isHistorical ? viewingResults : resultsWithData).map((result, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: result.color }}
                    ></div>
                    <span className="text-sm">{result.option}</span>
                  </div>
                  <span className="text-sm font-medium">{result.percentage}%</span>
                </div>
              ))}
            </div>
          </>
        )}
        <Button 
          onClick={onViewGroups}
          className="w-full bg-alike-navy hover:bg-alike-navy/90 text-white rounded-md h-12 mt-4"
        >
          View My Groups
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResultsView; 