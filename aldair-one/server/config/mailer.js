
import nodemailer from "nodemailer";

let transporter;

function getTransporter() {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS
  } = process.env;

  if (!SMTP_HOST || !SMTP_PORT || !SMTP_USER || !SMTP_PASS) {
    throw new Error(
      "Configuração SMTP incompleta no ambiente do servidor."
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT),
      secure: Number(SMTP_PORT) === 465,
      auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
      }
    });
  }

  return transporter;
}

// Email de verificação do Super Administrador
export async function sendAdminVerificationEmail(email, code) {
  const mailer = getTransporter();
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  return mailer.sendMail({
    from: `"ALDAIR ONE Security" <${from}>`,
    to: email,
    subject: "Código de segurança — ALDAIR ONE",
    text: [
      "Foi solicitado o reconhecimento desta conta como Super Administrador do ALDAIR ONE.",
      "",
      `O teu código de confirmação é: ${code}`,
      "",
      "Este código expira em 10 minutos.",
      "Se não fizeste este pedido, ignora esta mensagem.",
      "",
      "ALDAIR ONE Security"
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;color:#172033">
        <h2 style="color:#087cf0">ALDAIR ONE</h2>
        <h3>Verificação de segurança</h3>
        <p>Foi solicitado o reconhecimento desta conta como Super Administrador.</p>
        <p>Introduz o seguinte código para confirmar a tua identidade:</p>
        <div style="font-size:30px;font-weight:bold;letter-spacing:8px;padding:20px;background:#eef4ff;text-align:center;border-radius:10px">
          ${code}
        </div>
        <p>O código expira em 10 minutos.</p>
        <p>Se não fizeste este pedido, ignora esta mensagem.</p>
        <hr />
        <small>ALDAIR ONE Security — One Platform. Multiple Solutions.</small>
      </div>
    `
  });
}

// Email de verificação de registo e início de sessão
export async function sendRegistrationOtpEmail(email, code) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error("Configuração do Resend incompleta.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `ALDAIR ONE <${fromEmail}>`,
      to: [email],
      subject: "Código de verificação — ALDAIR ONE",
      text: [
        "Foi solicitado um código de verificação para a tua conta ALDAIR ONE.",
        "",
        `O teu código de segurança é: ${code}`,
        "",
        "Este código é válido durante 10 minutos.",
        "Não partilhes este código com ninguém.",
        "Se não fizeste este pedido, ignora esta mensagem.",
        "",
        "ALDAIR ONE Security"
      ].join("\n"),
      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033;background:#ffffff">

          <div style="padding:24px;border-radius:14px;background:#0b1426;color:#ffffff">
            <h2 style="margin:0;color:#35baff">ALDAIR ONE</h2>
            <p style="margin-bottom:0;color:#b9c9df">
              One Platform. Multiple Solutions.
            </p>
          </div>

          <h2 style="margin-top:30px">Verificação de segurança</h2>

          <p>
            Para continuar, introduz o código de segurança abaixo:
          </p>

          <div style="margin:28px 0;padding:22px;background:#eef4ff;border-radius:12px;text-align:center">
            <div style="font-size:34px;font-weight:bold;letter-spacing:9px;color:#087cf0">
              ${code}
            </div>
          </div>

          <p>
            Este código é válido durante <strong>10 minutos</strong>.
          </p>

          <p style="font-size:13px;color:#526174">
            Nunca partilhes este código. A equipa ALDAIR ONE nunca te pedirá
            que o reveles por telefone ou mensagem.
          </p>

          <p style="font-size:13px;color:#526174">
            Se não fizeste este pedido, ignora esta mensagem.
          </p>

          <hr style="border:0;border-top:1px solid #e5eaf0;margin:28px 0" />

          <small style="color:#718096">
            ALDAIR ONE Security
          </small>
        </div>
      `
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Erro Resend OTP:", data);

    throw new Error(
      data.message || "Não foi possível enviar o código de verificação."
    );
  }

  return data;
}

// Email de recuperação da palavra-passe através do Resend
export async function sendPasswordResetEmail(email, resetUrl) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESEND_FROM_EMAIL;

  if (!apiKey || !fromEmail) {
    throw new Error(
      "Configuração do Resend incompleta."
    );
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: `ALDAIR ONE <${fromEmail}>`,
      to: [email],
      subject: "Recuperação da palavra-passe — ALDAIR ONE",

      text: [
        "Recebemos um pedido para alterar a palavra-passe da tua conta ALDAIR ONE.",
        "",
        `Abre este link para definir uma nova palavra-passe: ${resetUrl}`,
        "",
        "Este link é válido durante 30 minutos e só pode ser utilizado uma vez.",
        "Se não fizeste este pedido, ignora esta mensagem.",
        "",
        "ALDAIR ONE Security"
      ].join("\n"),

      html: `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:32px;color:#172033;background:#ffffff">

          <div style="padding:24px;border-radius:14px;background:#0b1426;color:#ffffff">
            <h2 style="margin:0;color:#35baff">ALDAIR ONE</h2>
            <p style="margin-bottom:0;color:#b9c9df">
              One Platform. Multiple Solutions.
            </p>
          </div>

          <h2 style="margin-top:30px">Recuperar palavra-passe</h2>

          <p>
            Recebemos um pedido para alterar a palavra-passe da tua conta.
          </p>

          <p>
            Para criares uma nova palavra-passe, utiliza o botão abaixo:
          </p>

          <div style="margin:30px 0">
            <a
              href="${resetUrl}"
              style="display:inline-block;padding:15px 25px;background:#168cff;color:#ffffff;text-decoration:none;border-radius:9px;font-weight:bold"
            >
              Criar nova palavra-passe
            </a>
          </div>

          <p style="font-size:13px;color:#526174">
            Este link expira em 30 minutos e só pode ser utilizado uma vez.
          </p>

          <p style="font-size:13px;color:#526174">
            Se não fizeste este pedido, ignora esta mensagem.
            A tua palavra-passe atual continuará válida.
          </p>

          <hr style="border:0;border-top:1px solid #e5eaf0;margin:28px 0" />

          <small style="color:#718096">
            ALDAIR ONE Security
          </small>
        </div>
      `
    })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    console.error("Erro Resend:", data);

    throw new Error(
      data.message || "Não foi possível enviar o email de recuperação."
    );
  }

  return data;
}
