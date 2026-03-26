type SuccessPageProps = {
  searchParams?: Promise<{
    code?: string;
  }>;
};

export default async function BeachTennisSuccessPage({
  searchParams,
}: SuccessPageProps) {
  const params = searchParams ? await searchParams : undefined;
  const code = params?.code;

  const pageStyle: React.CSSProperties = {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #edf3fb 100%)",
    color: "#1f2937",
    fontFamily: "Calibri, Arial, sans-serif",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
  };

  const cardStyle: React.CSSProperties = {
    width: "100%",
    maxWidth: 760,
    background: "rgba(255, 255, 255, 0.97)",
    border: "1px solid rgba(226, 232, 240, 0.95)",
    borderRadius: 22,
    padding: 20,
    boxShadow: "0 14px 34px rgba(15, 23, 42, 0.05)",
  };

  const darkHeroStyle: React.CSSProperties = {
    borderRadius: 18,
    background:
      "radial-gradient(circle at top left, rgba(148,163,184,0.20), rgba(17,24,39,0.98) 60%), linear-gradient(135deg, #0f172a 0%, #1e293b 100%)",
    padding: "22px 18px 20px",
    border: "1px solid rgba(71, 85, 105, 0.45)",
    marginBottom: 22,
  };

  const codeCardStyle: React.CSSProperties = {
    marginTop: 20,
    padding: 18,
    borderRadius: 18,
    background: "linear-gradient(180deg, #f0f7ff 0%, #eaf3ff 100%)",
    border: "1px solid #bfdbfe",
  };

  return (
    <div style={pageStyle}>
      <div style={cardStyle}>
        <div style={darkHeroStyle}>
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
            Inscrição realizada
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
            Recebemos sua inscrição com sucesso. A confirmação será enviada por e-mail em breve.
          </p>
        </div>

        {code && (
          <div style={codeCardStyle}>
            <p
              style={{
                margin: 0,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "#2563eb",
              }}
            >
              Código de confirmação
            </p>

            <p
              style={{
                margin: "8px 0 0 0",
                fontSize: 36,
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {code}
            </p>
          </div>
        )}

        <p
          style={{
            marginTop: 20,
            marginBottom: 0,
            color: "#475569",
            lineHeight: 1.8,
            fontSize: 16,
            textAlign: "center",
          }}
        >
          Guarde esse código para referência futura.
        </p>
      </div>
    </div>
  );
}
