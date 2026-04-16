import { LoadingPage } from "@/components/ui/Loading";

export default function Loading() {
  return (
    <LoadingPage
      message="Loading Credit Freeze Manager..."
      submessage="Checking your freeze status across all bureaus"
    />
  );
}
