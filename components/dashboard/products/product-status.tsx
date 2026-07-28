import { cn } from "@/lib/utils";

type ProductStatusProps = {
  available: boolean;
};

export function ProductStatus({ available }: ProductStatusProps) {
  return (
    <span
      className={cn(
        "inline-flex w-fit items-center rounded-full px-2 py-0.5 text-[10px] font-medium tracking-[0.04em]",
        available
          ? "bg-[#e6e2de] text-[#7f512f]"
          : "bg-[#ffdad6] text-[#93000a]",
      )}
    >
      {available ? "ხელმისაწვდომია" : "მარაგი ამოიწურა"}
    </span>
  );
}
