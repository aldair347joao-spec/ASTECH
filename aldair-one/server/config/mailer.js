
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
