
import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';

interface ResultsViewProps {
  question: string;
  results: Array<{
    option: string;
    votes: number;
    percentage: number;
    color: string;
  }>;
  onViewGroups: () => void;
}

const ResultsView: React.FC<ResultsViewProps> = ({ question, results, onViewGroups }) => {
  const currentDate = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const totalVotes = results.reduce((total, item) => total + item.votes, 0);

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">{currentDate}</p>
          <div className="bg-alike-teal rounded-full px-3 py-1">
            <span className="text-xs font-medium text-white">Results</span>
          </div>
        </div>
        <h2 className="text-xl font-semibold text-alike-navy">{question}</h2>
        <p className="text-sm text-muted-foreground">Total of {totalVotes} people have answered this question</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue="pie" className="w-full">
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="pie">Pie Chart</TabsTrigger>
            <TabsTrigger value="bar">Bar Chart</TabsTrigger>
          </TabsList>
          <TabsContent value="pie" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={results}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="votes"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {results.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </TabsContent>
          <TabsContent value="bar" className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={results}
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
                  fill="#4FD1C5" 
                  radius={[0, 4, 4, 0]}
                  label={{ 
                    position: 'right',
                    formatter: (value) => `${value}%`
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </TabsContent>
        </Tabs>
        
        <div className="flex flex-col space-y-2">
          {results.map((result, index) => (
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

        <Button 
          onClick={onViewGroups}
          className="w-full bg-alike-navy hover:bg-alike-navy/90 text-white rounded-md h-12 mt-4"
        >
          View Group Results
        </Button>
      </CardContent>
    </Card>
  );
};

export default ResultsView;
