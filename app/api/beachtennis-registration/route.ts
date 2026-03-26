import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabaseServer";
import {
  buildBeachTennisSummary,
  calculateBeachTennisTotal,
  type ParticipationId,
} from "@/lib/beachTennisRegistration";

function generateConfirmationCode() {
  return `PS-${Math.floor(100000 + Math.random() * 900000)}`;
}

export async function POST(request: Request) {
  try {
    const supabase = createSupabaseServerClient();
    const formData = await request.formData();

    const participant1 = String(formData.get("participant1") || "").trim();
    const participant2 = String(formData.get("participant2") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = String(formData.get("phone") || "").trim();
    const category = String(formData.get("category") || "").trim();
    const level = String(formData.get("level") || "").trim();
    const shirt1 = String(formData.get("shirt1") || "").trim();
    const shirt2 = String(formData.get("shirt2") || "").trim();
    const termsAccepted = String(formData.get("termsAccepted") || "") === "true";

    const selectedOptions = formData
      .getAll("participation")
      .map((value) => String(value))
      .filter(Boolean) as ParticipationId[];

    const proofFile = formData.get("proof") as File | null;

    if (!participant1 || !participant2 || !email || !phone || !category || !shirt1 || !shirt2) {
      return NextResponse.json(
        { error: "Preencha todos os campos obrigatórios." },
        { status: 400 }
      );
    }

    if (!termsAccepted) {
      return NextResponse.json(
        { error: "É necessário aceitar os termos." },
        { status: 400 }
      );
    }

    if (!selectedOptions.length) {
      return NextResponse.json(
        { error: "Selecione ao menos uma opção de participação." },
        { status: 400 }
      );
    }

    if (["Feminino", "Masculino", "Mista"].includes(category) && !level) {
      return NextResponse.json(
        { error: "O nível é obrigatório para a categoria selecionada." },
        { status: 400 }
      );
    }

    if (!proofFile) {
      return NextResponse.json(
        { error: "Envie o comprovante do pagamento." },
        { status: 400 }
      );
    }

    const totalAmount = calculateBeachTennisTotal(selectedOptions);
    const selectionSummary = buildBeachTennisSummary(selectedOptions);
    const confirmationCode = generateConfirmationCode();

    const fileExt = proofFile.name.split(".").pop() || "bin";
    const safeEmail = email.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const fileName = `${Date.now()}-${safeEmail}.${fileExt}`;
    const filePath = `beach-tennis/${fileName}`;

    const fileBuffer = Buffer.from(await proofFile.arrayBuffer());

    const uploadResult = await supabase.storage
      .from("registration-proofs")
      .upload(filePath, fileBuffer, {
        contentType: proofFile.type || "application/octet-stream",
        upsert: false,
      });

    if (uploadResult.error) {
      return NextResponse.json(
        { error: uploadResult.error.message },
        { status: 500 }
      );
    }

    const insertResult = await supabase
      .from("beach_tennis_registrations")
      .insert({
        participant_1_name: participant1,
        participant_2_name: participant2,
        contact_email: email,
        contact_phone: phone,
        category: category,
        level: level || null,
        shirt_size_participant_1: shirt1,
        shirt_size_participant_2: shirt2,
        selected_options: selectedOptions,
        selection_summary: selectionSummary,
        total_amount: totalAmount,
        payment_proof_path: filePath,
        payment_proof_url: null,
        terms_accepted: true,
        status: "submitted",
        confirmation_code: confirmationCode,
      });

    if (insertResult.error) {
      return NextResponse.json(
        { error: insertResult.error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, confirmationCode });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Erro inesperado ao enviar inscrição.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
