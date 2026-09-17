// The product form is long, and its edit route also fetches grades, aspects and all
// three attribute vocabularies before it can render anything.
import { FormSkeleton } from "@/components/ui/form-skeleton";

export default function Loading() {
  return <FormSkeleton fields={12} />;
}
