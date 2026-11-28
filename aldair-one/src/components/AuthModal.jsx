
import { useState } from "react";
import {
  X,
  ArrowRight,
  LockKeyhole,
  UserRound,
  Mail,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  RefreshCw
} from "lucide-react";

import { authAPI } from "../services/api";
import "./AuthModal.css";

function AuthModal({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState("login");

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [otp, setOtp] = useState("");

  const [otpStage, setOtpStage] = useState(false);
  const [otpPurpose, setOtpPurpose] = useState("login");

  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const isRegister = mode === "register";
  const isForgotPassword = mode === "forgot";

  function changeMode(nextMode) {
    setMode(nextMode);
    setOtpStage(false);
    setOtp("");
    setOtpPurpose("login");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  function finishAuthentication(response) {
    if (response?.success && response?.user && response?.token) {
      onAuthenticated?.(response.user);
      onClose?.();
      return true;
    }

    setError(
      response?.message || "Não foi possível concluir a autenticação."
    );

    return false;
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");
    setSuccess("");

    if (otpStage && !/^\d{6}$/.test(otp)) {
      setError("Introduz o código de seis dígitos.");
      return;
    }

    if (isRegister && !otpStage && password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      // CONFIRMAR OTP
      if (otpStage) {
        const response =
          otpPurpose === "register"
            ? await authAPI.verifyRegistration(email, otp)
            : await authAPI.verifyLogin(email, otp);

        finishAuthentication(response);
        return;
      }

      // RECUPERAÇÃO DA PALAVRA-PASSE
      if (isForgotPassword) {
        const response = await authAPI.forgotPassword(email);

        setSuccess(
          response.message ||
          "Se existir uma conta associada a este email, receberás instruções para recuperar a palavra-passe."
        );

        return;
      }

      // PEDIR OTP DE REGISTO OU LOGIN
      const response = isRegister
        ? await authAPI.register({
            name,
            email,
            password
          })
        : await authAPI.login({
            email,
            password
          });

      if (response.success && response.requiresOtp) {
        setOtpPurpose(isRegister ? "register" : "login");
        setOtpStage(true);
        setOtp("");
        setSuccess(
          response.message ||
          "Enviámos um código de segurança para o teu email."
        );
      } else {
        setError(
          response.message || "Não foi possível iniciar a autenticação."
        );
      }

    } catch (err) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  async function handleResendCode() {
    setError("");
    setSuccess("");
    setResending(true);

    try {
      const response =
        otpPurpose === "register"
          ? await authAPI.resendRegistrationCode(email)
          : await authAPI.resendLoginCode(email);

      setOtp("");

      setSuccess(
        response.message || "Enviámos um novo código para o teu email."
      );
    } catch (err) {
      setError(err.message || "Não foi possível reenviar o código.");
    } finally {
      setResending(false);
    }
  }

  function backFromOtp() {
    setOtpStage(false);
    setOtp("");
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !loading &&
          !resending
        ) {
          onClose?.();
        }
      }}
    >
      <section
        className="auth-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="auth-title"
      >
        <button
          type="button"
          className="auth-close"
          onClick={onClose}
          disabled={loading || resending}
          aria-label="Fechar"
        >
          <X size={21} />
        </button>

        <div className="auth-brand">
          <span className="auth-brand-mark">A</span>
          <span>ALDAIR ONE</span>
        </div>

        <div className="auth-heading">
          <div className="auth-icon">
            {otpStage ? (
              <ShieldCheck size={23} />
            ) : isForgotPassword ? (
              <Mail size={23} />
            ) : isRegister ? (
              <UserRound size={23} />
            ) : (
              <LockKeyhole size={23} />
            )}
          </div>

          <h2 id="auth-title">
            {otpStage
              ? "Confirmar o teu email"
              : isForgotPassword
                ? "Recuperar palavra-passe"
                : isRegister
                  ? "Criar a tua conta"
                  : "Bem-vindo de volta"}
          </h2>

          <p>
            {otpStage
              ? "Enviámos um código de segurança para o teu endereço de email. Introduz os seis dígitos para continuar."
              : isForgotPassword
                ? "Introduz o email associado à tua conta. Enviaremos instruções para recuperares o acesso."
                : isRegister
                  ? "Junta-te ao ecossistema ALDAIR ONE."
                  : "Inicia sessão para aceder à tua área pessoal."}
          </p>
        </div>

        {!isForgotPassword && !otpStage && (
          <div className="auth-tabs">
            <button
              type="button"
              className={!isRegister ? "active" : ""}
              onClick={() => changeMode("login")}
            >
              Entrar
            </button>

            <button
              type="button"
              className={isRegister ? "active" : ""}
              onClick={() => changeMode("register")}
            >
              Criar conta
            </button>
          </div>
        )}

        {otpStage && (
          <div className="auth-otp-email">
            <Mail size={16} />
            <span>{email}</span>
          </div>
        )}

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && !otpStage && (
            <label>
              Nome completo
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="O teu nome completo"
                minLength={2}
                maxLength={100}
                autoComplete="name"
                required
              />
            </label>
          )}

          {!otpStage && (
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="nome@email.com"
                autoComplete="email"
                required
              />
            </label>
          )}

          {otpStage ? (
            <label className="auth-otp-label">
              Código de verificação
              <input
                className="auth-otp-input"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={otp}
                onChange={(event) =>
                  setOtp(
                    event.target.value.replace(/\D/g, "").slice(0, 6)
                  )
                }
                placeholder="000000"
                maxLength={6}
                pattern="[0-9]{6}"
                aria-label="Código de verificação de seis dígitos"
                required
                autoFocus
              />
              <span className="auth-otp-hint">
                O código é válido durante 10 minutos.
              </span>
            </label>
          ) : (
            !isForgotPassword && (
              <>
                <label>
                  Palavra-passe
                  <input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Mínimo de 8 caracteres"
                    minLength={8}
                    maxLength={128}
                    autoComplete={
                      isRegister ? "new-password" : "current-password"
                    }
                    required
                  />
                </label>

                {isRegister && (
                  <label>
                    Confirmar palavra-passe
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(event) =>
                        setConfirmPassword(event.target.value)
                      }
                      placeholder="Repete a palavra-passe"
                      minLength={8}
                      maxLength={128}
                      autoComplete="new-password"
                      required
                    />
                  </label>
                )}
              </>
            )
          )}

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          {success && (
            <div className="auth-success" role="status">
              <CheckCircle2 size={19} />
              <span>{success}</span>
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading || resending}
          >
            {loading
              ? "A processar..."
              : otpStage
                ? "Confirmar código"
                : isForgotPassword
                  ? "Enviar instruções"
                  : isRegister
                    ? "Enviar código de verificação"
                    : "Continuar"}

            {!loading && <ArrowRight size={18} />}
          </button>

          {otpStage && (
            <button
              type="button"
              className="auth-resend-link"
              onClick={handleResendCode}
              disabled={loading || resending}
            >
              <RefreshCw size={16} />
              {resending ? "A reenviar..." : "Reenviar código"}
            </button>
          )}
        </form>

        {otpStage ? (
          <button
            type="button"
            className="auth-back-link"
            onClick={backFromOtp}
            disabled={loading || resending}
          >
            <ArrowLeft size={16} />
            Voltar
          </button>
        ) : isForgotPassword ? (
          <button
            type="button"
            className="auth-back-link"
            onClick={() => changeMode("login")}
          >
            <ArrowLeft size={16} />
            Voltar ao início de sessão
          </button>
        ) : (
          !isRegister && (
            <button
              type="button"
              className="auth-forgot-link"
              onClick={() => changeMode("forgot")}
            >
              Esqueci-me da palavra-passe
            </button>
          )
        )}

        <p className="auth-terms">
          ALDAIR ONE — One Platform. Multiple Solutions.
        </p>
      </section>
    </div>
  );
}

export default AuthModal;
