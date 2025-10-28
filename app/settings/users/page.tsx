// app/settings/users/page.tsx
import {
  listUsersForOrg,
  listOrgLocations,
} from "@/lib/actions/userAdminActions";
import UsersManager from "@/components/settings/UsersManager";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export const dynamic = "force-dynamic"; // ensures fresh data on navigation/refresh (optional)

export default async function UsersSettingsPage() {
  try {
    const [users, locations] = await Promise.all([
      listUsersForOrg(),
      listOrgLocations(),
    ]);

    const userCount = users.length;
    const maxUsers = 5;

    return (
      <div className="mx-auto max-w-4xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Users</CardTitle>
            <CardDescription>
              Add, edit and remove team members; assign roles and locations.
              <br />
              You currently have <strong>{userCount}</strong> of {maxUsers}{" "}
              users.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <UsersManager
              initialUsers={users}
              allLocations={locations}
              maxUsers={maxUsers}
            />
          </CardContent>
        </Card>
      </div>
    );
  } catch {
    // list* actions throw when not authorised or no org
    return <div className="p-6 text-red-600">You are not authorised.</div>;
  }
}
