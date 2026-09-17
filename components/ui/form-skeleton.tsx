// Loading placeholders for the admin's routes.
//
// Shared rather than one bespoke skeleton per route: the pages differ in how many fields
// they show, not in shape, and a skeleton that drifts from the page it stands in for is
// worse than a plain spinner.

function Bar({ className = "" }: { className?: string }) {
  return <div className={`rounded bg-image-placeholder ${className}`} />;
}

// A labelled input's worth of vertical space.
function FieldSkeleton() {
  return (
    <div className="grid gap-2">
      <Bar className="h-4 w-28" />
      <Bar className="h-12 w-full" />
    </div>
  );
}

// Stands in for the product and category forms. `fields` is per-route so the placeholder is
// roughly the height of what replaces it — a short skeleton under a long form makes the
// page jump on arrival.
export function FormSkeleton({
  fields = 8,
  withImages = true,
}: {
  fields?: number;
  withImages?: boolean;
}) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse px-5 pb-28 pt-4 motion-reduce:animate-none lg:px-8 lg:pb-16 lg:pt-16 xl:px-16"
    >
      <span className="sr-only">იტვირთება…</span>

      <Bar className="h-10 w-64" />

      <div className="mt-7 rounded-3xl bg-white p-5 shadow-[0_16px_30px_rgba(0,0,0,0.04)] lg:p-8">
        <div className="grid gap-5 lg:grid-cols-2">
          {Array.from({ length: fields }, (_, index) => (
            <FieldSkeleton key={index} />
          ))}
        </div>

        {withImages ? (
          <div className="mt-6 grid gap-3">
            <Bar className="h-4 w-24" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {Array.from({ length: 4 }, (_, index) => (
                <Bar key={index} className="aspect-square w-full rounded-2xl" />
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-8 flex justify-end gap-3 border-t border-hairline pt-5">
          <Bar className="h-11 w-28" />
          <Bar className="h-11 w-40" />
        </div>
      </div>
    </section>
  );
}

// Stands in for a read-only detail page.
export function DetailSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse px-5 pb-28 pt-4 motion-reduce:animate-none lg:px-8 lg:pb-16 lg:pt-16 xl:px-16"
    >
      <span className="sr-only">იტვირთება…</span>

      <Bar className="h-10 w-72" />
      <Bar className="mt-3 h-5 w-48" />

      <div className="mt-7 grid gap-6 lg:grid-cols-2">
        <Bar className="aspect-4/3 w-full rounded-3xl" />
        <div className="grid content-start gap-4">
          <Bar className="h-8 w-40" />
          <Bar className="h-5 w-full" />
          <Bar className="h-5 w-5/6" />
          <Bar className="h-5 w-2/3" />
          <Bar className="mt-4 h-11 w-48" />
        </div>
      </div>
    </section>
  );
}

// Stands in for the categories grid.
export function CardGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <section
      aria-busy="true"
      aria-live="polite"
      className="animate-pulse px-5 pb-28 pt-4 motion-reduce:animate-none lg:px-8 lg:pb-16 lg:pt-16 xl:px-16"
    >
      <span className="sr-only">იტვირთება…</span>

      <Bar className="h-10 w-56" />

      <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: count }, (_, index) => (
          <div
            key={index}
            className="rounded-3xl bg-white p-5 shadow-[0_10px_20px_rgba(0,0,0,0.04)]"
          >
            <Bar className="aspect-4/3 w-full rounded-2xl" />
            <Bar className="mt-4 h-6 w-2/3" />
            <Bar className="mt-2 h-4 w-1/3" />
          </div>
        ))}
      </div>
    </section>
  );
}
