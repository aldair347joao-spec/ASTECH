
import { useState } from "react";
import { X, Send, CheckCircle2, AlertCircle } from "lucide-react";
import { servicesAPI } from "../services/api";
import "./ServiceRequestModal.css";

function ServiceRequestModal({ service, onClose }) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    service: service || "Desenvolvimento de Sistemas",
    description: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  function handleChange(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      await servicesAPI.createRequest(form);
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Não foi possível enviar o pedido.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="service-modal-overlay" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section className="service-modal" role="dialog" aria-modal="true" aria-labelledby="service-modal-title">
        <button type="button" className="service-modal-close" onClick={onClose} aria-label="Fechar">
          <X size={21} />
        </button>

        {success ? (
          <div className="service-modal-success">
            <CheckCircle2 size={48} />
            <h2 id="service-modal-title">Pedido enviado!</h2>
            <p>
              Recebemos o teu pedido de <strong>{form.service}</strong>.
              Entraremos em contacto através dos dados que forneceste.
            </p>
            <button type="button" className="service-modal-submit" onClick={onClose}>
              Concluir
            </button>
          </div>
        ) : (
          <>
            <span className="service-modal-eyebrow">ALDAIR ONE · PEDIDO DE SERVIÇO</span>
            <h2 id="service-modal-title">Vamos trabalhar no teu projeto.</h2>
            <p className="service-modal-description">
              Preenche os teus dados e explica-nos o que precisas. A nossa equipa analisará o pedido.
            </p>

            {error && (
              <div className="service-modal-error" role="alert">
                <AlertCircle size={17} />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="service-modal-form">
              <label>
                Nome completo
                <input name="name" value={form.name} onChange={handleChange} minLength={2} maxLength={100} required placeholder="O teu nome" />
              </label>

              <label>
                Email
                <input name="email" type="email" value={form.email} onChange={handleChange} maxLength={150} required placeholder="nome@email.com" />
              </label>

              <label>
                Telefone / WhatsApp
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} minLength={6} maxLength={30} required placeholder="+244 ..." />
              </label>

              <label>
                Serviço pretendido
                <select name="service" value={form.service} onChange={handleChange} required>
                  <option>Desenvolvimento de Sistemas</option>
                  <option>Automação Inteligente</option>
                  <option>Gestão Empresarial</option>
                  <option>Inteligência Artificial</option>
                </select>
              </label>

              <label className="service-modal-full">
                Descreve o que precisas
                <textarea name="description" value={form.description} onChange={handleChange} minLength={10} maxLength={3000} rows={5} required placeholder="Explica brevemente o teu projeto, necessidade ou problema..." />
              </label>

              <button type="submit" className="service-modal-submit" disabled={loading}>
                <Send size={17} />
                {loading ? "A enviar pedido..." : "Enviar pedido"}
              </button>

              <small className="service-modal-privacy">
                Os teus dados serão utilizados para responder a este pedido.
              </small>
            </form>
          </>
        )}
      </section>
    </div>
  );
}

export default ServiceRequestModal;
