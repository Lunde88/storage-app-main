// app/settings/page.tsx
import { loadOrganisation } from "@/lib/actions/orgSettingsActions";

import OrgProfileForm from "@/components/settings/OrgProfileForm";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export default async function SettingsPage() {
  const org = await loadOrganisation();

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Organisation</CardTitle>
          <CardDescription>Update your company details.</CardDescription>
        </CardHeader>
        <CardContent>
          <OrgProfileForm
            initial={{
              name: org.name ?? "",
              address: org.address ?? "",
              contactEmail: org.contact_email ?? "",
              phone: org.phone ?? "",
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
