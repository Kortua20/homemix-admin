// Matches the edit route: the same long form, minus the product fetch.
import { FormSkeleton } from "@/components/ui/form-skeleton";

export default function Loading() {
  return <FormSkeleton fields={12} />;
}
