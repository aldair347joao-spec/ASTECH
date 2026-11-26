
import { useState } from "react";
import {
  LockKeyhole,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ArrowLeft
} from "lucide-react";

import { authAPI } from "../services/api";
import "./ResetPassword.css";

function ResetPassword() {
  const token = new URLSearchParams(window.location.search).get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();

    setError("");

    if (!token) {
      setError("O link de recuperação não contém um token válido.");
      return;
    }

    if (password.length < 8) {
      setError("A palavra-passe deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As palavras-passe não coincidem.");
      return;
    }

    setLoading(true);

    try {
      await authAPI.resetPassword(token, password);

      setSuccess(true);
      setPassword("");
      setConfirmPassword("");

    } catch (err) {
      setError(
        err.message || "Não foi possível alterar a palavra-passe."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="reset-page">
      <section className="reset-card">
        <div className="reset-brand">
          <span className="reset-brand-mark">A</span>
          <span>ALDAIR ONE</span>
        </div>

        {success ? (
          <>
            <div className="reset-icon reset-icon-success">
              <CheckCircle2 size={28} />
            </div>

            <h1>Palavra-passe alterada!</h1>

            <p>
              A tua palavra-passe foi atualizada com sucesso.
              Já podes entrar novamente na tua conta.
            </p>

            <a href="/" className="reset-button">
              Ir para o início de sessão
              <ArrowRight size={18} />
            </a>
          </>
        ) : (
          <>
            <div className="reset-icon">
              <LockKeyhole size={27} />
            </div>

            <h1>Define uma nova palavra-passe</h1>

            <p>
              Cria uma palavra-passe segura para recuperares
              o acesso à tua conta ALDAIR ONE.
            </p>

            {!token && (
              <div className="reset-error">
                <AlertCircle size={18} />
                Link de recuperação inválido ou incompleto.
              </div>
            )}

            <form className="reset-form" onSubmit={handleSubmit}>
              <label>
                Nova palavra-passe

                <input
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Mínimo de 8 caracteres"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={!token || loading}
                />
              </label>

              <label>
                Confirmar nova palavra-passe

                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(event.target.value)
                  }
                  placeholder="Repete a nova palavra-passe"
                  minLength={8}
                  maxLength={128}
                  autoComplete="new-password"
                  required
                  disabled={!token || loading}
                />
              </label>

              {error && (
                <div className="reset-error" role="alert">
                  <AlertCircle size={18} />
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="reset-button"
                disabled={!token || loading}
              >
                {loading ? "A atualizar..." : "Alterar palavra-passe"}
                {!loading && <ArrowRight size={18} />}
              </button>
            </form>
          </>
        )}

        <a href="/" className="reset-back">
          <ArrowLeft size={15} />
          Voltar à página inicial
        </a>

        <footer>
          ALDAIR ONE — One Platform. Multiple Solutions.
        </footer>
      </section>
    </main>
  );
}

export default ResetPassword;
