import { cn } from "@/lib/cn";

export const designStudioImageNote =
  "These images illustrate the look and feel of your home. During project review, we’ll confirm the actual products and finishes and share manufacturer information, samples and product imagery where available.";

export const designStudioProjectConditions =
  "Availability, quantities, pricing and technical suitability remain subject to project-specific review.";

export function DesignStudioImageNote({ className }: { className?: string }) {
  return (
    <p data-design-studio-image-note className={cn("text-sm leading-7", className)}>
      {designStudioImageNote}
    </p>
  );
}
