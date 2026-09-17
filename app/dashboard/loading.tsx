// Shown while the dashboard's server query runs. Without it every navigation to the list is
// a dead click — nothing changes on screen until the data arrives, so a slow query reads as
// a broken link.
//
// The skeleton mirrors the real grid's breakpoints (3 columns at lg, 4 above 1180px) and
// card proportions, so content does not jump when it replaces this.
function CardSkeleton() {
  return (
    <div className="rounded-3xl bg-white p-6 shadow-[0_24px_30px_rgba(0,0,0,0.04)]">
      <div className="h-48 rounded-xl bg-image-placeholder" />
      <div className="flex min-h-28 flex-col gap-2 py-4">
        <div className="h-6 w-3/4 rounded bg-image-placeholder" />
        <div className="h-4 w-1/3 rounded bg-image-placeholder" />
      </div>
      <div className="border-t border-hairline py-4">
        <div className="h-7 w-24 rounded bg-image-placeholder" />
      </div>
    </div>
  );
}

export default function DashboardLoading() {
  return (
    // aria-busy plus a polite status: a screen reader announces that the list is loading
    // rather than reading a screen of empty boxes.
    <section
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse px-5 pb-28 pt-4 motion-reduce:animate-none lg:px-8 lg:pb-16 lg:pt-16 xl:px-16"
    >
      <span className="sr-only">პროდუქტები იტვირთება…</span>

      <div className="hidden lg:block">
        <div className="h-12 w-64 rounded bg-image-placeholder" />
        <div className="mt-3 h-5 w-96 rounded bg-image-placeholder" />
      </div>

      <div className="rounded-3xl bg-white p-4 shadow-[0_10px_20px_rgba(0,0,0,0.04)] lg:mt-8 lg:rounded-xl lg:border lg:border-hairline lg:p-4">
        <div className="h-12 rounded-lg bg-image-placeholder" />
      </div>

      <div className="mt-4 grid gap-2 lg:mt-6 lg:grid-cols-3 lg:gap-6 [@media(min-width:1180px)]:grid-cols-4">
        {/* Eight cards: enough to fill two rows at the widest breakpoint without implying a
            specific result count. */}
        {Array.from({ length: 8 }, (_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </section>
  );
}
