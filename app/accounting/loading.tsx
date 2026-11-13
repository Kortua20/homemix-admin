// Shown while the accounting queries run, for the same reason as the dashboard's: a period
// click that changes nothing on screen until the data arrives reads as a dead link.
//
// Mirrors the real page's blocks — header, tabs, period card, four summary cards, table —
// so nothing jumps when the content replaces it.
export default function AccountingLoading() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse px-5 pb-28 pt-4 motion-reduce:animate-none lg:px-8 lg:pb-16 lg:pt-16 xl:px-16"
    >
      <span className="sr-only">ბუღალტერია იტვირთება…</span>

      <div className="h-10 w-56 rounded bg-image-placeholder lg:h-12 lg:w-72" />
      <div className="mt-3 h-5 w-64 rounded bg-image-placeholder" />
      <div className="mt-6 h-12 w-56 rounded-xl bg-white" />

      <div className="mt-4 h-40 rounded-3xl bg-white" />

      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 lg:gap-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="h-32 rounded-3xl bg-white" />
        ))}
      </div>

      <div className="mt-4 rounded-3xl bg-white p-4">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="mt-3 h-8 rounded bg-image-placeholder first:mt-0" />
        ))}
      </div>
    </section>
  );
}
