import Image from 'next/image';

type FeatureCardProps = {
  imageSrc: string;
  headline: string;
  body: React.ReactNode;
};

export default function FeatureCard({ imageSrc, headline, body }: FeatureCardProps) {
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl shadow-xl">
      <Image
        src={imageSrc}
        alt="Neon blue data lines"
        fill
        sizes="100vw"
        priority
        className="object-cover"
        data-ai-hint="neon data"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" style={{background: 'linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 40%)'}}/>
      <div className="absolute bottom-0 left-0 p-[18px] text-white">
        <h2 className="text-6xl font-extrabold leading-none">{headline}</h2>
        <p className="mt-2 text-base leading-snug text-white/80 w-4/5">
          {body}
        </p>
      </div>
    </div>
  );
}
