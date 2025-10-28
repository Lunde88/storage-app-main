// "use client";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuTrigger,
//   DropdownMenuSeparator,
//   DropdownMenuLabel,
// } from "@/components/ui/dropdown-menu";
// import { UserRound, LogOut, Settings } from "lucide-react";
// import { useUser, useClerk } from "@clerk/nextjs";
// import { Button } from "../ui/button";

// export default function UserDropdown() {
//   const { user } = useUser();
//   const { openUserProfile, signOut } = useClerk();

//   return (
//     <DropdownMenu>
//       <DropdownMenuTrigger asChild>
//         <Button variant="ghost" size="icon" aria-label="Open user menu">
//           <UserRound className="!h-6 !w-6" />
//         </Button>
//       </DropdownMenuTrigger>
//       <DropdownMenuContent align="end" className="w-48">
//         <DropdownMenuLabel>
//           <div className="font-medium">{user?.fullName ?? "Account"}</div>
//           <div className="text-xs text-gray-500">
//             {user?.emailAddresses[0]?.emailAddress}
//           </div>
//         </DropdownMenuLabel>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           onClick={() => openUserProfile()}
//           className="cursor-pointer"
//         >
//           <Settings className="mr-2 h-4 w-4" />
//           Profile
//         </DropdownMenuItem>
//         <DropdownMenuSeparator />
//         <DropdownMenuItem
//           onClick={() => signOut()}
//           className="cursor-pointer text-red-600"
//         >
//           <LogOut className="mr-2 h-4 w-4" />
//           Sign out
//         </DropdownMenuItem>
//       </DropdownMenuContent>
//     </DropdownMenu>
//   );
// }

"use client";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { UserRound, LogOut, Settings, Check } from "lucide-react";
import { useUser, useClerk, useAuth, useOrganizationList } from "@clerk/nextjs";
import { Button } from "../ui/button";

export default function UserDropdown() {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  const { orgId } = useAuth();

  // Get memberships; no external type imports needed
  const { isLoaded, userMemberships, setActive } = useOrganizationList({
    userMemberships: { pageSize: 100 },
  });

  const memberships = userMemberships?.data ?? [];
  const hasMultipleOrgs = memberships.length > 1;

  async function handleSwitch(organisationId: string) {
    if (!isLoaded || !setActive) return;
    await setActive({ organization: organisationId }); // updates Clerk session
    window.location.assign("/dashboard");
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open user menu">
          <UserRound className="!h-6 !w-6" />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="font-medium">{user?.fullName ?? "Account"}</div>
          <div className="text-muted-foreground text-xs">
            {user?.emailAddresses[0]?.emailAddress}
          </div>
        </DropdownMenuLabel>

        {hasMultipleOrgs && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Organisation</DropdownMenuLabel>

            {!isLoaded && (
              <DropdownMenuItem disabled>
                Loading organisations…
              </DropdownMenuItem>
            )}

            {isLoaded &&
              memberships.map((m) => {
                const organization = m.organization;
                const isActive = organization.id === orgId;
                return (
                  <DropdownMenuItem
                    key={organization.id}
                    role="menuitemradio"
                    aria-checked={isActive}
                    // onSelect={() =>
                    //   setActive({ organization: organization.id })
                    // }
                    onSelect={() => handleSwitch(organization.id)}
                    className={`flex cursor-pointer items-center justify-between ${
                      isActive ? "bg-accent/50 font-medium" : ""
                    }`}
                  >
                    <span className="truncate">{organization.name}</span>
                    {isActive && <Check className="h-4 w-4" aria-hidden />}
                  </DropdownMenuItem>
                );
              })}
          </>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => openUserProfile()}
          className="cursor-pointer"
        >
          <Settings className="mr-2 h-4 w-4" />
          Profile
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onSelect={() => signOut()}
          className="cursor-pointer text-red-600 focus:text-red-700"
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
