import React, { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Header from '@/components/Header';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

const termsOfService = `## **Terms of Service for Ditto**

**Effective Date: 5/1/2025**

Welcome to Ditto! These Terms of Service ("Terms") govern your use of our app and services. By accessing or using Ditto, you agree to these Terms. If you do not agree, please do not use the app.

### **1. Overview of Ditto**

Ditto is a social app that presents users with a daily question and compares their answers with those of others. It is designed for fun, insight, and connection—not for collecting or distributing personal information beyond what's stated in our Privacy Policy.

### **2. Eligibility**

You must be at least 13 years old (or 16 in some jurisdictions) to use Ditto. By using the app, you confirm that you meet this age requirement.

### **3. User Conduct**

By using Ditto, you agree to:
* Provide accurate and honest information during sign-up
* Only use the app for lawful, non-commercial purposes
* Not harass, abuse, or impersonate others
* Not attempt to access or alter the data of other users
* Not use bots, scripts, or other automated systems to interact with the app

We reserve the right to suspend or delete accounts that violate these guidelines.

### **4. Intellectual Property**

All content, design, code, and branding related to Ditto are owned by us or licensed to us. You may not copy, modify, or distribute any part of Ditto without our written permission.

### **5. Your Content**

When you answer questions or share content within Ditto, you grant us a non-exclusive, royalty-free license to use that content internally for analytics, product improvement, and research purposes. We may also use and share aggregated, anonymized data derived from user content — such as usage trends or demographic insights — provided that such information does not identify you personally.
We will never sell or share your individual content or personal information (such as your name or email) with third parties for their own commercial purposes.

### **6. Disclaimer of Warranties**

Ditto is provided "as is" and "as available." We make no guarantees that the app will be error-free or always available. Use of the app is at your own risk.

### **7. Limitation of Liability**

To the fullest extent permitted by law, Ditto and its team are not liable for any indirect, incidental, or consequential damages related to your use of the app.

### **8. Termination**

We reserve the right to suspend or terminate your access to Ditto at any time if we believe you've violated these Terms.

### **9. Ads and Monetization**

Ditto may display interstitial or banner ads as part of the experience. These ads help support the app and may be served through third-party providers.

### **10. Changes to the Terms**

We may update these Terms from time to time. When we do, we'll notify users in-app or via email. Continued use of Ditto means you accept any revised terms.

### **11. Contact Us**

Have questions about these Terms? Contact us at:

emailthedailyditto@gmail.com
`;

const TermsOfService: React.FC = () => {
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
      <Header hasVoted={hasVoted} onLogoClick={() => navigate('/')} fixed={false} streak={0} />
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
            <h1 className="text-2xl font-bold mb-6 text-center">Terms of Service</h1>
            <div className="prose max-w-none">
              <ReactMarkdown>{termsOfService}</ReactMarkdown>
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

export default TermsOfService; 