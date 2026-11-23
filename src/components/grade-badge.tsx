import { cn } from "@/lib/utils";

// Grade tones mapped to semantic theme tokens, so dark/light theming keeps
// working. A/B pass green, C/D caution amber, F failure red.
export function gradeTone(grade: string): string {
  if (grade === "A" || grade === "B") return "text-success";
  if (grade === "C" || grade === "D") return "text-warning";
  if (grade === "F") return "text-destructive";
  return "text-muted-foreground";
}

export function gradeRingClass(grade: string): string {
  if (grade === "A" || grade === "B") return "border-success/40 bg-success/10";
  if (grade === "C" || grade === "D") return "border-warning/40 bg-warning/10";
  if (grade === "F") return "border-destructive/40 bg-destructive/10";
  return "border-border bg-muted";
}

export function GradeBadge({ grade, className }: { grade: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex items-center justify-center rounded-full border-2 font-mono font-bold",
        gradeRingClass(grade),
        gradeTone(grade),
        className,
      )}
      aria-label={`Security grade ${grade}`}
    >
      {grade}
    </div>
  );
}
