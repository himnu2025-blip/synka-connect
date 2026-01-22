export function ScaleSection() {
  return (
    <section className="py-16 sm:py-28 px-4 bg-muted/30 w-full overflow-hidden">
      <div className="container max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-semibold">
            Built to scale with your team
          </h2>
          <p className="text-muted-foreground mt-3">
            From solo professionals to startups and enterprises.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 mb-16">
          <Card title="Team" text="Managers get visibility into contacts and activity across members." />
          <Card title="Startup" text="Shared events, workflows, and a unified CRM for growth." />
          <Card title="Enterprise" text="Custom solutions, permissions, and workflows tailored to you." />
        </div>

        <div className="text-center max-w-2xl mx-auto">
          <h3 className="text-2xl font-semibold mb-3">
            Let’s build the right solution together
          </h3>
          <p className="text-muted-foreground mb-6">
            We design custom workflows and enterprise-grade solutions so your team can focus on
            products and customers — while we handle the rest.
          </p>

          <button className="px-8 py-4 rounded-xl bg-primary text-primary-foreground">
            Contact us for custom solutions
          </button>

          <p className="text-xs text-muted-foreground mt-4">
            Secure • Encrypted • Enterprise-ready
          </p>
        </div>
      </div>
    </section>
  );
}

function Card({ title, text }: { title: string; text: string }) {
  return (
    <div className="p-6 rounded-2xl bg-card border">
      <h4 className="font-semibold mb-2">{title}</h4>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
