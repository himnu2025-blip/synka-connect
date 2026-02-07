
-- Add comprehensive knowledge base entries for chatbot
INSERT INTO knowledge_base (title, content, category, is_active) VALUES

-- NFC Writing detailed guide
('NFC Writing Guide', 'How to write NFC card in Synka: Open the Synka app → Go to Settings → Tap "NFC Writer" → Turn on NFC on your phone → Tap "Write" → Place your NFC card on the back of your phone → Wait for the success confirmation. Note: NFC writing only works on Android phones using Chrome browser or the Synka app. iPhones cannot write NFC tags but can read them.', 'faq', true),

-- NFC Writing Troubleshooting
('NFC Write Troubleshooting', 'If NFC writing fails: 1) Make sure NFC is turned ON in your phone settings. 2) Hold the card steady on the back of your phone for 3-5 seconds. 3) Try moving the card slightly to find the NFC sweet spot. 4) Make sure you are using an Android phone. 5) If using the app, try Chrome browser instead. 6) iPhone users cannot write NFC tags - only Android can write.', 'faq', true),

-- Pro plan = Orange plan clarification
('Pro Plan Orange Plan', 'The Pro plan and Orange plan are the same thing in Synka. It is called the Orange plan. Orange plan pricing: ₹299/month (originally ₹599, 50% OFF) or ₹1999/year (originally ₹3999, 50% OFF - just ₹166/month). The Orange plan includes multiple cards, premium layouts, AI-generated about section, CRM features, email signatures, event tagging, and more.', 'pricing', true),

-- PVC Card = Plastic Card clarification
('PVC Plastic NFC Card', 'PVC card and plastic card are the same thing. Synka PVC NFC cards are made of durable PVC plastic material. Price: ₹999 → ₹499 (50% OFF Limited Period). PVC cards come in black matte, black gloss, and white gloss finishes. They are lightweight, durable, and look professional. Each PVC card is pre-programmed with your Synka profile link.', 'pricing', true),

-- Metal Card detailed
('Metal NFC Card Details', 'Metal NFC cards are premium cards made of stainless steel. Price: ₹2999 → ₹1499 (50% OFF Limited Period). Available colors: Black, Silver, Gold, and Rose Gold. Metal cards feel luxurious, are extremely durable, and make a strong impression. Each card is laser-engraved with your custom design and pre-programmed with your Synka profile.', 'pricing', true),

-- Card comparison
('NFC Card Comparison PVC vs Metal', 'PVC NFC Card: ₹499 (was ₹999) - Lightweight plastic, available in black matte, black gloss, white gloss. Metal NFC Card: ₹1499 (was ₹2999) - Premium stainless steel, available in Black, Silver, Gold, Rose Gold. Both types are pre-programmed with your Synka digital card link and work by tapping on any smartphone.', 'pricing', true),

-- Ordering NFC cards
('How to Order NFC Card', 'To order a physical NFC card: Open Synka → Go to Settings → Tap "Order NFC Card" → Choose PVC (₹499) or Metal (₹1499) → Select your preferred color/finish → Choose your design or let AI design it → Complete payment via Razorpay → Card will be delivered in 5-7 business days.', 'orders', true),

-- Free vs Orange plan comparison
('Free Plan vs Orange Plan Comparison', 'Free Plan: 1 digital card, basic layouts, QR code sharing, public link, contact capture, basic CRM. Orange (Pro) Plan: Multiple cards, premium layouts, AI-generated bio, advanced CRM with tags and events, email signatures, priority support, custom card designs. Orange plan: ₹299/month or ₹1999/year (50% OFF).', 'pricing', true),

-- What is Synka
('What is Synka App', 'Synka is a digital business card app that lets you create, share, and manage your professional identity digitally. Share your card via QR code, NFC tap, or direct link. Synka also includes a built-in CRM to manage all your contacts, event tagging, email signatures, and AI-powered features. Available as a web app and Android app.', 'general', true),

-- How to create card
('How to Create Digital Card', 'To create your digital business card in Synka: Sign up or log in → Fill in your details (name, company, designation, phone, email) → Add social links (LinkedIn, Instagram, etc.) → Choose a layout/design → Your card is ready to share! You can edit anytime from the My Card page.', 'features', true),

-- QR Code sharing
('QR Code Sharing', 'Your Synka QR code is unique and permanent. It always shows your default card. To share: Open My Card → Tap the QR icon → Show QR to the other person to scan → They instantly see your digital card. You can also download the QR code image and print it on visiting cards, standees, or stickers.', 'features', true),

-- Subscription management
('Cancel or Manage Subscription', 'To manage your Orange plan subscription: Go to Settings → Tap on your plan details → You can cancel, pause, or change your subscription. If you cancel, your plan remains active until the current billing period ends. After that, you switch back to the Free plan but keep your data.', 'faq', true),

-- Card design customization
('Card Design Customization', 'Synka offers multiple card design options: Choose from pre-built layouts, premium templates (Orange plan), or let AI generate a design. You can customize colors, add your photo, company logo, and social links. Premium layouts include gradient backgrounds, modern designs, and professional themes.', 'features', true),

-- Delivery and shipping
('Delivery Shipping Information', 'NFC card delivery takes 5-7 business days across India. Cards are shipped via courier with tracking. Shipping is included in the card price. You will receive a tracking number once your card is shipped. For bulk orders or international shipping, contact support@synka.in.', 'orders', true),

-- Business card scanner
('Business Card Scanner OCR', 'Synka has a built-in business card scanner. Open CRM → Tap the scan icon → Point camera at a physical business card → Synka uses AI/OCR to extract name, phone, email, company, and designation → Review and save the contact. This makes it easy to digitize paper business cards.', 'features', true);
