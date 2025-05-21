import React from 'react';
import { Card } from '@/components/ui/card';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import Logo from '@/components/Logo';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { GearIcon } from '@/components/ui/button';

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

To exercise any of these rights, contact us at theofficialditto@gmail.com.

### **5. Children's Privacy**

Ditto is not intended for children under the age of 13 (or 16 in some jurisdictions). We do not knowingly collect personal data from children without parental consent.

### **6. Changes to This Policy**

We may update this Privacy Policy from time to time. If we make any significant changes, we'll notify you through the app or via email.

### **7. Contact Us**

If you have any questions or concerns about this Privacy Policy, feel free to contact us at:  
theofficialditto@gmail.com
`;

const PrivacyPolicy: React.FC = () => {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 py-2 sm:px-6 flex items-center justify-between">
          <Logo />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Settings"
                  className="text-gray-500 hover:text-gray-700 text-2xl h-8 w-8"
                >
                  <GearIcon className="w-full h-full" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => navigate('/how-to-play')}>How to Play</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/contact')}>Contact Us</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/privacy-policy')}>Privacy Policy</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/terms-of-service')}>Terms of Service</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(-1)}>Back</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      {/* Main content */}
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 relative pt-0">
        <Card className="w-full max-w-2xl p-8 mt-8 relative">
          <div className="absolute left-4 top-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-xl font-normal"
              aria-label="Back"
            >
              ←
            </Button>
          </div>
          <h1 className="text-2xl font-bold mb-6 text-center">Privacy Policy</h1>
          <div className="prose max-w-none">
            <ReactMarkdown>{privacyPolicy}</ReactMarkdown>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default PrivacyPolicy; 