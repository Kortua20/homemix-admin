"use client";

import { Package, Search } from "lucide-react";
import { useDeferredValue, useState } from "react";

import {
  DesktopProductCard,
  MobileProductCard,
  type Product,
} from "@/components/dashboard/products";
import { Input } from "@/components/ui/input";

const products: Product[] = [
  {
    id: 1,
    name: "კისტის სასადილო მაგიდა",
    category: "მაგიდები",
    material: "მყარი მუხა",
    price: "1 250 ₾",
    code: "TBL-042",
    image: "/products/kyst-table.jpg",
    available: true,
  },
  {
    id: 2,
    name: "ლუმინა სავარძელი",
    category: "სავარძლები",
    material: "ბუკლე",
    price: "890 ₾",
    code: "CHR-118",
    image: "/products/lumina-chair.jpg",
    available: false,
  },
  {
    id: 3,
    name: "აურა იატაკის სანათი",
    category: "განათება",
    material: "სპილენძი",
    price: "450 ₾",
    code: "LMP-002",
    image: "/products/aura-lamp.jpg",
    available: true,
  },
  {
    id: 4,
    name: "ფიორდის კომოდი",
    category: "შესანახი ავეჯი",
    material: "კაკალი",
    price: "1 800 ₾",
    code: "STG-305",
    image: "/products/fjord-credenza.jpg",
    available: true,
  },
  {
    id: 5,
    name: "კოპენჰაგენის სავარძელი",
    category: "სავარძლები",
    material: "ღია მუხა და კრემისფერი ქსოვილი",
    price: "1 150 ₾",
    code: "CHR-204",
    image: "/products/kobenhavn-chair.jpg",
    available: true,
  },
  {
    id: 6,
    name: "ორჰუსის ჟურნალის მაგიდა",
    category: "მაგიდები",
    material: "მყარი მუხა",
    price: "760 ₾",
    code: "TBL-116",
    image: "/products/aarhus-table.jpg",
    available: false,
  },
  {
    id: 7,
    name: "ლუმინა დეკორატიული სანათი",
    category: "განათება",
    material: "მქრქალი კერამიკა",
    price: "390 ₾",
    code: "LMP-087",
    image: "/products/lumina-floor-lamp.jpg",
    available: true,
  },
];

export function ProductsDashboard() {
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLocaleLowerCase("ka");
  const filteredProducts = normalizedQuery
    ? products.filter((product) =>
        product.name.toLocaleLowerCase("ka").includes(normalizedQuery),
      )
    : products;

  return (
    <section className="px-5 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-16 xl:px-16">
      <div className="hidden lg:block">
        <h1 className="text-5xl font-bold leading-[1.1] tracking-[-0.02em]">
          პროდუქტები
        </h1>
        <p className="mt-2 text-base leading-relaxed text-[#605e5b]">
          მართეთ მარაგი, ფასები და პროდუქტის დეტალები.
        </p>
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-8 lg:rounded-xl lg:border lg:border-[#e4e2e1] lg:p-4 lg:shadow-[0_10px_20px_rgba(0,0,0,0.02)]">
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-4 top-1/2 size-4.5 -translate-y-1/2 text-[#605e5b]"
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="პროდუქტის სახელით ძიება"
            placeholder="პროდუქტის სახელით ძიება..."
            className="h-12 border-[#d6c3b8] bg-white pl-11 text-base placeholder:text-[#83746b] lg:border-transparent lg:bg-[#fcf9f8]"
          />
        </div>
      </div>

      {filteredProducts.length > 0 ? (
        <div className="mt-4 grid gap-2 lg:mt-6 lg:grid-cols-3 lg:gap-6 [@media(min-width:1180px)]:grid-cols-4">
          {filteredProducts.map((product) => (
            <div key={product.id}>
              <DesktopProductCard product={product} />
              <MobileProductCard product={product} />
            </div>
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl bg-white px-6 py-14 text-center shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-6">
          <Package
            aria-hidden="true"
            className="mx-auto size-8 text-[#83746b]"
          />
          <h2 className="mt-3 text-lg font-semibold">პროდუქტი ვერ მოიძებნა</h2>
          <p className="mt-1 text-sm text-[#605e5b]">
            სცადეთ სხვა სახელის მოძებნა.
          </p>
        </div>
      )}
    </section>
  );
}
