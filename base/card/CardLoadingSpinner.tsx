import { Loader2 } from "lucide-react";

export default function CardLoadingSpinner() {
  return (
    <div className="flex w-full items-center justify-center py-8">
      <Loader2 className="text-muted-foreground animate-spin" size={20} />
    </div>
  );
}
