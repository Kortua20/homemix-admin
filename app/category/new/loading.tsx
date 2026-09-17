// Category forms are short: name, slug, description, plus images.
import { FormSkeleton } from "@/components/ui/form-skeleton";

export default function Loading() {
  return <FormSkeleton fields={4} />;
}
