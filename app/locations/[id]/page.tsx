import BackButton from "@/components/base/buttons/BackButton";

export default async function LocationDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return (
    <div className="flex flex-col items-center gap-5 md:flex-row md:items-start">
      <BackButton href="/dashboard">← Back to Dashboard</BackButton>
      <span className="uppercase">LOCATION DETAILS PAGE: {id}</span>
    </div>
  );
}
