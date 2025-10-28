// components/search/SearchDialogController.tsx
"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import SearchAnything from "@/components/search/SearchAnything";

export default function SearchDialogController() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const isOpen = params.has("search");

  const onOpenChange = (open: boolean) => {
    const p = new URLSearchParams(params.toString());
    if (open) p.set("search", "1");
    else p.delete("search");
    router.replace(`${pathname}?${p.toString()}`, { scroll: false });
  };

  return (
    <SearchAnything
      mode="dialog"
      open={isOpen}
      onOpenChange={onOpenChange}
      enableShortcut // keep ⌘K / Ctrl+K
      showTrigger={false}
    />
  );
}
