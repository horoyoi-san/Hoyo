"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// framer-motion's drag measuring forces a reflow at startup, so mount it once idle.
const QuickViewBubble = dynamic(() => import("./quickViewBubble"), { ssr: false });

export default function LazyQuickViewBubble() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if ("requestIdleCallback" in window) {
      const id = window.requestIdleCallback(() => setShow(true), { timeout: 4000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = setTimeout(() => setShow(true), 1500);
    return () => clearTimeout(id);
  }, []);
  return show ? <QuickViewBubble /> : null;
}
