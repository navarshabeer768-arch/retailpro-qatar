"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function SpaRedirect() {
  const router = useRouter();

  useEffect(() => {
    const redirectPath = sessionStorage.getItem("redirectPath");
    if (redirectPath) {
      sessionStorage.removeItem("redirectPath");
      router.replace(redirectPath);
    }
  }, []);

  return null;
}
