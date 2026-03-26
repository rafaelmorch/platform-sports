"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type ParticipationId = "clinic1" | "clinic2" | "tournament";

export default function BeachTennisRegistrationPage() {
  const router = useRouter();

  const categories = [
    "Feminino",
    "Masculino",
    "Mista",
    "Kids (até 13 anos)",
    "Pais e Filhos",
    "80+ Feminino (soma das idades)",
    "80+ Masculino (soma das idades)",
    "80+ Mista (soma das idades)",
  ];

  const levels = ["Beginner", "Intermediate", "Advanced"];
  const shirtSizes = ["P", "M", "G", "GG"];

  const participationOptions = [
    { id: "clinic1", label: "Clínica - 04/04/2026" },
    { id: "clinic2", label: "Clínica 2 - 04/26/2026" },
    { id: "tournament", label: "Torneio de Beach Tennis 05/16/2026" },
  ];

  const waiverText = `Acordo de Responsabilidade, Risco e Autorização de Imagem

1. Responsabilidade e Riscos:
Estou ciente e assumo integralmente todos os riscos inerentes à prática de atividade física, incluindo possíveis incidentes, quedas ou lesões leves que possam ocorrer durante o evento.

2. Condição Física:
Declaro que estou em boas condições de saúde e apto fisicamente para a prática esportiva, isentando a organização de qualquer responsabilidade médica.

3. Cumprimento das Regras:
Comprometo-me a seguir todas as regras, orientações e instruções fornecidas pela equipe organizadora e pelos monitores do evento.

4. Isenção de Responsabilidade:
Isento e desobrigo os organizadores, parceiros, patrocinadores, voluntários e todos os demais envolvidos no evento de qualquer responsabilidade civil, criminal ou financeira por incidentes que possam ocorrer durante a participação.

5. Uso de Imagem e Voz:
Autorizo, de forma livre e irrevogável, o uso da minha imagem e voz em fotos, vídeos e materiais promocionais relacionados ao evento, em meios digitais, impressos ou audiovisuais, sem limitação de tempo ou território.`;

  const [form, setForm] = useState({
    participant1: "",
    participant2: "",
    email: "",
    phone: "",
    category: "",
    level: "",
    shirt1: "",
    shirt2: "",
    termsAccepted: false,
    participation: [] as ParticipationId[],
    proof: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isLevelRequired = ["Feminino", "Masculino", "Mista"].includes(form.category);

  const total = useMemo(() => {
    const hasClinic1 = form.participation.includes("clinic1");
    const hasClinic2 = form.participation.includes("clinic2");
    const hasTournament = form.participation.includes("tournament");

    if (hasClinic1 && hasClinic2 && hasTournament) return 99.9;
    if ((hasClinic1 || hasClinic2) && hasTournament && !(hasClinic1 && hasClinic2)) return 79.9;
    if (hasClinic1 && hasClinic2 && !hasTournament) return 49.9;
    if (hasTournament && !hasClinic1 && !hasClinic2) return 59.9;
    if ((hasClinic1 || hasClinic2) && !hasTournament && !(hasClinic1 && hasClinic2)) return 29.9;

    return 0;
  }, [form.participation]);

  const summary = useMemo(() => {
    const hasClinic1 = form.participation.includes("clinic1");
    const hasClinic2 = form.participation.includes("clinic2");
    const hasTournament = form.participation.includes("tournament");

    if (hasClinic1 && hasClinic2 && hasTournament) return "Você selecionou o pacote completo: 2 clínicas + torneio.";
    if ((hasClinic1 || hasClinic2) && hasTournament && !(hasClinic1 && hasClinic2)) return "Você selecionou 1 clínica + torneio.";
    if (hasClinic1 && hasClinic2 && !hasTournament) return "Você selecionou as 2 clínicas.";
    if (hasTournament && !hasClinic1 && !hasClinic2) return "Você selecionou apenas o torneio.";
    if ((hasClinic1 || hasClinic2) && !hasTournament && !(hasClinic1 && hasClinic2)) return "Você selecionou apenas 1 clínica.";

    return "Selecione uma ou mais opções para ver o valor total.";
  }, [form.participation]);

  function setField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function toggleParticipation(option: ParticipationId) {
    setForm((prev) => {
      const exists = prev.participation.includes(option);
      return {
        ...prev,
        participation: exists
          ? prev.participation.filter((item) => item !== option)
          : [...prev.participation, option],
      };
    });
  }

  function resetShirt1() {
    setForm((prev) => ({ ...prev, shirt1: "", shirt2: "" }));
  }

  function resetShirt2() {
    setForm((prev) => ({ ...prev, shirt2: "" }));
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const body = new FormData();
      body.append("participant1", form.participant1);
      body.append("participant2", form.participant2);
      body.append("email", form.email);
      body.append("phone", form.phone);
      body.append("category", form.category);
      body.append("level", form.level);
      body.append("shirt1", form.shirt1);
      body.append("shirt2", form.shirt2);
      body.append("termsAccepted", String(form.termsAccepted));

      form.participation.forEach((item) => body.append("participation", item));

      if (form.proof) {
        body.append("proof", form.proof);
      }

      const response = await fetch("/api/beachtennis-registration", {
        method: "POST",
        body,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || "Erro ao enviar inscrição.");
      }

      router.push(`/beachtennis/success?code=${encodeURIComponent(result.confirmationCode)}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao enviar inscrição.");
    } finally {
      setLoading(false);
    }
  }

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "#f8fafc",
    color: "#111827",
    fontFamily: "Calibri, Arial, sans-serif",
    padding: "32px 16px 48px",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 760,
    margin: "0 auto",
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 18,
    border: "1px solid #e5e7eb",
    background: "#ffffff",
    padding: 20,
    boxShadow: "0 8px 24px rgba(15, 23, 42, 0.06)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 14,
    border: "1px solid #d1d5db",
    background: "#ffffff",
    padding: "14px 16px",
    fontSize: 14,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  };

  const optionStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 14,
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
    padding: 14,
    cursor: "pointer",
  };

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div
          style={{
            ...sectionStyle,
            marginBottom: 20,
            textAlign: "center",
          }}
        >
          <img
            src="/logo-sports-platform.png"
            alt="Platform Sports"
            style={{
              width: 160,
              maxWidth: "100%",
              height: "auto",
              marginBottom: 16,
            }}
          />

          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 600 }}>
            Inscrição Beach Tennis
          </h1>

          <p style={{ marginTop: 12, color: "#4b5563", lineHeight: 1.7 }}>
            Preencha os dados da dupla, escolha a categoria, selecione as experiências e faça o upload do comprovante de pagamento via Zelle.
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 20 }}>
          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Nome do participante 1</label>
            <input
              style={inputStyle}
              value={form.participant1}
              onChange={(e) => setField("participant1", e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Nome do participante 2</label>
            <input
              style={inputStyle}
              value={form.participant2}
              onChange={(e) => setField("participant2", e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>E-mail de contato</label>
            <input
              type="email"
              style={inputStyle}
              value={form.email}
              onChange={(e) => setField("email", e.target.value)}
              placeholder="Digite seu e-mail"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Telefone de contato</label>
            <input
              type="tel"
              style={inputStyle}
              value={form.phone}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="(689) 248-0582"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 600 }}>Escolha sua categoria</label>
            <div style={{ display: "grid", gap: 12 }}>
              {categories.map((option) => (
                <label key={option} style={optionStyle}>
                  <input
                    type="radio"
                    name="category"
                    checked={form.category === option}
                    onChange={() => {
                      const resetLevel = !["Feminino", "Masculino", "Mista"].includes(option);
                      setForm((prev) => ({
                        ...prev,
                        category: option,
                        level: resetLevel ? "" : prev.level,
                      }));
                    }}
                    required
                  />
                  <span style={{ color: "#111827", fontSize: 14 }}>{option}</span>
                </label>
              ))}
            </div>
          </div>

          {isLevelRequired && (
            <div style={sectionStyle}>
              <label style={{ display: "block", marginBottom: 12, fontWeight: 600 }}>Escolha seu nível</label>
              <div style={{ display: "grid", gap: 12 }}>
                {levels.map((option) => (
                  <label key={option} style={optionStyle}>
                    <input
                      type="radio"
                      name="level"
                      checked={form.level === option}
                      onChange={() => setField("level", option)}
                      required={isLevelRequired}
                    />
                    <span style={{ color: "#111827", fontSize: 14 }}>{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 12, fontWeight: 600 }}>Tamanho da camisa - Participante 1</label>

            {!form.shirt1 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {shirtSizes.map((size) => (
                  <label key={size} style={optionStyle}>
                    <input
                      type="radio"
                      name="shirt1"
                      checked={form.shirt1 === size}
                      onChange={() => setField("shirt1", size)}
                      required={!form.shirt1}
                    />
                    <span style={{ color: "#111827", fontSize: 14 }}>{size}</span>
                  </label>
                ))}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #e5e7eb",
                  borderRadius: 14,
                  background: "#f9fafb",
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span>Tamanho selecionado: {form.shirt1}</span>
                <button
                  type="button"
                  onClick={resetShirt1}
                  style={{
                    border: "1px solid #d1d5db",
                    background: "#ffffff",
                    color: "#111827",
                    borderRadius: 10,
                    padding: "8px 14px",
                    cursor: "pointer",
                  }}
                >
                  Alterar
                </button>
              </div>
            )}
          </div>

          {form.shirt1 && (
            <div style={sectionStyle}>
              <label style={{ display: "block", marginBottom: 12, fontWeight: 600 }}>Tamanho da camisa - Participante 2</label>

              {!form.shirt2 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {shirtSizes.map((size) => (
                    <label key={size} style={optionStyle}>
                      <input
                        type="radio"
                        name="shirt2"
                        checked={form.shirt2 === size}
                        onChange={() => setField("shirt2", size)}
                        required={!!form.shirt1 && !form.shirt2}
                      />
                      <span style={{ color: "#111827", fontSize: 14 }}>{size}</span>
                    </label>
                  ))}
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: 14,
                    background: "#f9fafb",
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <span>Tamanho selecionado: {form.shirt2}</span>
                  <button
                    type="button"
                    onClick={resetShirt2}
                    style={{
                      border: "1px solid #d1d5db",
                      background: "#ffffff",
                      color: "#111827",
                      borderRadius: 10,
                      padding: "8px 14px",
                      cursor: "pointer",
                    }}
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Escolha o que você gostaria de participar</label>
            <p style={{ marginTop: 0, marginBottom: 14, fontSize: 12, color: "#6b7280" }}>
              Você pode selecionar uma ou mais opções.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {participationOptions.map((option) => (
                <label key={option.id} style={optionStyle}>
                  <input
                    type="checkbox"
                    checked={form.participation.includes(option.id as ParticipationId)}
                    onChange={() => toggleParticipation(option.id as ParticipationId)}
                  />
                  <span style={{ color: "#111827", fontSize: 14 }}>{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div style={sectionStyle}>
            <p
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "#2563eb",
              }}
            >
              Resumo da inscrição
            </p>

            <p style={{ marginTop: 0, color: "#374151", lineHeight: 1.7 }}>{summary}</p>

            <div
              style={{
                marginTop: 18,
                borderRadius: 16,
                border: "1px solid #bfdbfe",
                background: "#eff6ff",
                padding: 16,
              }}
            >
              <p
                style={{
                  margin: 0,
                  fontSize: 12,
                  letterSpacing: "0.18em",
                  textTransform: "uppercase",
                  color: "#2563eb",
                }}
              >
                Valor total
              </p>
              <p style={{ margin: "6px 0 0 0", fontSize: 34, fontWeight: 600, color: "#111827" }}>
                ${total.toFixed(2)}
              </p>
            </div>

            <p style={{ marginTop: 16, color: "#374151", lineHeight: 1.7 }}>
              O pagamento será por Zelle. Faça o upload do comprovante para confirmar sua inscrição no valor indicado acima.
            </p>
          </div>

          <div style={sectionStyle}>
            <label style={{ display: "block", marginBottom: 8, fontWeight: 600 }}>Upload do comprovante de pagamento (Zelle)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              style={inputStyle}
              onChange={(e) => setField("proof", e.target.files?.[0] || null)}
              required
            />
            <p style={{ marginTop: 12, fontSize: 12, color: "#6b7280" }}>
              Formatos aceitos: JPG, PNG ou PDF.
            </p>
          </div>

          <div style={sectionStyle}>
            <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 20, fontWeight: 600, color: "#111827" }}>
              Acordo de Responsabilidade, Risco e Autorização de Imagem
            </h2>

            <div
              style={{
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-line",
                borderRadius: 14,
                border: "1px solid #e5e7eb",
                background: "#f9fafb",
                padding: 16,
                color: "#374151",
                lineHeight: 1.9,
                fontSize: 14,
              }}
            >
              {waiverText}
            </div>

            <label style={{ ...optionStyle, marginTop: 16 }}>
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => setField("termsAccepted", e.target.checked)}
                required
              />
              <span style={{ color: "#111827", fontSize: 14 }}>
                Eu li e concordo com os termos acima.
              </span>
            </label>
          </div>

          {error && (
            <div
              style={{
                borderRadius: 14,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
                padding: 14,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center" }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 0,
                borderRadius: 14,
                background: "#2563eb",
                color: "#ffffff",
                padding: "14px 24px",
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? "Enviando..." : "Enviar inscrição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


