// app/s
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { ReactNode } from "react";

export default function SettingsLayout({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="grid gap-6 md:grid-cols-[220px_1fr]">
        <aside className="h-max md:sticky md:top-6">
          <SettingsSidebar />
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
