import type { Metadata } from "next";
import { Syne, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { createClient } from "@/lib/supabase/server";
import type { ClinicProfile, User } from "@/types";

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Spry Referral",
  description: "Referral outreach management for physical therapy clinics",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  let initialUser: User | null = null;
  let initialClinic: ClinicProfile | null = null;

  try {
    const supabase = await createClient();

    // Get authenticated user — null for unauthenticated visitors
    const { data: { user: authUser } } = await supabase.auth.getUser();

    if (authUser) {
      const { data: userRow } = await supabase
        .from("users")
        .select("*")
        .eq("id", authUser.id)
        .single();

      if (userRow) {
        initialUser = {
          id: userRow.id,
          clinic_id: userRow.clinic_id,
          name: userRow.name,
          email: userRow.email,
          role: userRow.role,
        };

        const { data: clinicRow } = await supabase
          .from("clinic_profiles")
          .select("*")
          .eq("id", userRow.clinic_id)
          .single();

        if (clinicRow) {
          initialClinic = {
            id: clinicRow.id,
            name: clinicRow.name,
            address: clinicRow.address ?? "",
            city: clinicRow.city ?? "",
            state: clinicRow.state ?? "",
            zip: clinicRow.zip ?? "",
            npi_number: clinicRow.npi_number ?? "",
            nps_score: clinicRow.nps_score ?? 0,
            injury_types: clinicRow.injury_types ?? [],
            insurances_accepted: clinicRow.insurances_accepted ?? [],
            avg_recovery_days: clinicRow.avg_recovery_days ?? 0,
          };
        }
      }
    }
  } catch (err) {
    console.error("[layout] error:", err);
  }

  return (
    <html
      lang="en"
      className={`${syne.variable} ${dmSans.variable} ${geistMono.variable} h-full antialiased dark`}
    >
      <body className="min-h-full" suppressHydrationWarning>
        <Providers initialUser={initialUser} initialClinic={initialClinic}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
