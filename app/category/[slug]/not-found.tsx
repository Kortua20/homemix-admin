import Link from "next/link";

export default function CategoryNotFound() {
  return (
    <section className="flex min-h-[60svh] flex-col items-center justify-center px-5 text-center">
      <h1 className="text-3xl font-bold">კატალოგი ვერ მოიძებნა</h1>
      <p className="mt-2 max-w-md text-sm leading-6 text-quiet-ink">
        კატალოგი შესაძლოა წაშლილია ან სლაგი შეცვლილია.
      </p>
      <Link
        href="/categories"
        className="mt-6 inline-flex h-11 items-center justify-center rounded-lg bg-walnut px-5 text-sm font-semibold text-white"
      >
        კატალოგზე დაბრუნება
      </Link>
    </section>
  );
}
