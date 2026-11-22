
import { useState } from "react";
import {
  X,
  ArrowRight,
  LockKeyhole,
  UserRound,
  ShieldCheck
} from "lucide-react";
import { authAPI } from "../services/api";
import "./AuthModal.css";

function AuthModal({ onClose, onAuthenticated }) {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const isRegister = mode === "register";
  const isSuperAdmin = mode === "superadmin";

  function changeMode(nextMode) {
    setMode(nextMode);
    setError("");
    setPassword("");
    setConfirmPassword("");
    setSetupKey("");
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if ((isRegister || isSuperAdmin) && password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    if (isSuperAdmin && password.length < 12) {
      setError("A palavra-passe deve ter pelo menos 12 caracteres.");
      return;
    }

    setLoading(true);

    try {
      let response;

      if (isSuperAdmin) {
        response = await authAPI.registerSuperAdmin({
          name,
          password,
          setupKey
        });
      } else if (isRegister) {
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
            {isSuperAdmin ? (
              <ShieldCheck size={23} />
            ) : isRegister ? (
              <UserRound size={23} />
            ) : (
              <LockKeyhole size={23} />
            )}
          </div>

          <h2 id="auth-title">
            {isSuperAdmin
              ? "Configurar conta principal"
              : isRegister
                ? "Criar a tua conta"
                : "Bem-vindo de volta"}
          </h2>

          <p>
            {isSuperAdmin
              ? "Configuração inicial protegida do Super Administrador."
              : isRegister
                ? "Junta-te ao ecossistema ALDAIR ONE."
                : "Inicia sessão para aceder à tua área pessoal."}
          </p>
        </div>

        <div className="auth-tabs">
          <button
            type="button"
            className={!isRegister && !isSuperAdmin ? "active" : ""}
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

          <button
            type="button"
            className={isSuperAdmin ? "active" : ""}
            onClick={() => changeMode("superadmin")}
          >
            Conta principal
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          {(isRegister || isSuperAdmin) && (
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

          {isSuperAdmin ? (
            <label>
              Email reservado
              <input
                type="email"
                value="aldair347joao@gmail.com"
                readOnly
                disabled
              />
            </label>
          ) : (
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

          <label>
            Palavra-passe
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder={
                isSuperAdmin
                  ? "Mínimo de 12 caracteres"
                  : "Mínimo de 8 caracteres"
              }
              minLength={isSuperAdmin ? 12 : 8}
              maxLength={128}
              autoComplete={
                isRegister || isSuperAdmin
                  ? "new-password"
                  : "current-password"
              }
              required
            />
          </label>

          {(isRegister || isSuperAdmin) && (
            <label>
              Confirmar palavra-passe
              <input
                type="password"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Repete a palavra-passe"
                minLength={isSuperAdmin ? 12 : 8}
                maxLength={128}
                autoComplete="new-password"
                required
              />
            </label>
          )}

          {isSuperAdmin && (
            <>
              <label>
                Chave de configuração
                <input
                  type="password"
                  value={setupKey}
                  onChange={(event) => setSetupKey(event.target.value)}
                  placeholder="Introduz a chave configurada no Render"
                  autoComplete="off"
                  required
                />
              </label>

              <p className="auth-terms">
                Esta configuração é exclusiva da conta principal. A chave
                corresponde à variável SUPER_ADMIN_SETUP_KEY do servidor.
                Depois da criação, será necessário confirmar o email.
              </p>
            </>
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
              : isSuperAdmin
                ? "Criar conta principal"
                : isRegister
                  ? "Criar conta"
                  : "Entrar"}

            {!loading && <ArrowRight size={18} />}
          </button>
        </form>

        {!isSuperAdmin && (
          <p className="auth-terms">
            ALDAIR ONE — One Platform. Multiple Solutions.
          </p>
        )}
      </section>
    </div>
  );
}

export default AuthModal;
