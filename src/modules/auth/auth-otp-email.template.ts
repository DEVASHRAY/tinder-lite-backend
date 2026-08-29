interface BuildOtpVerificationEmailInput {
  expiresInMinutes: number;
  otp: string;
  productName: string;
}

interface EscapeHtmlInput {
  value: string;
}

interface OtpVerificationEmailContent {
  html: string;
  subject: string;
  text: string;
}

const otpPattern = /^\d{6}$/;

const escapeHtml = ({ value }: EscapeHtmlInput): string => {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
};

const buildOtpVerificationEmail = ({
  expiresInMinutes,
  otp,
  productName,
}: BuildOtpVerificationEmailInput): OtpVerificationEmailContent => {
  if (!otpPattern.test(otp)) {
    throw new Error('OTP email requires a six-digit numeric code');
  }

  if (!Number.isInteger(expiresInMinutes) || expiresInMinutes < 1) {
    throw new Error('OTP email requires a positive integer expiry');
  }

  const normalizedProductName = productName.trim();

  if (
    !normalizedProductName ||
    normalizedProductName.includes('\r') ||
    normalizedProductName.includes('\n')
  ) {
    throw new Error('OTP email requires a valid product name');
  }

  const expiresInMinutesText = String(expiresInMinutes);
  const expiryUnit = expiresInMinutes === 1 ? 'minute' : 'minutes';
  const escapedExpiresInMinutes = escapeHtml({ value: expiresInMinutesText });
  const escapedOtp = escapeHtml({ value: otp });
  const escapedProductName = escapeHtml({ value: normalizedProductName });
  const subject = `Your ${normalizedProductName} verification code`;
  const text = `${normalizedProductName} secure sign-in

One code. Then you're in.

Your verification code: ${otp}

Enter this code in ${normalizedProductName}.
It expires in ${expiresInMinutesText} ${expiryUnit}.

Didn't request this? You can safely ignore this email.
Never share this code. ${normalizedProductName} will never ask you for it.`;
  const html = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light dark">
    <meta name="supported-color-schemes" content="light dark">
    <meta name="format-detection" content="telephone=no,date=no,address=no,email=no,url=no">
    <title>Verification code</title>
    <style type="text/css">
      body,
      table,
      td {
        -webkit-text-size-adjust: 100%;
        -ms-text-size-adjust: 100%;
      }

      table,
      td {
        mso-table-lspace: 0;
        mso-table-rspace: 0;
      }

      table {
        border-spacing: 0;
      }

      .otp-code {
        font-variant-numeric: tabular-nums;
      }

      @media only screen and (max-width: 480px) {
        .outer-pad {
          padding: 12px 8px !important;
        }

        .hero-pad {
          padding: 26px 22px 32px !important;
        }

        .content-pad {
          padding: 30px 22px 32px !important;
        }

        .footer-pad {
          padding: 22px !important;
        }

        .hero-title {
          font-size: 35px !important;
          line-height: 41px !important;
          letter-spacing: -0.7px !important;
        }

        .otp-code {
          font-size: 36px !important;
          line-height: 44px !important;
          letter-spacing: 3px !important;
        }

        .hide-mobile {
          display: none !important;
        }

        .footer-brand,
        .footer-message {
          display: block !important;
          width: 100% !important;
          text-align: left !important;
        }

        .footer-message {
          padding-top: 6px !important;
        }
      }

      @media (prefers-color-scheme: dark) {
        .email-bg {
          background-color: #1e1418 !important;
        }

        .email-card,
        .content-bg {
          background-color: #2b1c22 !important;
        }

        .email-card {
          border-color: #633246 !important;
        }

        .body-copy {
          color: #f8edf1 !important;
        }

        .muted-copy {
          color: #d9c5cd !important;
        }

        .safety-bg {
          background-color: #3a252e !important;
          border-color: #704052 !important;
        }

        .safety-label {
          color: #ff91b7 !important;
        }

        .footer-bg {
          background-color: #24171c !important;
          border-color: #58303f !important;
        }

        .footer-copy {
          color: #cfbac3 !important;
        }

        .footer-brand {
          color: #ff8fb5 !important;
        }
      }

      [data-ogsc] .email-bg {
        background-color: #1e1418 !important;
      }

      [data-ogsc] .email-card,
      [data-ogsc] .content-bg {
        background-color: #2b1c22 !important;
      }

      [data-ogsc] .body-copy {
        color: #f8edf1 !important;
      }

      [data-ogsc] .muted-copy,
      [data-ogsc] .footer-copy {
        color: #d9c5cd !important;
      }

      [data-ogsc] .footer-brand {
        color: #ff8fb5 !important;
      }

      @media (prefers-color-scheme: dark) {
        .hero-bg {
          background-color: #fff7f4 !important;
        }

        .hero-brand,
        .hero-title-dark {
          color: #241820 !important;
        }

        .hero-eyebrow,
        .hero-title-accent,
        .hero-badge-copy {
          color: #c91f55 !important;
        }

        .hero-copy {
          color: #55464d !important;
        }

        .hero-badge {
          background-color: #ffffff !important;
          border-color: #e8becd !important;
        }

        .otp-panel {
          background-color: #fff7f4 !important;
        }

        .otp-label {
          color: #8f2850 !important;
        }

        .otp-code {
          color: #351a26 !important;
        }

        .expiry-badge {
          background-color: #ffffff !important;
          border-color: #e7afc1 !important;
        }

        .expiry-copy {
          color: #781b3d !important;
        }
      }

      [data-ogsc] .otp-panel {
        background-color: #fff7f4 !important;
      }

      [data-ogsc] .otp-label {
        color: #8f2850 !important;
      }

      [data-ogsc] .otp-code {
        color: #351a26 !important;
      }

      [data-ogsc] .expiry-badge {
        background-color: #ffffff !important;
        border-color: #e7afc1 !important;
      }

      [data-ogsc] .expiry-copy {
        color: #781b3d !important;
      }
    </style>
    <!--[if mso]>
    <style type="text/css">
      .otp-code {
        font-family: Consolas, "Courier New", monospace !important;
      }
    </style>
    <![endif]-->
  </head>
  <body class="email-bg" bgcolor="#fff1f4" style="margin:0;padding:0;background-color:#fff1f4;color:#241820;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
    <div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;color:transparent;font-size:1px;line-height:1px;mso-hide:all;">
      Secure sign-in for ${escapedProductName}. Your code is valid for ${escapedExpiresInMinutes} ${expiryUnit}.&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;&#8204;&nbsp;
    </div>
    <table class="email-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff1f4" style="width:100%;border-collapse:collapse;background-color:#fff1f4;mso-table-lspace:0;mso-table-rspace:0;">
      <tr>
        <td class="outer-pad" align="center" style="padding:36px 12px;">
          <!--[if mso]>
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0">
            <tr>
              <td>
          <![endif]-->
          <table class="email-card" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="width:100%;max-width:600px;border-collapse:separate;background-color:#ffffff;border:1px solid #efc3d2;border-radius:28px;box-shadow:0 18px 48px rgba(100,24,52,0.14);overflow:hidden;mso-table-lspace:0;mso-table-rspace:0;">
            <tr>
              <td class="hero-pad hero-bg" bgcolor="#fff7f4" style="padding:30px 38px 32px;background-color:#fff7f4;background-image:linear-gradient(135deg,#fffaf8 0%,#fff3f6 60%,#fff1e9 100%);">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td width="48" valign="middle" style="width:48px;">
                      <table role="presentation" width="40" cellpadding="0" cellspacing="0" border="0" bgcolor="#fd267a" style="width:40px;border-collapse:separate;background-color:#fd267a;background-image:linear-gradient(135deg,#fd267a 0%,#ff6036 100%);border-radius:11px;box-shadow:0 6px 14px rgba(253,38,122,0.2);">
                        <tr>
                          <td height="40" align="center" valign="middle" aria-hidden="true" style="height:40px;color:#ffffff;font-family:Arial,Helvetica,sans-serif;font-size:24px;line-height:40px;font-weight:700;mso-line-height-rule:exactly;">&hearts;</td>
                        </tr>
                      </table>
                    </td>
                    <td class="hero-brand" valign="middle" style="color:#241820;font-size:18px;line-height:24px;font-weight:700;letter-spacing:-0.2px;">${escapedProductName}</td>
                    <td class="hide-mobile" align="right" valign="middle">
                      <table class="hero-badge" role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:separate;background-color:#ffffff;border:1px solid #e8becd;border-radius:999px;box-shadow:0 3px 8px rgba(126,24,62,0.07);">
                        <tr>
                          <td class="hero-badge-copy" style="padding:7px 12px;color:#a3184d;font-size:10px;line-height:14px;font-weight:700;letter-spacing:1.3px;text-transform:uppercase;">Secure sign-in</td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td height="24" style="height:24px;font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
                  </tr>
                </table>
                <p class="hero-eyebrow" style="margin:0 0 9px;color:#a3184d;font-size:12px;line-height:18px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">Welcome back</p>
                <h1 class="hero-title" style="margin:0;font-size:38px;line-height:44px;font-weight:700;letter-spacing:-1px;"><span class="hero-title-dark" style="color:#241820;">One code.</span><br><span class="hero-title-accent" style="color:#c91f55;">Then you&#39;re in.</span></h1>
                <p class="hero-copy" style="margin:14px 0 0;max-width:420px;color:#55464d;font-size:16px;line-height:25px;">A quick check to keep your account yours.</p>
              </td>
            </tr>
            <tr>
              <td height="6" bgcolor="#ff8cab" style="height:6px;background-color:#ff8cab;background-image:linear-gradient(90deg,#ff70a5 0%,#ff9a72 58%,#ffc166 100%);font-size:0;line-height:0;mso-line-height-rule:exactly;">&nbsp;</td>
            </tr>
            <tr>
              <td class="content-pad content-bg" bgcolor="#ffffff" style="padding:36px 38px 40px;background-color:#ffffff;">
                <p class="body-copy" style="margin:0 0 22px;color:#3d3036;font-size:16px;line-height:25px;">Use this six-digit code to continue with ${escapedProductName}.</p>
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#ed2f76" style="width:100%;border-collapse:separate;background-color:#ed2f76;background-image:linear-gradient(135deg,#ef2f78 0%,#f1784b 100%);border-radius:21px;">
                  <tr>
                    <td style="padding:2px;">
                      <table class="otp-panel" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff7f4" style="width:100%;border-collapse:separate;background-color:#fff7f4;background-image:linear-gradient(145deg,#fff9fb 0%,#fff1f4 54%,#fff6ec 100%);border-radius:19px;">
                        <tr>
                          <td class="otp-label" align="center" style="padding:24px 16px 8px;color:#8f2850;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1.4px;text-transform:uppercase;">Your verification code</td>
                        </tr>
                        <tr>
                          <td class="otp-code" align="center" aria-label="Verification code: ${escapedOtp}" style="padding:0 12px 19px;color:#351a26;font-family:'Courier New',Courier,monospace;font-size:42px;line-height:52px;font-weight:700;letter-spacing:3px;white-space:nowrap;mso-line-height-rule:exactly;font-variant-numeric:tabular-nums;">${escapedOtp}</td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:0 14px 24px;">
                            <table class="expiry-badge" role="presentation" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-collapse:separate;background-color:#ffffff;border:1px solid #e7afc1;border-radius:999px;box-shadow:0 4px 12px rgba(126,24,62,0.08);">
                              <tr>
                                <td class="expiry-copy" style="padding:8px 14px;color:#781b3d;font-size:11px;line-height:15px;font-weight:700;letter-spacing:0.8px;text-transform:uppercase;">Expires in ${escapedExpiresInMinutes} ${expiryUnit}</td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
                <p class="muted-copy" style="margin:16px 0 28px;color:#66545c;font-size:14px;line-height:22px;text-align:center;">Enter it in the ${escapedProductName} screen you just left.</p>
                <table class="safety-bg" role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#fff5f7" style="width:100%;border-collapse:separate;background-color:#fff5f7;border:1px solid #f3d5df;border-radius:16px;">
                  <tr>
                    <td width="48" valign="top" style="width:48px;padding:18px 0 18px 18px;">
                      <table role="presentation" width="32" cellpadding="0" cellspacing="0" border="0" bgcolor="#f8dce6" style="width:32px;border-collapse:separate;background-color:#f8dce6;border-radius:16px;">
                        <tr>
                          <td height="32" align="center" valign="middle" aria-hidden="true" style="height:32px;color:#a5154d;font-size:16px;line-height:32px;font-weight:700;mso-line-height-rule:exactly;">!</td>
                        </tr>
                      </table>
                    </td>
                    <td style="padding:17px 18px 18px 10px;">
                      <p class="safety-label" style="margin:0 0 4px;color:#9a1748;font-size:11px;line-height:17px;font-weight:700;letter-spacing:1px;text-transform:uppercase;">Keep it private</p>
                      <p class="body-copy" style="margin:0;color:#47373e;font-size:14px;line-height:22px;">Didn&#39;t request this? Ignore this email. Never share the code&mdash;${escapedProductName} will never ask you for it.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td class="footer-pad footer-bg" bgcolor="#fcf8f9" style="padding:24px 38px 27px;background-color:#fcf8f9;border-top:1px solid #eddde3;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;border-collapse:collapse;">
                  <tr>
                    <td class="footer-brand" valign="middle" style="color:#8f1947;font-size:15px;line-height:21px;font-weight:700;">
                      <span aria-hidden="true" style="font-family:Arial,Helvetica,sans-serif;">&hearts;</span>&nbsp; ${escapedProductName}
                    </td>
                    <td class="footer-message footer-copy" align="right" valign="middle" style="color:#78666e;font-size:12px;line-height:19px;">Protected by default. Focused on connection.</td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          <!--[if mso]>
              </td>
            </tr>
          </table>
          <![endif]-->
        </td>
      </tr>
    </table>
  </body>
</html>`;

  return {
    html,
    subject,
    text,
  };
};

export const AuthOtpEmailTemplateCollection = {
  buildOtpVerificationEmail,
};
