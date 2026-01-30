export default function TermsPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f3f4f6", // cinza claro
        color: "#000000",
        padding: "40px 20px",
        maxWidth: 900,
        margin: "0 auto",
        lineHeight: 1.7,
        fontSize: 14,
        fontFamily: "Tahoma, Arial, sans-serif",
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 20 }}>
        Terms & Conditions – Platform Sports
      </h1>

      <p><strong>Last updated:</strong> January 2026</p>

      <p>
        By accessing or using Platform Sports (the "Service"), you agree to these Terms & Conditions.
        If you do not agree, do not use the Service.
      </p>

      <h2>1. Accounts</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account and for all activities
        that occur under your account.
      </p>

      <h2>2. Acceptable Use</h2>
      <ul>
        <li>Do not misuse the Service or attempt to access it using a method other than the interface provided.</li>
        <li>Do not disrupt or interfere with the security or functionality of the Service.</li>
      </ul>

      <h2>3. Content and Activity Data</h2>
      <p>
        The Service may display activity, events, and performance data. You are responsible for the accuracy of
        information you provide and for your participation in any activity.
      </p>

      <h2>4. Third-Party Services</h2>
      <p>
        The Service may integrate with third-party services (e.g., Supabase, Google Sign-In). Their terms and policies
        may apply.
      </p>

      <h2>5. Disclaimer</h2>
      <p>
        The Service is provided "as is" without warranties of any kind. Use of the Service is at your own risk.
        Platform Sports is not responsible for injuries, losses, or damages arising from participation in activities or events.
      </p>

      <h2>6. Termination</h2>
      <p>
        We may suspend or terminate access to the Service at any time if you violate these Terms.
      </p>

      <h2>7. Contact</h2>
      <p>
        Email: support@platformsports.app
      </p>
    </main>
  );
}
