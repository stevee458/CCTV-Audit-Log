import logoUrl from "@assets/Picture1_1778412186304.png";

export function Logo({ className = "h-8 w-auto" }: { className?: string }) {
  return (
    <img
      src={logoUrl}
      alt="Jarvie Digital Inspection"
      className={className}
      draggable={false}
    />
  );
}
