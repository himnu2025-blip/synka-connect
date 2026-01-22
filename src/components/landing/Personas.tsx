import { Rocket, TrendingUp, Lightbulb, Camera } from 'lucide-react';
import { cn } from '@/lib/utils';

const personas = [
  {
    icon: Rocket,
    title: 'Startup Founders',
    avatar: 'SF',
    points: [
      'Make memorable first impressions at events',
      'Track every potential investor contact',
      'AI-powered follow-up templates',
    ],
  },
  {
    icon: TrendingUp,
    title: 'Sales Professionals',
    avatar: 'SP',
    points: [
      'Never lose a lead with smart CRM',
      'Instant contact sharing via NFC',
      'Analytics on card engagement',
    ],
  },
  {
    icon: Lightbulb,
    title: 'Consultants & Coaches',
    avatar: 'CC',
    points: [
      'Professional brand presence',
      'Easy client management',
      'Custom email signatures',
    ],
  },
  {
    icon: Camera,
    title: 'Creators & Freelancers',
    avatar: 'CF',
    points: [
      'Showcase your portfolio links',
      'Stand out with premium designs',
      'Track who viewed your card',
    ],
  },
];

export function Personas() {
  return (
    <section className="py-16 sm:py-20 px-4 gradient-subtle w-full overflow-hidden">
      <div className="container px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Built for <span className="gradient-text">professionals</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Whether you're closing deals or building connections, Synka adapts to your workflow.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {personas.map((persona, index) => (
            <PersonaCard key={persona.title} {...persona} index={index} />
          ))}
        </div>
      </div>
    </section>
  );
}

function PersonaCard({
  icon: Icon,
  title,
  avatar,
  points,
  index,
}: {
  icon: React.ElementType;
  title: string;
  avatar: string;
  points: string[];
  index: number;
}) {
  return (
    <div 
      className={cn(
        "group p-6 rounded-2xl bg-card border border-border/50 card-hover opacity-0 animate-fade-up"
      )}
      style={{ animationDelay: `${index * 150}ms`, animationFillMode: 'forwards' }}
    >
      <div className="flex items-center gap-4 mb-6">
        <div className="w-14 h-14 rounded-2xl gradient-bg flex items-center justify-center shadow-glow">
          <span className="text-lg font-bold text-primary-foreground">{avatar}</span>
        </div>
        <div>
          <Icon className="h-4 w-4 text-primary mb-1" />
          <h3 className="font-semibold text-foreground">{title}</h3>
        </div>
      </div>

      <ul className="space-y-3">
        {points.map((point, i) => (
          <li key={i} className="flex items-start gap-2 text-sm text-muted-foreground">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
            {point}
          </li>
        ))}
      </ul>
    </div>
  );
}
