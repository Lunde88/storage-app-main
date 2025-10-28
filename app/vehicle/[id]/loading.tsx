import { Loader2 } from "lucide-react"; // or your spinner icon

export default function VehicleDetailLoading() {
  return (
    <div className="flex min-h-[80vh] w-full items-center justify-center">
      <Loader2 className="text-muted-foreground animate-spin" size={48} />
    </div>
  );
}
