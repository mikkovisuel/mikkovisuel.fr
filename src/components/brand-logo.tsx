import Image from "next/image";

export function BrandLogo({ className = "h-9" }: { className?: string }) {
  return (
    <Image
      src="/brand/logo-head-part.svg"
      alt="Mikko Visuel"
      width={651}
      height={805}
      className={`w-auto shrink-0 self-center ${className}`}
    />
  );
}
