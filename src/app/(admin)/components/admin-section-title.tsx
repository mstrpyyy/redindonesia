import { cn } from "@/lib/utils";

// The `<h2>` that heads a section on an admin page (e.g. "Hero", "About
// Section", "Carousel List"). A short brand-red accent bar on the left marks
// it as a section title, consistent across every admin page.
export function AdminSectionTitle({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h2
      className={cn(
        "border-brand-red border-l-[3px] pl-3 text-2xl font-semibold",
        className
      )}
    >
      {children}
    </h2>
  );
}
