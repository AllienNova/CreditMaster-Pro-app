import { LoadingPage } from "@/components/ui/Loading";

export default function Loading() {
  return (
    <LoadingPage
      message="Loading Debt Strategy Analyzer..."
      submessage="Calculating optimal payoff strategies"
    />
  );
}
