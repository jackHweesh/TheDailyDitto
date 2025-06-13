import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const privacyPolicy = `## **Privacy Policy for Ditto**

**Effective Date: 5/1/2025**

At Ditto, your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your information when you use our app.

### **1. Information We Collect**

When you use Ditto, we may collect the following information:

* Name
* Email address
* Country and state (if applicable)
* Age
* Gender
* Your daily answers to questions

### **2. How We Use Your Information**

We use your data only to:
* Compare your answers with others for statistical insights
* Group users by general traits (like age or region) for meaningful comparisons
* Improve the experience and personalization within the app
* Maintain the security and performance of the service
* Display advertisements to help support the app's continued development

We do not sell, rent, or share your personal information with third parties. Your data is used only within Ditto for the purposes described above.

**Please note:** We may use trusted third-party services such as Supabase (for database and authentication), and ad platforms (like Google AdMob) that process limited data to support app functionality and monetization.

### **3. Data Security**

We take reasonable steps to protect your information using standard encryption and secure storage practices. However, no system is 100% secure, so we encourage you to use a strong password and be mindful of the information you share.

### **4. Your Choices and Rights**

You have the right to:
* Request access to your data
* Update or correct your information
* Request deletion of your data
* Opt out of non-essential data collection (where applicable)

To exercise any of these rights, contact us at emailthedailyditto@gmail.com.

### **5. Children's Privacy**

Ditto is not intended for children under the age of 13 (or 16 in some jurisdictions). We do not knowingly collect personal data from children without parental consent.

### **6. Changes to This Policy**

We may update this Privacy Policy from time to time. If we make any significant changes, we'll notify you through the app or via email.

### **7. Contact Us**

If you have any questions or concerns about this Privacy Policy, feel free to contact us at:  
emailthedailyditto@gmail.com
`;

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [hasVoted, setHasVoted] = useState(false);

  useEffect(() => {
    const checkUserVote = async () => {
      if (user) {
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;
        const { data: question } = await supabase
          .from('daily_questions')
          .select('id')
          .eq('active_date', todayStr)
          .single();
        if (question) {
          const { data: voteData } = await supabase
            .from('votes')
            .select('id')
            .eq('question_id', question.id)
            .eq('user_id', user.id)
            .single();
          setHasVoted(!!voteData);
        } else {
          setHasVoted(false);
        }
      }
    };
    checkUserVote();
  }, [user]);

  return (
    <div className="min-h-screen bg-gray-50">
      <Header hasVoted={hasVoted} onLogoClick={() => navigate('/')} fixed={false} />
      <main className="content-area flex-1 flex flex-col">
        <div className="flex flex-col items-center justify-center bg-gray-50 relative pt-0">
          <Card className="w-full max-w-2xl p-8 mt-8 relative">
            <div className="absolute left-4 top-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(-1)}
                className="text-xl font-normal"
                aria-label="Back"
              >
                <ArrowLeft className="w-6 h-6 stroke-2" />
              </Button>
            </div>
            <h1 className="text-2xl font-bold mb-6 text-center">Privacy Policy</h1>
            <div className="prose max-w-none">
              <ReactMarkdown>{privacyPolicy}</ReactMarkdown>
            </div>
          </Card>
        </div>
      </main>
      <footer className="bg-white border-t">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 text-center">
          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} TheDailyDitto. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default PrivacyPolicy; 