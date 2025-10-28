// import { SignedIn } from "@clerk/nextjs";
// import UserDropdown from "./UserDropdown";
// import { Button } from "../ui/button";
// import { Bell, Menu } from "lucide-react";

// export default function MobileHeader() {
//   return (
//     <header className="shadow-regular fixed top-0 z-30 w-full rounded-b-[36px] border-b bg-white px-8 py-3">
//       <div className="flex h-9 items-center justify-between">
//         <Button variant="ghost" size="icon" aria-label="Open notification menu">
//           <Menu className="!h-6 !w-6" />
//         </Button>

//         <h1 className="text-base font-bold">SuperStore</h1>
//         <SignedIn>
//           <div className="flex items-center justify-between">
//             <Button
//               variant="ghost"
//               size="icon"
//               aria-label="Open notification menu"
//             >
//               <Bell className="!h-6 !w-6" />
//             </Button>
//             <UserDropdown />
//           </div>
//         </SignedIn>
//       </div>
//     </header>
//   );
// }

import { SignedIn } from "@clerk/nextjs";
import UserDropdown from "./UserDropdown";
import { Button } from "../ui/button";
import { Bell, Menu } from "lucide-react";
import Image from "next/image";

// Import shadcn sheet
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetClose,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import MobiledNav from "./MobileNav";
import Link from "next/link";

export default function MobileHeader() {
  return (
    <header className="shadow-regular fixed top-0 z-30 w-full rounded-b-[36px] border-b bg-white px-8 py-3">
      <div className="flex h-9 items-center justify-between">
        {/* SHEET for mobile menu */}
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Open main menu"
              className="mr-1"
            >
              <Menu className="!h-6 !w-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-full px-6 py-12">
            <SheetTitle hidden>Mobile main navigation</SheetTitle>
            <SheetDescription hidden>
              Links to areas of the app
            </SheetDescription>
            <MobiledNav />
            <SheetClose asChild>
              <Button variant="outline" className="mt-6">
                Close Menu
              </Button>
            </SheetClose>
          </SheetContent>
        </Sheet>

        <Link href="/dashboard" className="inline-block">
          <Image
            src="/images/shed5-logo.png"
            alt="Shed5"
            width={69}
            height={36}
            priority
          />
        </Link>

        <SignedIn>
          <div className="flex items-center justify-between">
            <Button variant="ghost" size="icon" aria-label="Open notifications">
              <Bell className="!h-6 !w-6" />
            </Button>
            <UserDropdown />
          </div>
        </SignedIn>
      </div>
    </header>
  );
}
