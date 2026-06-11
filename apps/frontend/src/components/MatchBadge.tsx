interface Props { score: number }
export function MatchBadge({ score }: Props) {
  let color = "bg-red-400";
  if (score >= 80) color = "bg-green-400";
  else if (score >= 60) color = "bg-yellow-400";
  else if (score >= 40) color = "bg-orange-400";
  return <span className={`badge ${color} text-[10px] whitespace-nowrap`}>{score}% match</span>;
}
