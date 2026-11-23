
import { useCallback, useEffect, useState } from "react";
import {
  BriefcaseBusiness,
  RefreshCw,
  Mail,
  Phone,
  CalendarDays,
  ClipboardList,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { servicesAPI } from "../services/api";
import "./ServiceRequestsPanel.css";

const STATUS_LABELS = {
  pending: "Pendente",
  contacted: "Contactado",
  in_progress: "Em execução",
  completed: "Concluído",
  cancelled: "Cancelado"
};

function formatDate(date) {
  if (!date) return "Não disponível";

  return new Date(date).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function ServiceRequestsPanel() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [filter, setFilter] = useState("all");

  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await servicesAPI.getRequests();
      setRequests(response.requests || []);
    } catch (err) {
      setError(err.message || "Não foi possível carregar os pedidos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  async function handleStatusChange(requestId, status) {
    setUpdatingId(requestId);
    setError("");
    setMessage("");

    try {
      const response = await servicesAPI.updateRequestStatus(
        requestId,
        status
      );

      setRequests((current) =>
        current.map((item) =>
          item._id === requestId
            ? { ...item, status: response.request?.status || status }
            : item
        )
      );

      setMessage("Estado do pedido atualizado.");
    } catch (err) {
      setError(err.message || "Não foi possível atualizar o pedido.");
    } finally {
      setUpdatingId("");
    }
  }

  const filteredRequests = requests.filter((request) =>
    filter === "all" ? true : request.status === filter
  );

  const pendingCount = requests.filter(
    (request) => request.status === "pending"
  ).length;

  const inProgressCount = requests.filter(
    (request) => request.status === "in_progress"
  ).length;

  const completedCount = requests.filter(
    (request) => request.status === "completed"
  ).length;

  return (
    <section className="service-requests-panel">
      <div className="service-requests-heading">
        <div>
          <span className="service-requests-eyebrow">
            RELACIONAMENTO COM CLIENTES
          </span>
          <h2>Pedidos de serviços</h2>
          <p>
            Consulta os pedidos recebidos, contacta os clientes e acompanha
            a evolução de cada projeto.
          </p>
        </div>

        <button
          type="button"
          className="service-requests-refresh"
          onClick={loadRequests}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "service-requests-spin" : ""} />
          Atualizar
        </button>
      </div>

      {error && (
        <div className="service-requests-alert error">
          <AlertCircle size={17} />
          {error}
        </div>
      )}

      {message && (
        <div className="service-requests-alert success">
          <CheckCircle2 size={17} />
          {message}
        </div>
      )}

      <div className="service-requests-stats">
        <article>
          <ClipboardList size={21} />
          <span>Total de pedidos</span>
          <strong>{requests.length}</strong>
        </article>

        <article>
          <AlertCircle size={21} />
          <span>Pendentes</span>
          <strong>{pendingCount}</strong>
        </article>

        <article>
          <BriefcaseBusiness size={21} />
          <span>Em execução</span>
          <strong>{inProgressCount}</strong>
        </article>

        <article>
          <CheckCircle2 size={21} />
          <span>Concluídos</span>
          <strong>{completedCount}</strong>
        </article>
      </div>

      <div className="service-requests-filter">
        <label htmlFor="service-request-filter">Filtrar pedidos</label>
        <select
          id="service-request-filter"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
        >
          <option value="all">Todos os pedidos</option>
          <option value="pending">Pendentes</option>
          <option value="contacted">Contactados</option>
          <option value="in_progress">Em execução</option>
          <option value="completed">Concluídos</option>
          <option value="cancelled">Cancelados</option>
        </select>
        <span>{filteredRequests.length} pedido(s)</span>
      </div>

      {loading ? (
        <div className="service-requests-empty">
          A carregar pedidos...
        </div>
      ) : filteredRequests.length === 0 ? (
        <div className="service-requests-empty">
          <BriefcaseBusiness size={32} />
          <strong>Nenhum pedido encontrado</strong>
          <span>
            Quando um cliente solicitar um serviço, o pedido aparecerá aqui.
          </span>
        </div>
      ) : (
        <div className="service-request-list">
          {filteredRequests.map((request) => (
            <article className="service-request-card" key={request._id}>
              <div className="service-request-card-top">
                <div>
                  <span className="service-request-service">
                    {request.service}
                  </span>
                  <h3>{request.name}</h3>
                </div>

                <span className={`service-request-status ${request.status}`}>
                  {STATUS_LABELS[request.status] || request.status}
                </span>
              </div>

              <div className="service-request-contact">
                <a href={`mailto:${request.email}`}>
                  <Mail size={15} />
                  {request.email}
                </a>

                <a href={`tel:${request.phone}`}>
                  <Phone size={15} />
                  {request.phone}
                </a>

                <span>
                  <CalendarDays size={15} />
                  {formatDate(request.createdAt)}
                </span>
              </div>

              <div className="service-request-description">
                <strong>Descrição do projeto</strong>
                <p>{request.description}</p>
              </div>

              <div className="service-request-actions">
                <label htmlFor={`status-${request._id}`}>
                  Estado do pedido
                </label>

                <select
                  id={`status-${request._id}`}
                  value={request.status}
                  disabled={updatingId === request._id}
                  onChange={(event) =>
                    handleStatusChange(request._id, event.target.value)
                  }
                >
                  {Object.entries(STATUS_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>

                {updatingId === request._id && (
                  <small>A atualizar...</small>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}

export default ServiceRequestsPanel;
