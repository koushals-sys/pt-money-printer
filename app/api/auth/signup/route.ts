import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";

export interface SignupPayload {
  email: string;
  password: string;
  name: string;
  clinicName: string;
  city: string;
  state: string;
  zip?: string;
  address?: string;
  npiNumber?: string;
}

export async function POST(request: Request) {
  const body = (await request.json()) as SignupPayload;

  const { email, password, name, clinicName, city, state, zip, address, npiNumber } = body;

  if (!email || !password || !name || !clinicName || !city || !state) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const supabase = createServiceClient();

  // 1. Create auth user (service role skips email confirmation)
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (authError || !authData.user) {
    return NextResponse.json(
      { error: authError?.message ?? "Failed to create user" },
      { status: 400 }
    );
  }

  const userId = authData.user.id;

  // 2. Create clinic profile
  const { data: clinic, error: clinicError } = await supabase
    .from("clinic_profiles")
    .insert({
      name: clinicName,
      address: address ?? "",
      city,
      state,
      zip: zip ?? "",
      npi_number: npiNumber ?? null,
      injury_types: [],
      insurances_accepted: [],
    })
    .select("id")
    .single();

  if (clinicError || !clinic) {
    // Roll back auth user so the signup can be retried cleanly
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: clinicError?.message ?? "Failed to create clinic" },
      { status: 500 }
    );
  }

  // 3. Create users row linking the auth user to the clinic
  const { error: userError } = await supabase.from("users").insert({
    id: userId,
    clinic_id: clinic.id,
    name,
    email,
    role: "owner",
  });

  if (userError) {
    await supabase.auth.admin.deleteUser(userId);
    return NextResponse.json(
      { error: userError.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ clinicId: clinic.id });
}
