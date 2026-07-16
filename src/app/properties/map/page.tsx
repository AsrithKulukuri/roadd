import { MapWrapper } from "@/components/map/map-wrapper";

export const metadata = {
  title: "Property Map Search | ROAD FACING",
  description: "Explore premium properties across India on our interactive map.",
};

export default function MapSearchPage() {
  return (
    <div className="flex flex-col min-h-screen pt-24 pb-16">
      <section className="py-8 bg-bg-card border-b border-border-default/50">
        <div className="container-road">
          <div className="max-w-3xl space-y-2">
            <h1 className="font-heading text-3xl font-bold text-text-primary">
              Map Search
            </h1>
            <p className="text-text-secondary">
              Explore available properties and interact with the map to find your perfect location.
            </p>
          </div>
        </div>
      </section>

      <section className="py-8 flex-1 flex flex-col">
        <div className="container-road flex-1 flex flex-col">
          <MapWrapper />
        </div>
      </section>
    </div>
  );
}
