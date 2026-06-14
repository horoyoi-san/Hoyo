import Image from "next/image";
import { cn } from "@/src/lib/utils";

interface Props {
  src: string;
  className?: string;
}

const ElementIcon = ({ src, className }: Props) => {
  return (
    <Image
      src={`/icons/element/IconAttribute${src}.webp`}
      alt={src}
      width={52}
      height={52}
      className={cn("size-6", className)}
      unoptimized
    />
  );
};

export default ElementIcon;
