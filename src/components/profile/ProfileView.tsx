import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';

interface ProfileViewProps {
  onBack: () => void;
}

const countryList = [
  'United States', 'Canada', 'United Kingdom', 'Australia', 'Germany', 'France', 'India', 'China', 'Japan', 'Brazil',
  'South Africa', 'Mexico', 'Italy', 'Spain', 'Russia', 'Netherlands', 'Sweden', 'Norway', 'Denmark', 'Finland',
  'New Zealand', 'Singapore', 'South Korea', 'Turkey', 'Switzerland', 'Ireland', 'Belgium', 'Austria', 'Poland',
  'Portugal', 'Argentina', 'Chile', 'Colombia', 'Peru', 'Philippines', 'Indonesia', 'Malaysia', 'Thailand', 'Vietnam',
  'Saudi Arabia', 'United Arab Emirates', 'Egypt', 'Nigeria', 'Kenya', 'Ghana', 'Pakistan', 'Bangladesh', 'Israel',
  'Greece', 'Czech Republic', 'Hungary', 'Romania', 'Slovakia', 'Slovenia', 'Croatia', 'Bulgaria', 'Estonia', 'Latvia',
  'Lithuania', 'Iceland', 'Luxembourg', 'Monaco', 'Liechtenstein', 'Malta', 'Cyprus', 'Qatar', 'Kuwait', 'Morocco',
  'Algeria', 'Tunisia', 'Jordan', 'Lebanon', 'Oman', 'Bahrain', 'Sri Lanka', 'Nepal', 'Myanmar', 'Cambodia', 'Laos',
  'Mongolia', 'Kazakhstan', 'Uzbekistan', 'Georgia', 'Armenia', 'Azerbaijan', 'Belarus', 'Ukraine', 'Moldova', 'Serbia',
  'Montenegro', 'Bosnia and Herzegovina', 'North Macedonia', 'Albania', 'Paraguay', 'Uruguay', 'Venezuela', 'Ecuador',
  'Bolivia', 'Costa Rica', 'Panama', 'Guatemala', 'Honduras', 'El Salvador', 'Nicaragua', 'Jamaica', 'Trinidad and Tobago',
  'Barbados', 'Bahamas', 'Cuba', 'Dominican Republic', 'Haiti', 'Zimbabwe'
];

const usStates = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California',
  'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
  'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa',
  'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland',
  'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi', 'Missouri',
  'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
  'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio',
  'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island', 'South Carolina',
  'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

const ProfileView: React.FC<ProfileViewProps> = ({ onBack }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [age, setAge] = useState('');
  const [country, setCountry] = useState('');
  const [state, setState] = useState('');
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      setIsLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) {
        toast({ title: 'Error', description: 'Could not load profile', variant: 'destructive' });
      } else if (data) {
        setFirstName(data.first_name || '');
        setLastName(data.last_name || '');
        setAge(data.age ? String(data.age) : '');
        setCountry(data.country || '');
        setState(data.state || '');
        setEmail(user.email || '');
      }
      setIsLoading(false);
    };
    fetchProfile();
  }, [user, toast]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsLoading(true);
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        age: age ? parseInt(age) : null,
        country,
        state: country === 'United States' ? state : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);
    if (error) {
      toast({ title: 'Error', description: 'Could not update profile', variant: 'destructive' });
    } else {
      toast({ title: 'Profile updated', description: 'Your profile has been updated.' });
    }
    setIsLoading(false);
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-lg border-0 animate-fade-in">
      <CardHeader className="space-y-1 flex flex-col items-center">
        <Button variant="ghost" size="sm" onClick={onBack} className="self-start mb-2">← Back</Button>
        <h2 className="text-xl font-semibold text-center text-alike-navy">Edit Profile</h2>
      </CardHeader>
      <form onSubmit={handleSave}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              type="email"
              placeholder="Email address"
              value={email}
              disabled
              className="rounded-md h-12"
            />
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="First Name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className="rounded-md h-12"
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Last Name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className="rounded-md h-12"
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Input
              type="number"
              placeholder="Age"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              className="rounded-md h-12"
              min={1}
              max={120}
              required
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Select value={country} onValueChange={setCountry} disabled={isLoading} required>
              <SelectTrigger className="rounded-md h-12">
                <SelectValue placeholder="Country" />
              </SelectTrigger>
              <SelectContent>
                {countryList.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {country === 'United States' && (
            <div className="space-y-2">
              <Select value={state} onValueChange={setState} disabled={isLoading} required>
                <SelectTrigger className="rounded-md h-12">
                  <SelectValue placeholder="US State" />
                </SelectTrigger>
                <SelectContent>
                  {usStates.map((usState) => (
                    <SelectItem key={usState} value={usState}>{usState}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            type="submit"
            className="w-full bg-alike-teal hover:bg-alike-teal/90 text-white rounded-md h-12 mt-4"
            disabled={isLoading}
          >
            {isLoading ? 'Saving...' : 'Save Changes'}
          </Button>
        </CardContent>
      </form>
    </Card>
  );
};

export default ProfileView; 