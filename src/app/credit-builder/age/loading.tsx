import { LoadingPage } from "@/components/ui/Loading";

export default function Loading() {
  return (
    <LoadingPage
      message="Loading Credit Age Tracker..."
      submessage="Calculating your account age metrics"
    />
  );
}
