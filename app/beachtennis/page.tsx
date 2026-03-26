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
    { id: "clinic1" as ParticipationId, label: "Clínica - 04/04/2026", price: 29.9 },
    { id: "clinic2" as ParticipationId, label: "Clínica 2 - 04/26/2026", price: 29.9 },
    { id: "tournament" as ParticipationId, label: "Torneio de Beach Tennis 05/16/2026", price: 59.9 },
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

  const originalTotal = useMemo(() => {
    return form.participation.reduce((sum, id) => {
      const option = participationOptions.find((item) => item.id === id);
      return sum + (option?.price || 0);
    }, 0);
  }, [form.participation]);

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

  const discount = useMemo(() => {
    const value = originalTotal - total;
    return value > 0 ? value : 0;
  }, [originalTotal, total]);

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
    background: "linear-gradient(180deg, #f8fafc 0%, #edf3fb 100%)",
    color: "#1f2937",
    fontFamily: "Calibri, Arial, sans-serif",
    padding: "28px 16px 56px",
  };

  const containerStyle: React.CSSProperties = {
    maxWidth: 760,
    margin: "0 auto",
  };

  const sectionStyle: React.CSSProperties = {
    borderRadius: 22,
    border: "1px solid rgba(226, 232, 240, 0.95)",
    background: "rgba(255, 255, 255, 0.97)",
    padding: 22,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.05)",
    backdropFilter: "blur(6px)",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 16,
    border: "1px solid #d8e1ec",
    background: "#ffffff",
    padding: "15px 16px",
    fontSize: 15,
    color: "#111827",
    outline: "none",
    boxSizing: "border-box",
  };

  const optionBaseStyle: React.CSSProperties = {
    display: "flex",
    gap: 12,
    alignItems: "flex-start",
    borderRadius: 16,
    border: "1px solid #e5e7eb",
    background: "#fbfdff",
    padding: 15,
    cursor: "pointer",
    transition: "all 0.2s ease",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    marginBottom: 10,
    fontWeight: 600,
    fontSize: 15,
    color: "#1f2937",
  };

  const helperTextStyle: React.CSSProperties = {
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 1.6,
  };

  function getSelectableCardStyle(selected: boolean): React.CSSProperties {
    return {
      ...optionBaseStyle,
      border: selected ? "1px solid #64748b" : "1px solid #e5e7eb",
      background: selected ? "#f1f5f9" : "#fbfdff",
      boxShadow: selected ? "0 0 0 3px rgba(100, 116, 139, 0.12)" : "none",
    };
  }

  return (
    <div style={pageStyle}>
      <div style={containerStyle}>
        <div
          style={{
            ...sectionStyle,
            marginBottom: 22,
            padding: 18,
            background: "linear-gradient(180deg, #111827 0%, #1f2937 100%)",
            border: "1px solid rgba(51, 65, 85, 0.95)",
            boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              borderRadius: 18,
              background:
                "radial-gradient(circle at top left, rgba(148,163,184,0.20), rgba(17,24,39,0.98) 60%), linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
              padding: "22px 18px 20px",
              border: "1px solid rgba(71, 85, 105, 0.45)",
            }}
          >
            <img
              src="/logo-sports-platform.png"
              alt="Platform Sports"
              style={{
                width: "100%",
                maxWidth: "100%",
                height: "auto",
                display: "block",
                margin: "0 auto 18px",
              }}
            />

            <h1
              style={{
                margin: 0,
                fontSize: 34,
                fontWeight: 600,
                color: "#f8fafc",
                letterSpacing: "-0.02em",
                textAlign: "center",
              }}
            >
              Inscrição Beach Tennis
            </h1>

            <p
              style={{
                marginTop: 12,
                marginBottom: 0,
                color: "#cbd5e1",
                lineHeight: 1.8,
                fontSize: 16,
                textAlign: "center",
                maxWidth: 620,
                marginInline: "auto",
              }}
            >
              Preencha os dados da dupla, escolha a categoria, selecione as experiências e faça o upload do comprovante de pagamento via Zelle.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "grid", gap: 18 }}>
          <div style={sectionStyle}>
            <label style={labelStyle}>Nome do participante 1</label>
            <input
              style={inputStyle}
              value={form.participant1}
              onChange={(e) => setField("participant1", e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Nome do participante 2</label>
            <input
              style={inputStyle}
              value={form.participant2}
              onChange={(e) => setField("participant2", e.target.value)}
              placeholder="Digite o nome completo"
              required
            />
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>E-mail de contato</label>
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
            <label style={labelStyle}>Telefone de contato</label>
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
            <label style={labelStyle}>Escolha sua categoria</label>
            <div style={{ display: "grid", gap: 12 }}>
              {categories.map((option) => {
                const selected = form.category === option;

                return (
                  <label key={option} style={getSelectableCardStyle(selected)}>
                    <input
                      type="radio"
                      name="category"
                      checked={selected}
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
                    <span style={{ color: "#111827", fontSize: 15 }}>{option}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {isLevelRequired && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Escolha seu nível</label>
              <div style={{ display: "grid", gap: 12 }}>
                {levels.map((option) => {
                  const selected = form.level === option;

                  return (
                    <label key={option} style={getSelectableCardStyle(selected)}>
                      <input
                        type="radio"
                        name="level"
                        checked={selected}
                        onChange={() => setField("level", option)}
                        required={isLevelRequired}
                      />
                      <span style={{ color: "#111827", fontSize: 15 }}>{option}</span>
                    </label>
                  );
                })}
              </div>
              <p style={helperTextStyle}>
                Este campo aparece apenas para as categorias Feminino, Masculino e Mista.
              </p>
            </div>
          )}

          <div style={sectionStyle}>
            <label style={labelStyle}>Tamanho da camisa - Participante 1</label>

            {!form.shirt1 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {shirtSizes.map((size) => {
                  const selected = form.shirt1 === size;

                  return (
                    <label key={size} style={getSelectableCardStyle(selected)}>
                      <input
                        type="radio"
                        name="shirt1"
                        checked={selected}
                        onChange={() => setField("shirt1", size)}
                        required={!form.shirt1}
                      />
                      <span style={{ color: "#111827", fontSize: 15 }}>{size}</span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div
                style={{
                  border: "1px solid #dbeafe",
                  borderRadius: 16,
                  background: "#f8fbff",
                  padding: 16,
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <span style={{ color: "#1f2937", fontSize: 15 }}>
                  Tamanho selecionado: <strong>{form.shirt1}</strong>
                </span>

                <button
                  type="button"
                  onClick={resetShirt1}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#1f2937",
                    borderRadius: 12,
                    padding: "9px 16px",
                    cursor: "pointer",
                    fontFamily: "Calibri, Arial, sans-serif",
                    fontSize: 14,
                  }}
                >
                  Alterar
                </button>
              </div>
            )}
          </div>

          {form.shirt1 && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Tamanho da camisa - Participante 2</label>

              {!form.shirt2 ? (
                <div style={{ display: "grid", gap: 12 }}>
                  {shirtSizes.map((size) => {
                    const selected = form.shirt2 === size;

                    return (
                      <label key={size} style={getSelectableCardStyle(selected)}>
                        <input
                          type="radio"
                          name="shirt2"
                          checked={selected}
                          onChange={() => setField("shirt2", size)}
                          required={!!form.shirt1 && !form.shirt2}
                        />
                        <span style={{ color: "#111827", fontSize: 15 }}>{size}</span>
                      </label>
                    );
                  })}
                </div>
              ) : (
                <div
                  style={{
                    border: "1px solid #dbeafe",
                    borderRadius: 16,
                    background: "#f8fbff",
                    padding: 16,
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ color: "#1f2937", fontSize: 15 }}>
                    Tamanho selecionado: <strong>{form.shirt2}</strong>
                  </span>

                  <button
                    type="button"
                    onClick={resetShirt2}
                    style={{
                      border: "1px solid #cbd5e1",
                      background: "#ffffff",
                      color: "#1f2937",
                      borderRadius: 12,
                      padding: "9px 16px",
                      cursor: "pointer",
                      fontFamily: "Calibri, Arial, sans-serif",
                      fontSize: 14,
                    }}
                  >
                    Alterar
                  </button>
                </div>
              )}
            </div>
          )}

          <div style={sectionStyle}>
            <label style={labelStyle}>Escolha o que você gostaria de participar</label>
            <p style={{ ...helperTextStyle, marginTop: 0, marginBottom: 14 }}>
              Você pode selecionar uma ou mais opções.
            </p>

            <div style={{ display: "grid", gap: 12 }}>
              {participationOptions.map((option) => {
                const selected = form.participation.includes(option.id);

                return (
                  <label key={option.id} style={getSelectableCardStyle(selected)}>
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => toggleParticipation(option.id)}
                    />
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      <span style={{ color: "#111827", fontSize: 15 }}>{option.label}</span>
                      <span style={{ color: "#64748b", fontSize: 13 }}>
                        Valor individual: ${option.price.toFixed(2)}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div style={sectionStyle}>
            <p
              style={{
                margin: 0,
                marginBottom: 8,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#2563eb",
              }}
            >
              Resumo da inscrição
            </p>

            <p
              style={{
                marginTop: 0,
                color: "#475569",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              {summary}
            </p>

            <div
              style={{
                marginTop: 18,
                borderRadius: 18,
                border: "1px solid #bfdbfe",
                background: "linear-gradient(180deg, #f0f7ff 0%, #eaf3ff 100%)",
                padding: 18,
                display: "grid",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "#334155" }}>Valor original</span>
                <span style={{ fontSize: 14, color: "#0f172a" }}>${originalTotal.toFixed(2)}</span>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, color: "#334155" }}>Desconto</span>
                <span style={{ fontSize: 14, color: discount > 0 ? "#16a34a" : "#0f172a" }}>
                  ${discount.toFixed(2)}
                </span>
              </div>

              <div
                style={{
                  height: 1,
                  background: "rgba(148, 163, 184, 0.35)",
                  margin: "2px 0 4px",
                }}
              />

              <div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 12,
                    letterSpacing: "0.16em",
                    textTransform: "uppercase",
                    color: "#2563eb",
                  }}
                >
                  Valor final
                </p>

                <p
                  style={{
                    margin: "8px 0 0 0",
                    fontSize: 38,
                    fontWeight: 600,
                    color: "#0f172a",
                  }}
                >
                  ${total.toFixed(2)}
                </p>
              </div>
            </div>

            <p
              style={{
                marginTop: 16,
                color: "#475569",
                lineHeight: 1.8,
                fontSize: 15,
              }}
            >
              O pagamento será por Zelle. Faça o upload do comprovante para confirmar sua inscrição no valor indicado acima.
            </p>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>Upload do comprovante de pagamento (Zelle)</label>
            <input
              type="file"
              accept=".jpg,.jpeg,.png,.pdf"
              style={inputStyle}
              onChange={(e) => setField("proof", e.target.files?.[0] || null)}
              required
            />
            <p style={helperTextStyle}>Formatos aceitos: JPG, PNG ou PDF.</p>
          </div>

          <div style={sectionStyle}>
            <h2
              style={{
                marginTop: 0,
                marginBottom: 16,
                fontSize: 21,
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              Acordo de Responsabilidade, Risco e Autorização de Imagem
            </h2>

            <div
              style={{
                maxHeight: 320,
                overflow: "auto",
                whiteSpace: "pre-line",
                borderRadius: 16,
                border: "1px solid #e5e7eb",
                background: "#fbfdff",
                padding: 16,
                color: "#475569",
                lineHeight: 1.9,
                fontSize: 14,
              }}
            >
              {waiverText}
            </div>

            <label style={{ ...getSelectableCardStyle(form.termsAccepted), marginTop: 16 }}>
              <input
                type="checkbox"
                checked={form.termsAccepted}
                onChange={(e) => setField("termsAccepted", e.target.checked)}
                required
              />
              <span style={{ color: "#111827", fontSize: 15 }}>
                Eu li e concordo com os termos acima.
              </span>
            </label>
          </div>

          {error && (
            <div
              style={{
                borderRadius: 16,
                border: "1px solid #fecaca",
                background: "#fff5f5",
                color: "#b91c1c",
                padding: 15,
                fontSize: 14,
                lineHeight: 1.6,
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "center", paddingTop: 4 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                border: 0,
                borderRadius: 16,
                background: loading ? "#93c5fd" : "linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)",
                color: "#ffffff",
                padding: "16px 30px",
                fontWeight: 600,
                fontSize: 16,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.85 : 1,
                minWidth: 220,
                boxShadow: loading ? "none" : "0 10px 22px rgba(37, 99, 235, 0.22)",
                transition: "all 0.2s ease",
                fontFamily: "Calibri, Arial, sans-serif",
              }}
            >
              {loading ? "Enviando inscrição..." : "Enviar inscrição"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}