import logoUrl from "@assets/Jarvie_Digital_Inspection_Logo_(002)_1777803539050.png";

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
