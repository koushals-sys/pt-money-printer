"use client";

import { ToastProvider } from "@/lib/toast";
import { AppProvider } from "@/lib/context";
import type { ClinicProfile, User } from "@/types";

interface ProvidersProps {
  children: React.ReactNode;
  initialUser?: User | null;
  initialClinic?: ClinicProfile | null;
}

export function Providers({ children, initialUser, initialClinic }: ProvidersProps) {
  return (
    <ToastProvider>
      <AppProvider initialUser={initialUser} initialClinic={initialClinic}>
        {children}
      </AppProvider>
    </ToastProvider>
  );
}
