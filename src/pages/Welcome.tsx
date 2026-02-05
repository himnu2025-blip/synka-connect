import { useState } from 'react';
import { BrandLogo } from '@/components/BrandLogo';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Smartphone, 
  Share2, 
  Settings, 
  Sparkles,
  ArrowRight,
  ChevronRight,
  Wifi,
  QrCode,
  Edit3,
  UserPlus,
  Zap
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Welcome() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'setup' | 'use' | 'features'>('setup');

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/20">
      <div className="max-w-4xl mx-auto px-6 py-12">
        
        {/* Premium Header */}
        <div className="flex items-center justify-center mb-8">
          <BrandLogo size="lg" asLink={true} />
        </div>

        {/* Elegant Hero Section */}
        <div className="text-center mb-16 space-y-6">
          <div className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-primary tracking-wide">Your Premium Experience Begins</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-light tracking-tight">
            Welcome to <span className="font-semibold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">SYNKA</span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto font-light leading-relaxed">
            Your intelligent NFC business card. Effortlessly share your professional identity with a simple tap.
          </p>
        </div>

        {/* Minimalist Quick Start */}
        <Card className="mb-12 border-primary/10 bg-gradient-to-br from-card via-card to-primary/5 shadow-xl backdrop-blur-sm">
          <CardContent className="pt-8 pb-8">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10">
                <Zap className="h-7 w-7 text-primary" />
              </div>
              <div className="flex-1 space-y-6">
                <h3 className="text-2xl font-light">Three Simple Steps</h3>
                <div className="grid md:grid-cols-3 gap-6">
                  {[
                    { number: '01', title: 'Tap or Scan', desc: 'Hold near phone' },
                    { number: '02', title: 'View Profile', desc: 'Information displays' },
                    { number: '03', title: 'Save Contact', desc: 'One-tap save' }
                  ].map((step) => (
                    <div key={step.number} className="flex items-start gap-4">
                      <div className="flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-primary to-primary/70 text-primary-foreground flex items-center justify-center font-light text-lg">
                        {step.number}
                      </div>
                      <div>
                        <p className="font-medium mb-1">{step.title}</p>
                        <p className="text-sm text-muted-foreground">{step.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Refined Tab Navigation */}
        <div className="flex gap-3 mb-10 p-1.5 bg-muted/50 rounded-2xl border border-border/50">
          {[
            { id: 'setup', label: 'Setup Guide', icon: Settings },
            { id: 'use', label: 'How to Use', icon: Smartphone },
            { id: 'features', label: 'Features', icon: Sparkles }
          ].map((tab) => (
            <Button
              key={tab.id}
              variant={activeTab === tab.id ? 'default' : 'ghost'}
              onClick={() => setActiveTab(tab.id as any)}
              className="flex-1 h-12 gap-2 font-normal"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </Button>
          ))}
        </div>

        {/* Premium Content Sections */}
        <div className="space-y-8">
          
          {/* SETUP TAB */}
          {activeTab === 'setup' && (
            <div className="space-y-6 animate-fade-in">
              
              <Accordion type="single" collapsible className="space-y-4">
                
                {/* Step 1: Create Profile */}
                <AccordionItem value="create-profile" className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <UserPlus className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Step 1: Create Your Digital Profile</p>
                        <p className="text-sm text-muted-foreground font-normal">Complete your professional information</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
                    <div className="space-y-3 ml-14">
                      <p className="text-foreground/90 leading-relaxed">Navigate to your profile and add:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Full name, company, and designation</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Contact details (phone, email, location)</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Professional photo and cover image</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Social media links and website</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Professional bio and tagline</span>
                        </li>
                      </ul>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/mycard')}
                        className="mt-4"
                      >
                        <Edit3 className="h-4 w-4 mr-2" />
                        Edit My Profile
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 2: Customize Card */}
                <AccordionItem value="customize" className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Sparkles className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Step 2: Customize Your Card Design</p>
                        <p className="text-sm text-muted-foreground font-normal">Choose from premium templates</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
                    <div className="space-y-3 ml-14">
                      <p className="text-foreground/90 leading-relaxed">Personalize your digital card:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Select from elegant template designs</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Adjust colors to match your brand</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Choose which information to display</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Preview your card before publishing</span>
                        </li>
                      </ul>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => navigate('/mycard')}
                        className="mt-4"
                      >
                        Customize Design
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 3: Write to NFC Card */}
                <AccordionItem value="write-nfc" className="bg-gradient-to-br from-card/50 to-primary/5 backdrop-blur-sm border border-primary/20 rounded-2xl px-6 shadow-md">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/30 to-primary/20 flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Step 3: Write Your Data to NFC Card</p>
                        <p className="text-sm text-muted-foreground font-normal">Program your physical card (Orange Plan)</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-6 pt-2 pb-6">
                    <div className="space-y-4 ml-14">
                      
                      <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="text-sm font-medium text-amber-700 dark:text-amber-400 mb-2">
                          🔒 Orange Plan Feature
                        </p>
                        <p className="text-sm text-amber-600/90 dark:text-amber-400/90">
                          NFC card writing is available exclusively for Orange plan subscribers. Upgrade to unlock this premium feature.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <p className="text-foreground/90 font-medium">How to Write Your NFC Card:</p>
                        
                        <div className="space-y-3 text-sm">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              1
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Open Settings</p>
                              <p className="text-muted-foreground">Navigate to Settings from the bottom menu</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              2
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Find NFC Writer</p>
                              <p className="text-muted-foreground">Scroll down to locate the "NFC Writer" option</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              3
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Review Your Information</p>
                              <p className="text-muted-foreground">Check that your profile details are correct (auto-filled from your card)</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              4
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Click "Write to NFC"</p>
                              <p className="text-muted-foreground">The system will prompt you to tap your NFC card</p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                              5
                            </div>
                            <div>
                              <p className="font-medium text-foreground">Hold Card Near Device</p>
                              <p className="text-muted-foreground">Place your NFC card on the back of your phone until you see confirmation</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 space-y-2">
                        <p className="text-sm font-medium text-primary">What Gets Written:</p>
                        <ul className="space-y-1 text-sm">
                          <li className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Your public profile URL (for online viewing)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>vCard data (for offline contact saving)</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                            <span>Name, company, phone, email, and more</span>
                          </li>
                        </ul>
                      </div>

                      <div className="bg-muted/50 border border-border/50 rounded-xl p-4">
                        <p className="text-sm font-medium text-foreground mb-2">Requirements:</p>
                        <ul className="space-y-1 text-sm text-muted-foreground">
                          <li>• Chrome browser on Android (for NFC writing)</li>
                          <li>• NFC must be enabled in phone settings</li>
                          <li>• Orange plan subscription (active)</li>
                          <li>• Blank or compatible NFC tag/card</li>
                        </ul>
                      </div>

                      <Button 
                        variant="default" 
                        size="sm" 
                        onClick={() => navigate('/settings')}
                        className="mt-4 bg-gradient-to-r from-primary to-primary/80"
                      >
                        <Settings className="h-4 w-4 mr-2" />
                        Open Settings
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* Step 4: Start Sharing */}
                <AccordionItem value="share" className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Share2 className="h-5 w-5 text-primary" />
                      </div>
                      <div className="text-left">
                        <p className="font-medium">Step 4: Start Sharing</p>
                        <p className="text-sm text-muted-foreground font-normal">Connect with your network</p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
                    <div className="space-y-3 ml-14">
                      <p className="text-foreground/90 leading-relaxed">Share your profile instantly:</p>
                      <ul className="space-y-2 text-sm">
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Tap your NFC card to any smartphone</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Show your QR code for scanning</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Share your unique link via text or email</span>
                        </li>
                        <li className="flex items-start gap-2">
                          <ChevronRight className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>Use the share button in the app</span>
                        </li>
                      </ul>
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          )}

          {/* HOW TO USE TAB */}
          {activeTab === 'use' && (
            <div className="space-y-6 animate-fade-in">
              <Accordion type="single" collapsible className="space-y-4">
                
                {/* NFC Tap */}
                <AccordionItem value="nfc" className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <Wifi className="h-5 w-5 text-primary" />
                      </div>
                      <span>NFC Tap (Recommended)</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
                    <div className="space-y-4 ml-14">
                      <p className="text-foreground/90 leading-relaxed">For smartphones with NFC enabled:</p>
                      <ol className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                          <span>Ensure NFC is enabled in phone settings</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                          <span>Unlock the recipient's phone</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</span>
                          <span>Hold card near the back of phone (usually top area)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">4</span>
                          <span>Wait for vibration or notification (1-2 seconds)</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">5</span>
                          <span>Your profile opens automatically in their browser</span>
                        </li>
                      </ol>

                      <div className="bg-primary/5 border border-primary/10 rounded-xl p-4">
                        <p className="text-sm font-medium text-primary mb-2">Device-Specific Tap Locations:</p>
                        <ul className="space-y-1 text-sm">
                          <li>• iPhone: Top back (near camera)</li>
                          <li>• Samsung/Android: Center back or near camera</li>
                          <li>• Google Pixel: Center to top back</li>
                        </ul>
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>

                {/* QR Code */}
                <AccordionItem value="qr" className="bg-card/50 backdrop-blur-sm border border-border/50 rounded-2xl px-6 shadow-sm hover:shadow-md transition-shadow">
                  <AccordionTrigger className="text-foreground font-medium py-5 hover:no-underline">
                    <div className="flex items-center gap-4">
                      <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                        <QrCode className="h-5 w-5 text-primary" />
                      </div>
                      <span>QR Code Scan</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="text-muted-foreground space-y-4 pt-2 pb-6">
                    <div className="space-y-4 ml-14">
                      <p className="text-foreground/90 leading-relaxed">For all smartphones:</p>
                      <ol className="space-y-3 text-sm">
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">1</span>
                          <span>Open your camera or QR code scanner</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">2</span>
                          <span>Point camera at the QR code on your card</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">3</span>
                          <span>Tap the notification that appears</span>
                        </li>
                        <li className="flex items-start gap-3">
                          <span className="flex-shrink-0 w-6 h-6 rounded-lg bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">4</span>
                          <span>Your profile opens in their browser</span>
                        </li>
                      </ol>
                    </div>
                  </AccordionContent>
                </AccordionItem>

              </Accordion>
            </div>
          )}

          {/* FEATURES TAB */}
          {activeTab === 'features' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid md:grid-cols-2 gap-6">
                {[
                  { 
                    title: 'Instant Updates', 
                    desc: 'Edit your profile anytime and changes reflect immediately on your card',
                    icon: Zap
                  },
                  { 
                    title: 'Analytics', 
                    desc: 'Track who views your card and when they access your information',
                    icon: Sparkles
                  },
                  { 
                    title: 'Unlimited Shares', 
                    desc: 'Share your profile as many times as you want with no limitations',
                    icon: Share2
                  },
                  { 
                    title: 'Multi-Device', 
                    desc: 'Access and manage your card from any device, anywhere',
                    icon: Smartphone
                  }
                ].map((feature, idx) => (
                  <Card key={idx} className="bg-card/50 backdrop-blur-sm border-border/50 shadow-sm hover:shadow-md transition-shadow">
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 p-3 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10">
                          <feature.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h4 className="font-medium mb-2">{feature.title}</h4>
                          <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Elegant Footer CTA */}
        <div className="mt-20 text-center space-y-8">
          <div className="border-t border-border/50 pt-12">
            <h3 className="text-3xl font-light mb-4">Ready to Begin?</h3>
            <p className="text-muted-foreground mb-8 font-light">
              Join thousands of professionals who trust SYNKA
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg" 
                onClick={() => navigate('/signup')}
                className="bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 h-12 px-8 group"
              >
                Create Your Card
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate('/support')}
                className="h-12 px-8"
              >
                Explore Support
              </Button>
            </div>
          </div>

          {/* Minimalist Trust Indicators */}
          <div className="pt-8 pb-12">
            <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="font-light">Secure & Private</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-primary" />
                <span className="font-light">Instant Updates</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <span className="font-light">10,000+ Users</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <style>{`
        .animate-fade-in {
          animation: fadeIn 0.4s ease-out;
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
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
