import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis } from 'recharts';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { format, parse, isSameDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/context/AuthContext';
import SignupPrompt from '@/components/auth/SignupPrompt';
import { useNavigate } from 'react-router-dom';

interface ResultsViewProps {
  question: string;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
    color: string;
  }>;
  onViewGroups: () => void;
  isLoading?: boolean;
  onRefresh: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ 
  question, 
  results, 
  onViewGroups,
  isLoading = false,
  onRefresh
}) => {
  const [showCalendar, setShowCalendar] = React.useState(false);
  const [allQuestions, setAllQuestions] = React.useState<any[]>([]);
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null);
  const [viewingQuestion, setViewingQuestion] = React.useState<any | null>(null);
  const [viewingResults, setViewingResults] = React.useState<any[]>(results);
  const [isHistorical, setIsHistorical] = React.useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    // Fetch all questions for calendar
    (async () => {
      const { data } = await supabase
        .from('daily_questions')
        .select('id, question, options, active_date');
      if (data) setAllQuestions(data);
    })();
  }, []);

  React.useEffect(() => {
    if (!selectedDate) return;
    // Find the question with active_date matching selectedDate (local time)
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, '0');
    const dd = String(selectedDate.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}-${mm}-${dd}`;
    const q = allQuestions.find(q => {
      const qDate = toLocalDateOnly(q.active_date);
      return (
        qDate.getFullYear() === selectedDate.getFullYear() &&
        qDate.getMonth() === selectedDate.getMonth() &&
        qDate.getDate() === selectedDate.getDate()
      );
    });
    if (selectedDate && selectedDate > new Date()) {
      setViewingQuestion(null);
      setViewingResults([]);
      setIsHistorical(true);
      return;
    }
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

  // Only enable dates that have a question (by active_date)
  function toLocalDateOnly(dateString) {
    // Parse as local date (YYYY-MM-DD is treated as local midnight)
    const d = new Date(dateString + 'T00:00:00');
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0); // local midnight
  const availableDates = allQuestions
    .map(q => toLocalDateOnly(q.active_date))
    .filter(d => d <= today);
  const minDate = availableDates.length > 0 ? availableDates[0] : undefined;
  const maxDate = today; // always allow today if it's available

  // Make sure we always have data to display
  const resultsWithData = results.length === 0 
    ? [{ option: 'No votes yet', votes: 0, percentage: 0, color: '#cccccc' }] 
    : results;

  // Use viewingResults for historical, results for today
  const resultsToShow = isHistorical ? viewingResults : resultsWithData;

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
                selected={selectedDate || today}
                onSelect={setSelectedDate}
                fromDate={minDate}
                toDate={maxDate}
                disabled={(date) => !availableDates.some(d =>
                  d.getFullYear() === date.getFullYear() &&
                  d.getMonth() === date.getMonth() &&
                  d.getDate() === date.getDate()
                )}
                modifiers={{
                  available: availableDates,
                }}
                modifiersClassNames={{
                  available: 'bg-alike-teal/20',
                }}
              />
            </PopoverContent>
          </Popover>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={onRefresh} className="h-8 px-3 text-xs">Refresh</Button>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-alike-navy">Global Results</h2>
        <p className="text-base text-alike-navy font-medium">{isHistorical && viewingQuestion ? viewingQuestion.question : question}</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <p className="text-muted-foreground">Loading results...</p>
          </div>
        ) : (
          <>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={resultsToShow}
                  layout="vertical"
                  margin={{ top: 5, right: 50, left: 20, bottom: 5 }}
                >
                  <XAxis type="number" hide />
                  <YAxis type="category" dataKey="option" width={120} />
                  <Bar 
                    dataKey="percentage" 
                    radius={[0, 4, 4, 0]}
                    label={{ 
                      position: 'right',
                      formatter: (value) => `${value}%`
                    }}
                  >
                    {resultsToShow.map((entry, index) => (
                      <Cell key={`bar-cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <Button 
              onClick={() => {
                if (user) {
                  onViewGroups();
                } else {
                  navigate('/signup-prompt');
                }
              }}
              className="w-full bg-alike-navy hover:bg-alike-navy/90 text-white rounded-md h-12 mt-4"
            >
              {user ? "View My Groups" : "View Groups and Stats"}
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default ResultsView; 