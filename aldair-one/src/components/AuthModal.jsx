
import { useState } from "react";
import {
  X,
  ArrowRight,
  LockKeyhole,
  UserRound
} from "lucide-react";

import { authAPI } from "../services/api";
import "./AuthModal.css";

function AuthModal({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (isRegister && password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isRegister) {
        response = await authAPI.register({
          name,
          email,
          password
        });
      } else {
        response = await authAPI.login({
          email,
          password
        });
      }

      if (response.success && response.user) {
        onAuthenticated?.(response.user);
        onClose?.();
      } else {
        setError(
          response.message || "Não foi possível concluir a operação."
        );
      }
    } catch (err) {
      setError(err.message || "Ocorreu um erro inesperado.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="auth-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !loading) {
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
          disabled={loading}
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
            {isRegister ? (
              <UserRound size={23} />
            ) : (
              <LockKeyhole size={23} />
            )}
          </div>

          <h2 id="auth-title">
            {isRegister
              ? "Criar a tua conta"
              : "Bem-vindo de volta"}
          </h2>

          <p>
            {isRegister
              ? "Junta-te ao ecossistema ALDAIR ONE."
              : "Inicia sessão para aceder à tua área pessoal."}
          </p>
        </div>

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

        <form className="auth-form" onSubmit={handleSubmit}>
          {isRegister && (
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

          {error && (
            <div className="auth-error" role="alert">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="auth-submit"
            disabled={loading}
          >
            {loading
              ? "A processar..."
              : isRegister
                ? "Criar conta"
                : "Entrar"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        <p className="auth-terms">
          ALDAIR ONE — One Platform. Multiple Solutions.
        </p>
      </section>
    </div>
  );
}

export default AuthModal;
