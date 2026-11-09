import nodemailer from "nodemailer";

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
};

type EmailTemplateInput = {
  heading: string;
  // Each paragraph is rendered as its own <p>. Pass pre-escaped/trusted HTML
  // for a paragraph if it needs inline formatting (e.g. <strong>).
  paragraphs: string[];
  // A message's actual text, rendered as a distinct quoted/chat-bubble block
  // (sender name + body on a tinted background) instead of a plain paragraph
  // — used for enquiry and reply notifications so the email reads like a
  // conversation rather than a wall of undifferentiated body copy.
  quote?: { from: string; body: string };
  cta?: { label: string; url: string };
  // Small print shown under the CTA/body, e.g. link expiry or an opt-out note.
  footnote?: string;
};

// The exact logo mark used in AppBar.tsx/Header.tsx, rasterized to PNG and
// attached as a cid: inline image. Gmail strips <img src="data:..."> entirely
// (confirmed: it rendered as a blank box), so the logo has to ship as a real
// MIME attachment referenced by Content-ID rather than inlined as a data URI.
const LOGO_CID = "eip-logo";
const LOGO_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAFgAAABYCAYAAABxlTA0AAAAAXNSR0IArs4c6QAAAERlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAA6ABAAMAAAABAAEAAKACAAQAAAABAAAAWKADAAQAAAABAAAAWAAAAADngEgQAAACwElEQVR4Ae3dPU7kMBQHcBvR0QwlNBR0bE3BDZgGKo6AaNmTbI04xdLADTgBDRI1JbQ0hGcYRADHiZPYfs/vb2mkjO344+fEGc1YHmMQIAABCEAAAhCAAAQYCthQm56uDv9au3YQyqM9rWlebzePbv51Oax3Jbj4Fe5JKI/2NDJyBJ3A76nakVL2H8ApdalsACcGDs7B/rqbl6YxD/606mIX1pot9zQa27NoYIe7eXT9Z2yFUs57/r88pfv7Ygqu6yumCM+Iz4UL4Ghcun8jA67gFlj4ym0omMdW9kGHAF4x9eGaV3NGWZ8HqbYyAdipBR9odN0S7uL4+rLlNvhQPXBKXDcKqoFT46oGzoGrFjgXrkrgnLjqgHPjqgIugasGuBSuCuCSuNUDl8atGpgDbrXAXHCrBOaEWx0wN9yqgDniVgPMFbcKYM644oG544oGloArFlgKrkhgSbjigKXhigKWiCsGWCquCGDJuOyBpeOyBg7jUtMbcz92OZPreK7AcmVPLy7pNDZ+pWMu1HY97ICH4LY7wP2YFXBtuG7w2QCHceNXlnO5slkA9+LSA40LWGw7igP34tLiZykPNB9+UeAhuBI+ivlgP+OKAWvAdchFgLXgFgHWhJsdWBtuVmCNuNmAteJmAdaMmxxYO25SYOA63kSfg4H7gZsEGLhfuLMDA/c77qzAwP2NOxswcP24swADtxt3MjBww7iTgIHbjzsaGLjDcMcCL+hr+o4d8aZtIDS82XJyRv+i0b2XI3B9wx4N7N/LEbg+XBc3AvhnUcD9KdJ+H737avtkWoL3sd2gNedPV8vz72mzvtvxlLZPdd554pNF0fS4G1v4RGBLwWxTpe6VNVhjN4w1e1krHVHZDFPEiFoVnQLgxIMN4MTAwTnY/QnH6n8iEjdDbvHOSG7r0XIIQAACEIAABCCgVuANcLHpwHn2w18AAAAASUVORK5CYII=";

// Shared visual wrapper for every transactional email — mirrors the app's
// own palette (ink/bone/amber) so emails don't look like a bare, unstyled
// afterthought next to the rest of the product.
export function buildEmailTemplate({ heading, paragraphs, quote, cta, footnote }: EmailTemplateInput): string {
  const paragraphsHtml = paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#2b2d33;">${p}</p>`)
    .join("");

  const quoteHtml = quote
    ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
        <tr>
          <td style="background:#f3f1ea;border-left:3px solid #f0b34a;border-radius:0 12px 12px 0;padding:14px 18px;">
            <p style="margin:0 0 6px;font-size:12px;font-weight:600;color:#7a4f00;text-transform:uppercase;letter-spacing:0.04em;">${quote.from}</p>
            <p style="margin:0;font-size:15px;line-height:1.55;color:#2b2d33;white-space:pre-wrap;">${quote.body}</p>
          </td>
        </tr>
      </table>
    `
    : "";

  const ctaHtml = cta
    ? `
      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
        <tr>
          <td style="border-radius:999px;background:#f0b34a;">
            <a href="${cta.url}" style="display:inline-block;padding:13px 28px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;font-size:15px;font-weight:600;color:#101114;text-decoration:none;border-radius:999px;">
              ${cta.label}
            </a>
          </td>
        </tr>
      </table>
    `
    : "";

  const footnoteHtml = footnote
    ? `<p style="margin:0;font-size:13px;line-height:1.5;color:#5b5d63;">${footnote}</p>`
    : "";

  return `
<!DOCTYPE html>
<html>
  <body style="margin:0;padding:0;background:#e6e3dc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#e6e3dc;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" style="max-width:480px;background:#faf9f5;border-radius:20px;overflow:hidden;">
            <tr>
              <td style="padding:28px 32px 20px;border-bottom:1px solid rgba(16,17,20,0.08);">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding-right:12px;">
                      <img src="cid:${LOGO_CID}" width="22" height="22" alt="" style="display:block;width:22px;height:22px;" />
                    </td>
                    <td style="font-size:19px;font-weight:400;color:#101114;letter-spacing:0;font-family:Georgia,'Iowan Old Style',serif;">EIP Africa</td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                <h1 style="margin:0 0 18px;font-size:21px;font-weight:600;color:#101114;line-height:1.3;">${heading}</h1>
                ${paragraphsHtml}
                ${quoteHtml}
                ${ctaHtml}
                ${footnoteHtml}
              </td>
            </tr>
            <tr>
              <td style="padding:18px 32px;border-top:1px solid rgba(16,17,20,0.08);">
                <p style="margin:0;font-size:12px;color:#5b5d63;">
                  EIP Africa &mdash; energy and infrastructure opportunities across Africa.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();
}

function getTransport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    // Fail fast on a blocked/unreachable network instead of hanging for a
    // minute-plus while nodemailer retries IPv6 then IPv4 — a user-facing
    // form shouldn't ever look "stuck" waiting on an outbound mail server.
    connectionTimeout: 8000,
    greetingTimeout: 8000,
    socketTimeout: 8000,
  });
}

export async function sendEmail({ to, subject, html }: SendEmailInput) {
  const transport = getTransport();

  if (!transport) {
    console.log(`[email:dev] to=${to} subject="${subject}"\n${html}`);
    return;
  }

  await transport.sendMail({
    from: process.env.SMTP_FROM || "EIP Africa <no-reply@eip.africa>",
    to,
    subject,
    html,
    attachments: [
      {
        filename: "logo.png",
        content: LOGO_PNG_BASE64,
        encoding: "base64",
        cid: LOGO_CID,
      },
    ],
  });
}
