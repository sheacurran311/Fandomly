import { Card, CardContent } from "@/components/ui/card";

interface StatItem {
  label: string;
  value: string | number;
  color: "primary" | "secondary" | "accent";
}

interface StatsGridProps {
  stats: StatItem[];
}

export default function StatsGrid({ stats }: StatsGridProps) {
  const getColorClasses = (color: "primary" | "secondary" | "accent") => {
    switch (color) {
      case "primary":
        return "text-brand-primary";
      case "secondary":
        return "text-brand-secondary";
      case "accent":
        return "text-brand-accent";
      default:
        return "text-brand-primary";
    }
  };

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <Card key={index} className="bg-white/10 border-white/10">
          <CardContent className="p-4">
            <div className={`text-2xl font-bold ${getColorClasses(stat.color)}`}>
              {stat.value}
            </div>
            <div className="text-sm text-gray-400">
              {stat.label}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
