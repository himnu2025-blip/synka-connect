import { useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'getting-started' | 'setup' | 'features' | 'tips'>('getting-started');

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto px-4 py-8">
        
        {/* Header */}
        <div className="flex items-center justify-center mb-6">
          <BrandLogo size="lg" asLink={true} />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-10 space-y-4">
          <div className="inline-flex items-center px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-2">
            Welcome to SYNKA
          </div>
          <h1 className="text-4xl md:text-5xl font-bold">
            Meet Your Smart NFC Business Card
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Your complete guide to getting started with your Synka NFC card. Learn how to tap, scan, customize, and make the most of your digital business card.
          </p>
        </div>

        {/* Quick Start Card */}
        <Card className="mb-8 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
          <CardContent className="pt-6">
            <div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold mb-2">Quick Start in 3 Steps</h3>
                <div className="grid md:grid-cols-3 gap-4 mt-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">1</div>
                    <div>
                      <p className="font-medium">Tap or Scan</p>
                      <p className="text-sm text-muted-foreground">Hold card near phone or scan QR</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">2</div>
                    <div>
                      <p className="font-medium">View Profile</p>
                      <p className="text-sm text-muted-foreground">See contact info instantly</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">3</div>
                    <div>
                      <p className="font-medium">Save Contact</p>
                      <p className="text-sm text-muted-foreground">One-tap save to phone</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-8 p-1 bg-muted rounded-lg">
          <Button
            variant={activeTab === 'getting-started' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('getting-started')}
            className="flex-1 min-w-[140px]"
          >
            Getting Started
          </Button>
          <Button
            variant={activeTab === 'setup' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('setup')}
            className="flex-1 min-w-[140px]"
          >
            Setup Your Card
          </Button>
          <Button
            variant={activeTab === 'features' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('features')}
            className="flex-1 min-w-[140px]"
          >
            Features
          </Button>
          <Button
            variant={activeTab === 'tips' ? 'default' : 'ghost'}
            onClick={() => setActiveTab('tips')}
            className="flex-1 min-w-[140px]"
          >
            Tips & Care
          </Button>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          
          {/* GETTING STARTED TAB */}
          {activeTab === 'getting-started' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* How to Use Your Card */}
              <section>
                <h2 className="text-2xl font-bold mb-4">
                  How to Use Your Card
                </h2>
                
                <Accordion type="single" collapsible className="space-y-4">
                  
                  {/* NFC Tap */}
                  <AccordionItem value="nfc-tap" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      NFC Tap (Recommended)
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <div className="space-y-3">
                        <p className="font-medium text-foreground">For Smartphones (NFC-enabled):</p>
                        <ol className="list-decimal list-inside space-y-2 ml-2">
                          <li><strong>Ensure NFC is ON:</strong> Check your phone's settings → NFC/Wireless</li>
                          <li><strong>Unlock your phone</strong> (screen must be on)</li>
                          <li><strong>Hold the card</strong> near the back of the recipient's phone (usually top 1/3)</li>
                          <li><strong>Keep it steady</strong> for 1-2 seconds</li>
                          <li><strong>Wait for vibration</strong> or notification</li>
                          <li>Your profile opens automatically in their browser</li>
                        </ol>

                        <div className="bg-muted/50 rounded-lg p-4 mt-4">
                          <p className="font-medium mb-2">
                            Where to tap on different phones:
                          </p>
                          <ul className="space-y-1 text-sm ml-6">
                            <li>• <strong>iPhone:</strong> Top back (near camera)</li>
                            <li>• <strong>Samsung/Android:</strong> Center back or near camera</li>
                            <li>• <strong>Google Pixel:</strong> Center to top back</li>
                          </ul>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                          <p className="text-sm font-medium text-primary mb-2">Pro Tips:</p>
                          <ul className="text-sm space-y-1">
                            <li>• Remove thick phone cases for better connection</li>
                            <li>• Don't tap too fast - hold steady for 1-2 seconds</li>
                            <li>• Works through thin cases and wallets</li>
                            <li>• No app needed - works with any NFC-enabled phone</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* QR Scan */}
                  <AccordionItem value="qr-scan" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      QR Code Scanning
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <div className="space-y-3">
                        <p className="font-medium text-foreground">Three Ways to Scan:</p>
                        
                        <div className="space-y-3">
                          <div className="border-l-4 border-primary pl-4">
                            <p className="font-medium text-foreground">Method 1: Camera App (Easiest)</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                              <li>Open your phone's Camera app</li>
                              <li>Point at the QR code</li>
                              <li>Tap the notification that appears</li>
                            </ol>
                          </div>

                          <div className="border-l-4 border-primary/60 pl-4">
                            <p className="font-medium text-foreground">Method 2: Control Center (iPhone)</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                              <li>Swipe down from top-right (Control Center)</li>
                              <li>Tap the QR scanner icon</li>
                              <li>Scan the code</li>
                            </ol>
                          </div>

                          <div className="border-l-4 border-primary/40 pl-4">
                            <p className="font-medium text-foreground">Method 3: Quick Settings (Android)</p>
                            <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                              <li>Swipe down from top (Quick Settings)</li>
                              <li>Find "Scan QR code" tile</li>
                              <li>Tap and scan</li>
                            </ol>
                          </div>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4 mt-4">
                          <p className="font-medium mb-2">QR Code Locations on Your Card:</p>
                          <ul className="space-y-1 text-sm">
                            <li>• <strong>Front:</strong> Main QR code (usually visible)</li>
                            <li>• <strong>Back:</strong> Alternative QR code</li>
                            <li>• Both codes work the same way</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Link Sharing */}
                  <AccordionItem value="link-share" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Share Your Link
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <div className="space-y-3">
                        <p>Your Synka card has a unique personal link that you can share anywhere:</p>
                        
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-mono text-sm text-primary">synka.in/u/yourname</p>
                        </div>

                        <p className="font-medium text-foreground">Where to Share:</p>
                        <div className="grid md:grid-cols-2 gap-3">
                          <div className="border rounded-lg p-3">
                            <p className="font-medium text-sm">Email Signature</p>
                            <p className="text-xs mt-1">Add to your email footer</p>
                          </div>
                          <div className="border rounded-lg p-3">
                            <p className="font-medium text-sm">WhatsApp/SMS</p>
                            <p className="text-xs mt-1">Send directly in messages</p>
                          </div>
                          <div className="border rounded-lg p-3">
                            <p className="font-medium text-sm">LinkedIn Bio</p>
                            <p className="text-xs mt-1">Add to profile or posts</p>
                          </div>
                          <div className="border rounded-lg p-3">
                            <p className="font-medium text-sm">Social Media</p>
                            <p className="text-xs mt-1">Instagram, Twitter, etc.</p>
                          </div>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                          <p className="text-sm font-medium text-primary mb-2">Smart Tip:</p>
                          <p className="text-sm">Use the Share button in your card to send via WhatsApp, Email, SMS, or copy the link!</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </section>

              {/* What Happens When Someone Scans */}
              <section>
                <h2 className="text-2xl font-bold mb-4">What Happens When Someone Taps/Scans?</h2>
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-4">
                      <div>
                        <div>
                          <p className="font-medium">Instant Profile View</p>
                          <p className="text-sm text-muted-foreground">Your digital card opens in their web browser</p>
                        </div>
                      </div>
                      <div>
                        <div>
                          <p className="font-medium">All Contact Info Visible</p>
                          <p className="text-sm text-muted-foreground">Name, company, role, phone, email, social links</p>
                        </div>
                      </div>
                      <div>
                        <div>
                          <p className="font-medium">One-Tap Actions</p>
                          <p className="text-sm text-muted-foreground">Call, email, WhatsApp, or save contact directly</p>
                        </div>
                      </div>
                      <div>
                        <div>
                          <p className="font-medium">No App Required</p>
                          <p className="text-sm text-muted-foreground">Works on any smartphone with NFC or camera</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </section>

            </div>
          )}

          {/* SETUP YOUR CARD TAB */}
          {activeTab === 'setup' && (
            <div className="space-y-6 animate-fade-in">
              
              <section>
                <h2 className="text-2xl font-bold mb-4">
                  Setup & Customize Your Card
                </h2>

                <Accordion type="single" collapsible className="space-y-4">

                  {/* Create Account */}
                  <AccordionItem value="create-account" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Step 1: Create Your Account
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <ol className="list-decimal list-inside space-y-3 ml-2">
                        <li>
                          <strong>Visit</strong> <span className="font-mono text-primary">synka.in</span> or download the Synka app
                        </li>
                        <li><strong>Sign up</strong> with your phone number or email</li>
                        <li><strong>Verify</strong> with the OTP sent to you</li>
                        <li>You're in! Your digital card is automatically created</li>
                      </ol>

                      <div className="bg-muted/50 rounded-lg p-4 mt-4">
                        <p className="font-medium mb-2">App Available On:</p>
                        <div className="flex gap-3">
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://play.google.com/store/apps/details?id=com.synka.app" target="_blank" rel="noopener noreferrer">
                              Google Play
                            </a>
                          </Button>
                          <Button variant="outline" size="sm" asChild>
                            <a href="https://apps.apple.com/app/synka" target="_blank" rel="noopener noreferrer">
                              App Store
                            </a>
                          </Button>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Edit Profile */}
                  <AccordionItem value="edit-profile" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Step 2: Edit Your Profile
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Go to <strong>My Card</strong> section and fill in:</p>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Basic Information</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• Full Name</li>
                            <li>• Company Name</li>
                            <li>• Job Title / Role</li>
                            <li>• Short Bio (optional)</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Contact Details</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• Phone Number</li>
                            <li>• Email Address</li>
                            <li>• Website URL</li>
                            <li>• WhatsApp Number</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Social Links</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• LinkedIn Profile</li>
                            <li>• Instagram, Twitter, Facebook</li>
                            <li>• YouTube, TikTok</li>
                            <li>• Any custom links</li>
                          </ul>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                        <p className="text-sm font-medium text-primary mb-2">All changes save automatically!</p>
                        <p className="text-sm">No need to click "Save" - your card updates in real-time</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Upload Photos */}
                  <AccordionItem value="upload-photos" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Step 3: Upload Photos
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <div className="space-y-4">
                        <div>
                          <p className="font-medium text-foreground mb-2">Profile Photo:</p>
                          <ul className="space-y-2 text-sm ml-4">
                            <li>• Tap on the profile image placeholder</li>
                            <li>• Choose from Gallery or Take New Photo</li>
                            <li>• Crop and adjust as needed</li>
                            <li>• Best: Professional headshot, clear background</li>
                          </ul>
                        </div>

                        <div>
                          <p className="font-medium text-foreground mb-2">Company Logo:</p>
                          <ul className="space-y-2 text-sm ml-4">
                            <li>• Tap on logo section</li>
                            <li>• Upload your company/brand logo</li>
                            <li>• PNG or JPG format recommended</li>
                            <li>• Transparent background works best</li>
                          </ul>
                        </div>

                        <div>
                          <p className="font-medium text-foreground mb-2">Cover Image (Optional):</p>
                          <ul className="space-y-2 text-sm ml-4">
                            <li>• Add a header/banner image</li>
                            <li>• Showcases your work or brand</li>
                            <li>• Landscape format preferred</li>
                          </ul>
                        </div>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium mb-2 text-sm">Photo Tips:</p>
                          <ul className="text-xs space-y-1">
                            <li>• Use high-quality images (not blurry)</li>
                            <li>• Good lighting for profile photos</li>
                            <li>• Face should be clearly visible</li>
                            <li>• Images auto-optimize for fast loading</li>
                          </ul>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Choose Design */}
                  <AccordionItem value="design-layout" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Step 4: Choose Design Layout
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Synka offers multiple card layouts to match your style:</p>
                      
                      <div className="grid md:grid-cols-2 gap-3">
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <p className="font-medium text-foreground mb-1">Classic Layout</p>
                          <p className="text-xs">Traditional business card style</p>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <p className="font-medium text-foreground mb-1">Modern Layout</p>
                          <p className="text-xs">Clean, minimal design</p>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <p className="font-medium text-foreground mb-1">Creative Layout</p>
                          <p className="text-xs">Bold and colorful</p>
                        </div>
                        <div className="border rounded-lg p-3 bg-muted/30">
                          <p className="font-medium text-foreground mb-1">Professional Layout</p>
                          <p className="text-xs">Corporate and elegant</p>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-foreground mb-2">How to Change Layout:</p>
                        <ol className="list-decimal list-inside space-y-1 text-sm ml-2">
                          <li>Go to "My Card" section</li>
                          <li>Tap on "Change Layout" or layout icon</li>
                          <li>Preview different styles</li>
                          <li>Select your favorite</li>
                          <li>Updates instantly!</li>
                        </ol>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary mb-1">Orange (Pro) Feature:</p>
                        <p className="text-sm">Access premium layouts and custom color themes with Orange upgrade</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Multiple Cards */}
                  <AccordionItem value="multiple-cards" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Managing Multiple Cards (Orange)
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>With Orange (Pro) subscription, create multiple digital cards for different contexts:</p>
                      
                      <div className="space-y-3">
                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Professional Card</p>
                          <p className="text-sm">For work contacts and business networking</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Creative Card</p>
                          <p className="text-sm">For freelance projects and portfolio</p>
                        </div>
                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Team Cards</p>
                          <p className="text-sm">Different cards for different roles or departments</p>
                        </div>
                      </div>

                      <div>
                        <p className="font-medium text-foreground mb-2">Setting Your Default Card:</p>
                        <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                          <li>Go to Dashboard or My Card section</li>
                          <li>View all your cards</li>
                          <li>Tap the star icon on the card you want as default</li>
                          <li>This card will open when anyone taps your NFC or scans QR</li>
                        </ol>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="font-medium mb-2">Switch Anytime:</p>
                        <p className="text-sm">Change your default card as many times as you want. Your physical card and QR always point to your default card - no reprinting needed!</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Upload Documents */}
                  <AccordionItem value="upload-documents" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Upload Documents & Files (Orange)
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Orange users can attach files directly to their digital cards:</p>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">What You Can Upload:</p>
                          <ul className="mt-2 space-y-1 text-sm">
                            <li>• Product Catalogues (PDF)</li>
                            <li>• Business Presentations</li>
                            <li>• Price Lists</li>
                            <li>• Portfolios</li>
                            <li>• Brochures</li>
                            <li>• Company Profile</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">How to Upload:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Go to My Card → Documents section</li>
                            <li>Tap "Upload Document"</li>
                            <li>Choose file from device</li>
                            <li>Add a title/description</li>
                            <li>File appears on your card automatically</li>
                          </ol>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="font-medium mb-2 text-sm">Supported Formats:</p>
                        <p className="text-xs">PDF, DOC, DOCX, PPT, PPTX, JPG, PNG</p>
                        <p className="text-xs mt-2">Max file size: 10MB per file</p>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary mb-1">Use Case:</p>
                        <p className="text-sm">Perfect for sales meetings - share your product catalogue instantly when someone taps your card!</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Write NFC Card */}
                  <AccordionItem value="write-nfc" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Step 5: Write NFC Card
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Program your NFC card to link directly to your digital profile:</p>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">How to Write Your NFC Card:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-2 text-sm">
                            <li>Go to <strong>Settings</strong> page in the app</li>
                            <li>Tap on <strong>Write NFC Card</strong> option</li>
                            <li>Hold your NFC card near the back of your phone</li>
                            <li>Keep it steady until you see the success message</li>
                            <li>Your card is now programmed with your profile link!</li>
                          </ol>
                        </div>
                      </div>

                      <div className="bg-muted/50 rounded-lg p-4">
                        <p className="font-medium mb-2 text-sm">Requirements:</p>
                        <ul className="text-xs space-y-1">
                          <li>• NFC-enabled smartphone</li>
                          <li>• NFC must be turned ON in phone settings</li>
                          <li>• Blank or rewritable NFC card</li>
                        </ul>
                      </div>

                      <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                        <p className="text-sm font-medium text-primary mb-1">Pro Tip:</p>
                        <p className="text-sm">You can rewrite your NFC card anytime if you change your default card or profile link!</p>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </section>

            </div>
          )}

          {/* FEATURES TAB */}
          {activeTab === 'features' && (
            <div className="space-y-6 animate-fade-in">
              
              <section>
                <h2 className="text-2xl font-bold mb-4">Powerful Features at Your Fingertips</h2>

                <Accordion type="single" collapsible className="space-y-4">

                  {/* Analytics */}
                  <AccordionItem value="analytics" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Analytics & Insights
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Track how people interact with your card:</p>
                      
                      <div className="grid gap-3">
                        <div className="flex items-start gap-3 border rounded-lg p-3">
                          <div className="p-2 rounded bg-primary/10">
                            <div className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">Profile Views</p>
                            <p className="text-sm">See how many people viewed your card</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 border rounded-lg p-3">
                          <div className="p-2 rounded bg-primary/10">
                            <div className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">Click Tracking</p>
                            <p className="text-sm">Monitor which links get the most clicks</p>
                          </div>
                        </div>

                        <div className="flex items-start gap-3 border rounded-lg p-3">
                          <div className="p-2 rounded bg-primary/10">
                            <div className="h-4 w-4 text-primary" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-foreground">Scan History</p>
                            <p className="text-sm">Know when and where your card was shared</p>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm">Access analytics from your Dashboard</p>
                    </AccordionContent>
                  </AccordionItem>

                  {/* CRM */}
                  <AccordionItem value="crm" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Built-in CRM
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Manage all your contacts in one place:</p>
                      
                      <div className="space-y-3">
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Automatic Contact Capture</p>
                          <p className="text-sm mt-1">When someone saves your contact, they're added to your CRM automatically</p>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Add Notes</p>
                          <p className="text-sm mt-1">Keep track of conversations, meetings, and follow-ups</p>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Tag Contacts</p>
                          <p className="text-sm mt-1">Organize by categories: Client, Lead, Partner, etc.</p>
                        </div>

                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">Follow-up Reminders</p>
                          <p className="text-sm mt-1">Never miss an important follow-up</p>
                        </div>
                      </div>

                      <p className="text-sm font-medium text-primary">Access CRM from the navigation menu</p>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Contact Exchange */}
                  <AccordionItem value="mutual-exchange" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Mutual Contact Exchange
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Exchange contacts seamlessly with other Synka users:</p>
                      
                      <div className="space-y-3">
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-2">How It Works:</p>
                          <ol className="list-decimal list-inside space-y-2 text-sm">
                            <li>Tap your card with another Synka user</li>
                            <li>Both of you see each other's profiles</li>
                            <li>Choose to "Exchange Contacts"</li>
                            <li>Both contacts are saved automatically to each other's CRM</li>
                          </ol>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
                          <p className="text-sm font-medium text-primary mb-1">Instant & Effortless</p>
                          <p className="text-sm">No manual typing, no phone number exchange, no app switching</p>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Email Signature */}
                  <AccordionItem value="email-signature" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Email Signature Generator
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Create a professional email signature with your Synka card link:</p>
                      
                      <div className="space-y-3">
                        <ol className="list-decimal list-inside space-y-2 text-sm ml-2">
                          <li>Go to Settings → Email Signature</li>
                          <li>Customize your signature design</li>
                          <li>Add your Synka card link</li>
                          <li>Copy the HTML code</li>
                          <li>Paste into your email client settings</li>
                        </ol>

                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium mb-2 text-sm">Works with:</p>
                          <div className="flex flex-wrap gap-2">
                            <span className="text-xs bg-background px-2 py-1 rounded">Gmail</span>
                            <span className="text-xs bg-background px-2 py-1 rounded">Outlook</span>
                            <span className="text-xs bg-background px-2 py-1 rounded">Apple Mail</span>
                            <span className="text-xs bg-background px-2 py-1 rounded">Thunderbird</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-sm">Every email you send promotes your digital card!</p>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Widgets */}
                  <AccordionItem value="widgets" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Widgets (Phone & Watch)
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <p>Add your QR code as a widget for instant sharing:</p>
                      
                      <div className="space-y-4">
                        {/* iOS Widgets */}
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">📱 iPhone Widget:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Long press on home screen</li>
                            <li>Tap "+" to add widget</li>
                            <li>Search for "Synka"</li>
                            <li>Select QR widget size</li>
                            <li>Add to home screen</li>
                          </ol>
                        </div>

                        <div className="border-l-4 border-blue-500/60 pl-4">
                          <p className="font-medium text-foreground">⌚ Apple Watch:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Open Watch app on iPhone</li>
                            <li>Go to Face Gallery or edit watch face</li>
                            <li>Add "Synka QR" complication</li>
                            <li>Your QR code appears on your wrist!</li>
                          </ol>
                        </div>

                        {/* Android Widgets */}
                        <div className="border-l-4 border-primary/60 pl-4">
                          <p className="font-medium text-foreground">📱 Android Widget:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Long press on home screen</li>
                            <li>Tap "Widgets"</li>
                            <li>Find Synka widgets</li>
                            <li>Drag QR widget to screen</li>
                          </ol>
                        </div>

                        <div className="border-l-4 border-green-500/60 pl-4">
                          <p className="font-medium text-foreground">⌚ Wear OS Watch:</p>
                          <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                            <li>Swipe up on your watch</li>
                            <li>Go to Tiles settings</li>
                            <li>Add "Synka QR Code" tile</li>
                            <li>Swipe to access your QR anytime!</li>
                          </ol>
                        </div>
                      </div>

                      <p className="text-sm text-primary font-medium">Your QR code syncs automatically across all your devices!</p>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </section>

            </div>
          )}

          {/* TIPS & CARE TAB */}
          {activeTab === 'tips' && (
            <div className="space-y-6 animate-fade-in">
              
              <section>
                <h2 className="text-2xl font-bold mb-4">
                  Tips & Card Care
                </h2>

                <Accordion type="single" collapsible className="space-y-4">

                  {/* Best Practices */}
                  <AccordionItem value="best-practices" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Best Practices for Using Your Card
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      <div className="space-y-4">
                        
                        <div className="border-l-4 border-green-500 pl-4">
                          <p className="font-medium text-foreground">
                            DO's:
                          </p>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li>✓ Keep your profile information up-to-date</li>
                            <li>✓ Use a clear, professional profile photo</li>
                            <li>✓ Test your card after major updates</li>
                            <li>✓ Add multiple contact methods (phone, email, WhatsApp)</li>
                            <li>✓ Keep your physical card in your wallet or card holder</li>
                            <li>✓ Share your card link in email signatures and social media</li>
                            <li>✓ Regularly check analytics to see engagement</li>
                            <li>✓ Follow up with contacts saved in your CRM</li>
                          </ul>
                        </div>

                        <div className="border-l-4 border-red-500 pl-4">
                          <p className="font-medium text-foreground">
                            DON'Ts:
                          </p>
                          <ul className="mt-2 space-y-2 text-sm">
                            <li>✗ Don't leave profile fields empty - complete your card</li>
                            <li>✗ Don't use blurry or inappropriate photos</li>
                            <li>✗ Don't forget to set a default card if you have multiple</li>
                            <li>✗ Don't share incorrect contact information</li>
                            <li>✗ Don't ignore contact exchange notifications</li>
                            <li>✗ Don't keep outdated job titles or company names</li>
                          </ul>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Card Care */}
                  <AccordionItem value="card-care" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Physical Card Care & Maintenance
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      
                      <div className="space-y-4">
                        
                        {/* PVC Card Care */}
                        <div className="bg-blue-500/5 border border-blue-500/20 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-3">For PVC Cards:</p>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span>Store in wallet, card holder, or protective sleeve</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Clean with soft cloth if dirty</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Avoid bending or twisting</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Keep away from water and heat</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Don't scratch the surface or QR code</span>
                            </li>
                          </ul>
                        </div>

                        {/* Metal Card Care */}
                        <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-3">For Metal Cards:</p>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-start gap-2">
                              <span>More durable than PVC but still needs care</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Polish with microfiber cloth to maintain shine</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Can withstand water but dry it properly</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Store separately from keys to avoid scratches</span>
                            </li>
                            <li className="flex items-start gap-2">
                              <span>Don't drop on hard surfaces</span>
                            </li>
                          </ul>
                        </div>

                        {/* General Tips */}
                        <div className="bg-muted/50 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-2">Important:</p>
                          <ul className="space-y-2 text-sm">
                            <li>• NFC chip is delicate - avoid sharp impacts</li>
                            <li>• Keep away from strong magnets</li>
                            <li>• Don't stack too many cards together (can interfere with NFC)</li>
                            <li>• If card stops working, contact support for replacement</li>
                          </ul>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Troubleshooting */}
                  <AccordionItem value="troubleshooting" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Common Issues & Solutions
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      
                      <div className="space-y-3">
                        
                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Card Not Tapping/Reading</p>
                          <ul className="mt-2 space-y-1 text-sm ml-4">
                            <li>✓ Check if NFC is enabled on the phone</li>
                            <li>✓ Remove thick phone case</li>
                            <li>✓ Hold card longer (2-3 seconds)</li>
                            <li>✓ Try different position on back of phone</li>
                            <li>✓ Ensure phone screen is unlocked</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">QR Code Not Scanning</p>
                          <ul className="mt-2 space-y-1 text-sm ml-4">
                            <li>✓ Clean the card surface</li>
                            <li>✓ Ensure good lighting</li>
                            <li>✓ Hold camera steady</li>
                            <li>✓ Try different angle</li>
                            <li>✓ Use native Camera app (not third-party)</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Profile Not Loading</p>
                          <ul className="mt-2 space-y-1 text-sm ml-4">
                            <li>✓ Check internet connection</li>
                            <li>✓ Try refreshing the page</li>
                            <li>✓ Clear browser cache</li>
                            <li>✓ Verify your profile is complete in app</li>
                          </ul>
                        </div>

                        <div className="border rounded-lg p-3">
                          <p className="font-medium text-foreground">Can't Edit Card</p>
                          <ul className="mt-2 space-y-1 text-sm ml-4">
                            <li>✓ Ensure you're logged in</li>
                            <li>✓ Check internet connection</li>
                            <li>✓ Update app to latest version</li>
                            <li>✓ Log out and log back in</li>
                          </ul>
                        </div>

                        <div className="bg-primary/5 border border-primary/20 rounded-lg p-4 mt-4">
                          <p className="text-sm font-medium text-primary mb-2">Still Need Help?</p>
                          <p className="text-sm">Contact our support team:</p>
                          <div className="flex flex-col gap-2 mt-3">
                            <Button variant="outline" size="sm" onClick={() => navigate('/support')}>
                              Visit Support Center
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href="https://wa.me/919876543210" target="_blank" rel="noopener noreferrer">
                                WhatsApp Support
                              </a>
                            </Button>
                            <Button variant="outline" size="sm" asChild>
                              <a href="mailto:support@synka.in">
                                Email: support@synka.in
                              </a>
                            </Button>
                          </div>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>

                  {/* Precautions */}
                  <AccordionItem value="precautions" className="bg-card border border-border rounded-xl px-4">
                    <AccordionTrigger className="text-foreground font-semibold">
                      Important Precautions
                    </AccordionTrigger>
                    <AccordionContent className="text-muted-foreground space-y-4">
                      
                      <div className="space-y-3">
                        
                        <div className="bg-yellow-500/5 border border-yellow-500/20 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-2">
                            Privacy & Security:
                          </p>
                          <ul className="space-y-2 text-sm">
                            <li>• Only share information you're comfortable making public</li>
                            <li>• You can hide specific fields (e.g., personal phone, email)</li>
                            <li>• Use business email/phone if you want to keep personal separate</li>
                            <li>• Your card is viewable by anyone with the link - plan accordingly</li>
                          </ul>
                        </div>

                        <div className="bg-red-500/5 border border-red-500/20 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-2">
                            What NOT to Do:
                          </p>
                          <ul className="space-y-2 text-sm">
                            <li>❌ Don't share your account password with anyone</li>
                            <li>❌ Don't put your card in washing machine</li>
                            <li>❌ Don't expose to extreme temperatures</li>
                            <li>❌ Don't try to modify or open the card</li>
                            <li>❌ Don't place near magnets or magnetic strips</li>
                            <li>❌ Don't share sensitive personal info on public card</li>
                          </ul>
                        </div>

                        <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4">
                          <p className="font-medium text-foreground mb-2">Safety Tips:</p>
                          <ul className="space-y-2 text-sm">
                            <li>• Enable two-factor authentication in settings</li>
                            <li>• Use strong password for your account</li>
                            <li>• Regularly review who has accessed your card (analytics)</li>
                            <li>• You can deactivate card anytime from settings if needed</li>
                            <li>• Report suspicious activity to support immediately</li>
                          </ul>
                        </div>

                      </div>
                    </AccordionContent>
                  </AccordionItem>

                </Accordion>
              </section>

            </div>
          )}

        </div>

        {/* Footer CTA */}
        <div className="mt-12 text-center space-y-6">
          <div className="border-t pt-8">
            <h3 className="text-2xl font-bold mb-3">Ready to Get Started?</h3>
            <p className="text-muted-foreground mb-6">
              Create your account and start networking smarter
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button size="lg" onClick={() => navigate('/signup')} className="group">
                Create Your Free Card
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate('/support')}>
                Browse FAQs
              </Button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="pt-8 border-t">
            <p className="text-sm text-muted-foreground mb-4">Need More Help?</p>
            <div className="flex flex-wrap justify-center gap-4 text-sm">
              <Button variant="link" onClick={() => navigate('/support')}>Support Center</Button>
              <Button variant="link" onClick={() => navigate('/contact')}>Contact Us</Button>
              <Button variant="link" onClick={() => navigate('/settings/upgrade')}>Upgrade to Orange</Button>
            </div>
          </div>

          {/* Trust Badges */}
          <div className="pt-6 pb-8">
            <div className="flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
              <div>Secure & Private</div>
              <div>Instant Updates</div>
              <div>10,000+ Users</div>
              <div>Made in India</div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
