export default function PrivacyPolicyPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#020617",
        color: "#e5e7eb",
        padding: "32px 20px",
        maxWidth: 900,
        margin: "0 auto",
        lineHeight: 1.6,
        fontSize: 14,
      }}
    >
      <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 20 }}>
        Privacy Policy – Platform Sports
      </h1>

      <p><strong>Last updated:</strong> January 2026</p>

      <p>
        Platform Sports ("we", "our", or "us") respects your privacy and is committed
        to protecting your personal data. This Privacy Policy explains how we collect,
        use, and protect your information when you use the Platform Sports mobile
        application and website.
      </p>

      <h2>1. Information We Collect</h2>
      <ul>
        <li>Name and email address</li>
        <li>Account authentication data (including Google Sign-In)</li>
        <li>Sports activities, events, and app usage data</li>
      </ul>

      <h2>2. How We Use Your Information</h2>
      <ul>
        <li>Account creation and authentication</li>
        <li>Event and activity management</li>
        <li>App functionality and improvements</li>
        <li>User support</li>
      </ul>

      <h2>3. Third-Party Services</h2>
      <p>
        We use Supabase and Google Sign-In to provide authentication and backend
        services. These services may process data according to their own policies.
      </p>

      <h2>4. Data Sharing</h2>
      <p>
        We do not sell or rent your personal data. Data is shared only when required
        to operate the app securely.
      </p>

      <h2>5. Data Security</h2>
      <p>
        We apply appropriate security measures to protect your information.
      </p>

      <h2>6. Children’s Privacy</h2>
      <p>
        Platform Sports is not intended for children under 13 years of age.
      </p>

      <h2>7. Contact</h2>
      <p>
        Email: support@platformsports.app
      </p>
    </main>
  );
}
