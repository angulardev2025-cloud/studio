type InsightPillProps = {
  index: number;
  title: string;
};

export default function InsightPill({ index, title }: InsightPillProps) {
  return (
    <div className="flex h-[84px] items-center rounded-2xl bg-white px-[18px] py-4 shadow-lg">
      <div className="h-full w-[2px] bg-red-500" />
      <div className="ml-2 w-[40px] text-center text-3xl font-bold text-gray-400">
        {String(index).padStart(2, '0')}
      </div>
      <div className="ml-2">
        <p className="text-xl font-semibold leading-snug text-[#111827]">
          {title}
        </p>
      </div>
    </div>
  );
}
