import InsightPill from "@/components/InsightPill";
import FeatureCard from "@/components/FeatureCard";

export default function Home() {
  return (
    <main className="mx-auto max-w-[430px] px-6 pt-5 pb-5">
      <h1 className="mt-5 mb-5 text-3xl font-bold leading-tight text-white">
        Key insights from this edition
      </h1>
      
      <div className="space-y-3">
        <InsightPill index={1} title="A Blueprint for the Future" />
        <InsightPill index={2} title="Reimagining modern trade" />
      </div>

      <div className="mt-4">
        <FeatureCard
          imageSrc="/feature.jpg"
          headline="2.0"
          body={
            <>
              The WTO could recover its mojo
              <br />
              by turning its back on the
              <br />
              multilateral trading system.
            </>
          }
        />
      </div>
    </main>
  );
}
