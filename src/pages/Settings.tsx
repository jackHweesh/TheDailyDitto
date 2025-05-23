import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ReactMarkdown from 'react-markdown';

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

When you answer questions or share content within Ditto, you grant us a non-exclusive, royalty-free license to use that content internally for analytics and app improvement. We will never sell or share your content with third parties for commercial purposes.

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

const Settings: React.FC = () => {
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showTerms, setShowTerms] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-xl p-8 mt-8">
        <h1 className="text-2xl font-bold mb-6">Settings</h1>
        <div className="flex flex-col gap-4">
          <Button variant="outline" onClick={() => setShowPrivacy(true)}>
            Privacy Policy
          </Button>
          <Button variant="outline" onClick={() => setShowTerms(true)}>
            Terms of Service
          </Button>
        </div>
      </Card>
      {showPrivacy && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 overflow-y-auto max-h-[80vh]">
            <h2 className="text-xl font-bold mb-4">Privacy Policy</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{privacyPolicy}</ReactMarkdown>
            </div>
            <Button className="mt-6" onClick={() => setShowPrivacy(false)}>Close</Button>
          </Card>
        </div>
      )}
      {showTerms && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <Card className="w-full max-w-2xl p-6 overflow-y-auto max-h-[80vh]">
            <h2 className="text-xl font-bold mb-4">Terms of Service</h2>
            <div className="prose max-w-none">
              <ReactMarkdown>{termsOfService}</ReactMarkdown>
            </div>
            <Button className="mt-6" onClick={() => setShowTerms(false)}>Close</Button>
          </Card>
        </div>
      )}
    </div>
  );
};

export default Settings; 