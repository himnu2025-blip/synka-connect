import { CreditCard, Users, ScanLine, MessageCircle, Calendar, BarChart3 } from 'lucide-react';

const features = [
  {
    icon: CreditCard,
    title: 'Automatic lead capture',
    description: 'When someone shares their details, Synka saves them directly to your CRM.'
  },
  {
    icon: ScanLine,
    title: 'Scan or add contacts',
    description: 'Scan physical cards or add contacts manually. Data is structured instantly.'
  },
  {
    icon: MessageCircle,
    title: 'One-click follow-ups',
    description: 'Send WhatsApp or email with prefilled names, company, and signature.'
  },
  {
    icon: Calendar,
    title: 'Events & auto tagging',
    description: 'Schedule events and group leads captured during that time automatically.'
  },
  {
    icon: Users,
    title: 'Built-in CRM',
    description: 'Contacts, notes, tags, and timelines — all in one place.'
  },
  {
    icon: BarChart3,
    title: 'Analytics & reports',
    description: 'Track views, saves, connections, and engagement over time.'
  }
];

export function Features() {
  return (
    <section className="py-16 sm:py-24 px-4 w-full overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-14">
          <h2 className="text-3xl md:text-4xl font-semibold">
            What happens after you share your card
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto mt-3">
            Synka quietly handles everything in the background so you never miss an opportunity.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f) => (
            <div key={f.title} className="p-6 rounded-2xl bg-card border">
              <f.icon className="h-6 w-6 text-primary mb-3" />
              <h3 className="font-semibold mb-1">{f.title}</h3>
              <p className="text-sm text-muted-foreground">{f.description}</p>
            </div>
          ))}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-10">
          Secure by design. All data is encrypted and visible only to authorized users.
        </p>
      </div>
    </section>
  );
}
