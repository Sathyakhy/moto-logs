import { createFileRoute, Link } from "@tanstack/react-router";
import { BellRing, Fuel, LineChart, Wrench } from "lucide-react";

import { Button } from "@/components/ui/button";
import heroImage from "@/assets/garage-hero.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "MotoLog — Motorcycle Maintenance & Cost Tracker" },
      {
        name: "description",
        content:
          "Log every service, know exactly when the next one is due, and see the real cost per km of your bike — in USD or Cambodian riel.",
      },
      { property: "og:title", content: "MotoLog — Motorcycle Maintenance & Cost Tracker" },
      {
        property: "og:description",
        content:
          "Service logs, mileage reminders, fuel economy and total cost of ownership for your motorcycle.",
      },
    ],
  }),
  component: Landing,
});

const FEATURES = [
  {
    icon: Wrench,
    title: "Service logbook",
    body: "Date, odometer, workshop, parts and labour cost for every job you do.",
  },
  {
    icon: BellRing,
    title: "Smart reminders",
    body: "Oil at every 2,000 km? MotoLog tells you at what odometer it's due and flags it early.",
  },
  {
    icon: Fuel,
    title: "Fuel economy",
    body: "Log fill-ups and get km/L, cost per km and monthly fuel spend automatically.",
  },
  {
    icon: LineChart,
    title: "True cost of ownership",
    body: "Purchase price plus fuel, servicing, insurance and tax — divided by the km you rode.",
  },
];

function Landing() {
  return (
    <div className="min-h-screen">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <Wrench className="size-5 text-primary" aria-hidden />
          <span className="text-display text-2xl">MotoLog</span>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/auth">Sign in</Link>
        </Button>
      </header>

      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-10 lg:grid-cols-2 lg:py-20">
        <div>
          <p className="label-caps">How far have we come</p>
          <h1 className="text-display mt-3 text-6xl sm:text-7xl">
            Know what's due.
            <br />
            <span className="text-primary">Know what it costs.</span>
          </h1>
          <p className="mt-5 max-w-md text-muted-foreground">
            Track servicing, fuel, expenses and reminders for your Click, PCX or anything with two
            wheels. Costs in dollars or riel, mileage in km.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link to="/auth">Start your logbook</Link>
            </Button>
            <Button asChild size="lg" variant="secondary">
              <Link to="/auth">I already have an account</Link>
            </Button>
          </div>
        </div>
        <div className="panel overflow-hidden p-2">
          <img
            src={heroImage}
            alt="Motorcycle parked in a dimly lit garage under a warm work light"
            width={1600}
            height={1008}
            className="w-full rounded-lg object-cover"
          />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-24">
        <h2 className="text-display text-3xl">Everything in one place</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="panel p-5">
              <Icon className="size-6 text-primary" aria-hidden />
              <h3 className="mt-4 text-xl">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
