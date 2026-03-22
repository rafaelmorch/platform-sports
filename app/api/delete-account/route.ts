import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  try {
    const { userId } = await req.json();

    console.log("DELETE ACCOUNT userId:", userId);
    console.log(
      "SUPABASE URL exists:",
      !!process.env.NEXT_PUBLIC_SUPABASE_URL
    );
    console.log(
      "SERVICE ROLE exists:",
      !!process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("PROFILE DELETE ERROR:", profileError);
      return NextResponse.json(
        { error: profileError.message },
        { status: 500 }
      );
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("AUTH DELETE ERROR:", authError);
      return NextResponse.json(
        { error: authError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("DELETE ACCOUNT ROUTE ERROR:", err);
    return NextResponse.json(
      { error: err?.message || "Unknown server error" },
      { status: 500 }
    );
  }
}