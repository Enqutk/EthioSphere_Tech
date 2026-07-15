/**
 * Optional outbound email. Uses Resend when RESEND_API_KEY is set; logs links in dev otherwise.
 */
export async function sendPasswordResetEmail({ to, resetUrl }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Programmers World <onboarding@resend.dev>';

  const subject = 'Reset your Programmers World password';
  const html = `
    <p>You requested a password reset for your Programmers World account.</p>
    <p><a href="${resetUrl}">Reset your password</a></p>
    <p>This link expires in one hour. If you did not request this, you can ignore this email.</p>
  `.trim();

  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Email send failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[password-reset] Reset link (dev only):', resetUrl);
  }
}

export async function sendEmailVerificationEmail({ to, verifyUrl }) {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || 'Programmers World <onboarding@resend.dev>';

  const subject = 'Verify your Programmers World email';
  const html = `
    <p>Confirm this email address to finish creating your Programmers World account.</p>
    <p><a href="${verifyUrl}">Verify email address</a></p>
    <p>This link expires in 24 hours. If you did not create an account, you can ignore this email.</p>
  `.trim();

  if (apiKey) {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [to], subject, html }),
    });
    if (!res.ok) {
      const detail = await res.text().catch(() => '');
      throw new Error(`Email send failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ''}`);
    }
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info('[email-verify] Verification link (dev only):', verifyUrl);
  }
}
