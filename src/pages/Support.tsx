import { BrandLogo } from '@/components/BrandLogo';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

export default function Support() {
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-center mb-8">
          <BrandLogo size="lg" asLink={true} />
        </div>

        {/* Hero */}
        <div className="text-center mb-12">
          <p className="text-lg text-muted-foreground">Smart Digital Business Cards · CRM · NFC · Analytics</p>
          <p className="text-primary font-medium mt-2">🌟 One Card. Infinite Possibilities.</p>
        </div>

        {/* Intro */}
        <div className="bg-card border border-border rounded-xl p-6 mb-8">
          <p className="text-muted-foreground">
            With SYNKA, your QR, Link, and Physical NFC Card always remain the same, but what you share can change anytime.
          </p>
          <ul className="mt-4 space-y-2 text-muted-foreground">
            <li>• One QR</li>
            <li>• One Link</li>
            <li>• One Physical Card</li>
            <li>• Multiple digital cards inside</li>
          </ul>
          <p className="mt-4 text-foreground font-medium">
            👉 Your default card is what opens when:
          </p>
          <ul className="mt-2 space-y-1 text-muted-foreground">
            <li>• Someone scans your QR</li>
            <li>• Someone taps your NFC card</li>
            <li>• Someone opens your link</li>
          </ul>
          <p className="mt-4 text-primary">
            You can change the default card anytime — without changing your QR or physical card.
          </p>
        </div>

        {/* How To Guide */}
        <div className="space-y-8">
          <h2 className="text-2xl font-bold text-foreground">🚀 Getting Started (Basics)</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="what-is-card" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">What is a Card?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>A Card is your digital identity:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Name</li>
                  <li>Company</li>
                  <li>Role</li>
                  <li>Contact details</li>
                  <li>Social links</li>
                  <li>Files (Orange)</li>
                  <li>Analytics & CRM tracking</li>
                </ul>
                <p className="mt-3">You can create:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>1 card (Free)</li>
                  <li>Multiple cards (Orange)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="sharing" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🔁 How Sharing Works (Very Important)</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <div className="overflow-x-auto">
                  <table className="w-full mt-2">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-2 font-medium">Method</th>
                        <th className="text-left py-2 font-medium">What Opens</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-border/50"><td className="py-2">QR Scan</td><td>Default Card</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2">Link Click</td><td>Default Card</td></tr>
                      <tr className="border-b border-border/50"><td className="py-2">NFC Tap</td><td>Default Card</td></tr>
                      <tr><td className="py-2">Physical Card</td><td>Same Default Card</td></tr>
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-primary font-medium">👉 Change the default card → everything updates automatically</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="orange" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🧡 Orange Upgrade (Pro Experience)</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>Upgrade to Orange from Settings to unlock:</p>
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Multiple cards</li>
                  <li>File uploads (pitch, catalogue, docs)</li>
                  <li>Advanced analytics</li>
                  <li>One-click templates</li>
                  <li>NFC writer</li>
                  <li>CRM automation</li>
                  <li>Email signature</li>
                  <li>Premium share & download designs</li>
                  <li>Physical card ordering</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="my-card" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🪪 MY CARD – How to Use</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium text-foreground">Switching Cards</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Tap My Card in the header</li>
                    <li>Single tap on any card → view that card</li>
                    <li>Star ⭐ → makes that card default</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Editing Card Name</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Double-tap card name → rename</li>
                    <li>Auto-saved</li>
                    <li>No popup if name is unchanged</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Upload Photo / Logo</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Tap Edit on My Card</li>
                    <li>Add: Profile photo, Company logo</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="files" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">📎 Files on Card (Orange Only)</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>You can upload:</p>
                <ul className="list-disc list-inside mt-2">
                  <li>Pitch deck</li>
                  <li>Catalogue</li>
                  <li>PDF</li>
                  <li>Documents</li>
                </ul>
                <p className="mt-3">When someone opens your card:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Files are instantly downloadable</li>
                  <li>Each download is tracked in analytics</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="share-download" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">📲 Share & Download Card</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium text-foreground">Share Options</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>WhatsApp</li>
                    <li>LinkedIn</li>
                    <li>Copy link</li>
                    <li>Download Card Image</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Download Card Image</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Generates a beautiful image in real time</li>
                    <li>Includes: Name, QR, Clickable link</li>
                  </ul>
                  <p className="mt-2">Perfect for:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>WhatsApp status</li>
                    <li>LinkedIn posts</li>
                    <li>Offline sharing</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nfc-cards" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">💳 Physical NFC Cards</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium text-foreground">Available Materials</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>PVC White</li>
                    <li>PVC Black</li>
                    <li>PVC Black Matte</li>
                    <li>Metal Gold</li>
                    <li>Metal Silver</li>
                    <li>Metal Black</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Customisation</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>PVC White → any color or design</li>
                    <li>PVC Black / Matte → photo designs supported</li>
                    <li>Metal cards: Name, Role, Company logo (Fully engraved)</li>
                  </ul>
                  <p className="mt-2">Choose from:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>In-house designer templates</li>
                    <li>Or share your own idea</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nfc-how" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">📡 How NFC Works</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ul className="space-y-2">
                  <li><span className="font-medium">Android:</span> Tap card on back of phone</li>
                  <li><span className="font-medium">iPhone:</span> Tap card on front / top</li>
                </ul>
                <p className="mt-3 text-primary">📌 Screen must be ON</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="nfc-writer" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">✍️ NFC Writer (Orange)</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Settings → NFC Writer</li>
                  <li>Tap Write</li>
                  <li>Place card: Android → back, iPhone → front</li>
                  <li>Get confirmation → Card written</li>
                </ol>
                <p className="mt-3 text-primary">Now your physical card opens your default digital card.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="crm" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">👥 CRM – Contacts & Notes</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium text-foreground">How Contacts Are Captured</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Someone scans your card</li>
                    <li>Someone taps your NFC</li>
                    <li>Someone submits their details</li>
                    <li>You scan their physical card</li>
                    <li>Manual entry</li>
                  </ul>
                  <p className="mt-2">All contacts go directly into CRM.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">📝 Notes & History (Powerful Feature)</p>
                  <p className="mt-1">You can instantly log:</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>📞 Calls</li>
                    <li>📧 Emails</li>
                    <li>💬 WhatsApp</li>
                    <li>✍️ Manual notes</li>
                  </ul>
                  <p className="mt-2">One-tap capture → stored against contact.</p>
                </div>
                <div>
                  <p className="font-medium text-foreground">🏷️ Auto Tags & Events</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Auto-tag contacts by: Event, Source, Card used</li>
                    <li>Schedule events</li>
                    <li>View performance per event</li>
                  </ul>
                </div>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="analytics" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">📊 Analytics & Reports</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="font-medium text-foreground">Track:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Card views</li>
                  <li>QR scans</li>
                  <li>NFC taps</li>
                  <li>Calls</li>
                  <li>Emails</li>
                  <li>WhatsApp clicks</li>
                  <li>File downloads</li>
                </ul>
                <p className="font-medium text-foreground mt-4">Advanced Reports</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Interaction-based analytics</li>
                  <li>Event-wise analytics</li>
                  <li>Touch-base reports</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="email-signature" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">✉️ Email Signature</AccordionTrigger>
              <AccordionContent className="text-muted-foreground space-y-4">
                <div>
                  <p className="font-medium text-foreground">Available Formats</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>HTML Signature</li>
                    <li>Image Signature</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Supported By</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Gmail</li>
                    <li>Outlook</li>
                    <li>Apple Mail</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Create Signature</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Choose from templates</li>
                    <li>Or ask AI: "Create a minimal blue email signature with logo on right"</li>
                  </ul>
                </div>
                <div>
                  <p className="font-medium text-foreground">Custom Controls</p>
                  <ul className="list-disc list-inside mt-1">
                    <li>Photo on/off</li>
                    <li>Logo on/off</li>
                    <li>Text alignment</li>
                    <li>Colors</li>
                  </ul>
                </div>
                <p className="text-primary mt-2">📌 HTML signatures must be set on laptop/PC (Mobile email apps don't support HTML signatures)</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="templates" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🧠 One-Click Templates & AI</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="font-medium text-foreground">What You Can Do</p>
                <ul className="list-disc list-inside mt-1">
                  <li>One-click WhatsApp / Email templates</li>
                  <li>Auto-fill: Contact name, Company, Your name</li>
                  <li>Generate messages with AI</li>
                  <li>Edit or reuse templates anytime</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="crm-filters" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🔍 CRM Filters</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p>Filter contacts by:</p>
                <ul className="list-disc list-inside mt-1">
                  <li>Name</li>
                  <li>Date added</li>
                  <li>Last interaction (call / note / WhatsApp / email)</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="ordering" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-semibold">🛒 Ordering Physical Cards</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ol className="list-decimal list-inside space-y-1">
                  <li>Go to Settings</li>
                  <li>Choose card type</li>
                  <li>Select design or share your idea</li>
                  <li>Place order</li>
                </ol>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* FAQ Section */}
          <h2 className="text-2xl font-bold text-foreground mt-12">❓ FREQUENTLY ASKED QUESTIONS (FAQ)</h2>
          
          <Accordion type="single" collapsible className="space-y-4">
            <AccordionItem value="faq-1" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Will my QR or physical card change if I change cards?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="text-primary font-medium">No.</p>
                <p>Your QR, link, and physical card always stay the same.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-2" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Can I choose what card opens when scanned?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="text-primary font-medium">Yes.</p>
                <p>Just change the default card.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-3" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Can I have multiple cards for different purposes?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="text-primary font-medium">Yes (Orange).</p>
                <p>Work, Personal, Event, Product, etc.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-4" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Does SYNKA work without internet?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <ul className="list-disc list-inside">
                  <li>NFC tap opens link</li>
                  <li>Internet needed to load card</li>
                </ul>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-5" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Can others send me their details?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="text-primary font-medium">Yes.</p>
                <p>Via your public card or physical card scan.</p>
              </AccordionContent>
            </AccordionItem>

            <AccordionItem value="faq-6" className="bg-card border border-border rounded-xl px-4">
              <AccordionTrigger className="text-foreground font-medium">Q. Is my data secure?</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                <p className="text-primary font-medium">Yes.</p>
                <p>Enterprise-grade security with full control.</p>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

          {/* Why SYNKA */}
          <div className="bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 rounded-xl p-6 mt-12">
            <h2 className="text-2xl font-bold text-foreground mb-4">🌟 Why SYNKA is Different</h2>
            <ul className="space-y-2 text-muted-foreground">
              <li>• One card, infinite flexibility</li>
              <li>• India's first dynamic NFC ecosystem</li>
              <li>• CRM + Analytics + NFC + AI in one app</li>
              <li>• Built for founders, sales teams, professionals</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
