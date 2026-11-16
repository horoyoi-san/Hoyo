"use client";

import { useState, type ReactNode } from "react";

// Defer first mount, but preserve drafts, scroll position and mount effects
// across close/reopen. Unmounting on every close changes editor behaviour.
export default function MountOnOpen({ open, children }: { open: boolean; children: ReactNode }) {
  const [hasOpened, setHasOpened] = useState(open);
  if (open && !hasOpened) setHasOpened(true);
  return open || hasOpened ? <>{children}</> : null;
}
