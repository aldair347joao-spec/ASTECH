
import { useCallback, useEffect, useState } from "react";
import {
  Users,
  UserCheck,
  UserX,
  ShieldCheck,
  Search,
  RefreshCw,
  Crown,
  Activity,
  ChevronLeft,
  ChevronRight,
  UserCog,
  AlertCircle,
  CheckCircle2
} from "lucide-react";

import { adminAPI } from "../services/api";
import "./AdminPanel.css";

const ROLE_LABELS = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  instructor: "Formador",
  student: "Aluno",
  client: "Cliente",
  user: "Utilizador"
};

const EDITABLE_ROLES = [
  "admin",
  "instructor",
  "student",
  "client",
  "user"
];

function formatDate(date) {
  if (!date) return "Não disponível";

  return new Date(date).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  });
}

function AdminPanel() {
  const [overview, setOverview] = useState(null);
  const [users, setUsers] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0
  });

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [roleDrafts, setRoleDrafts] = useState({});
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const loadOverview = useCallback(async () => {
    const response = await adminAPI.getOverview();
    setOverview(response.overview);
  }, []);

  const loadUsers = useCallback(async () => {
    const response = await adminAPI.getUsers({
      page: pagination.page,
      limit: pagination.limit,
      search,
      role: roleFilter,
      status: statusFilter
    });

    setUsers(response.users || []);
    setPagination(response.pagination);

    const drafts = {};

    (response.users || []).forEach((user) => {
      drafts[user._id] = user.role;
    });

    setRoleDrafts(drafts);
  }, [
    pagination.page,
    pagination.limit,
    search,
    roleFilter,
    statusFilter
  ]);

  const loadDashboard = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      await Promise.all([
        loadOverview(),
        loadUsers()
      ]);
    } catch (err) {
      setError(err.message || "Não foi possível carregar o painel.");
    } finally {
      setLoading(false);
    }
  }, [loadOverview, loadUsers]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  function handleSearch(event) {
    event.preventDefault();
    setPagination((current) => ({
      ...current,
      page: 1
    }));
    setSearch(searchInput.trim());
  }

  function handleFilterChange(type, value) {
    setPagination((current) => ({
      ...current,
      page: 1
    }));

    if (type === "role") {
      setRoleFilter(value);
    } else {
      setStatusFilter(value);
    }
  }

  async function handleStatusChange(user) {
    const action = user.isActive ? "suspender" : "ativar";

    const confirmed = window.confirm(
      `Tens a certeza de que pretendes ${action} a conta de ${user.name}?`
    );

    if (!confirmed) return;

    setUpdatingId(user._id);
    setError("");
    setMessage("");

    try {
      const response = await adminAPI.updateUserStatus(
        user._id,
        !user.isActive
      );

      setMessage(response.message || "Estado atualizado.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Não foi possível atualizar a conta.");
    } finally {
      setUpdatingId("");
    }
  }

  async function handleRoleChange(user) {
    const selectedRole = roleDrafts[user._id];

    if (!selectedRole || selectedRole === user.role) return;

    const confirmed = window.confirm(
      `Alterar a função de ${user.name} para ${ROLE_LABELS[selectedRole]}?`
    );

    if (!confirmed) return;

    setUpdatingId(user._id);
    setError("");
    setMessage("");

    try {
      const response = await adminAPI.updateUserRole(
        user._id,
        selectedRole
      );

      setMessage(response.message || "Permissões atualizadas.");
      await loadDashboard();
    } catch (err) {
      setError(err.message || "Não foi possível alterar as permissões.");
    } finally {
      setUpdatingId("");
    }
  }

  function changePage(nextPage) {
    setPagination((current) => ({
      ...current,
      page: nextPage
    }));
  }

  const stats = [
    {
      label: "Total de contas",
      value: overview?.totalUsers ?? 0,
      icon: Users
    },
    {
      label: "Contas ativas",
      value: overview?.activeUsers ?? 0,
      icon: UserCheck
    },
    {
      label: "Contas suspensas",
      value: overview?.inactiveUsers ?? 0,
      icon: UserX
    }
  ];

  return (
    <div className="admin-panel">
      <div className="admin-header">
        <div>
          <span className="admin-eyebrow">
            ÁREA RESTRITA · ALDAIR ONE
          </span>

          <h1>Painel administrativo</h1>

          <p>
            Gere contas, acompanha a atividade e controla
            as permissões da plataforma.
          </p>
        </div>

        <div className="admin-security-label">
          <Crown size={19} />
          <span>Super Administrador</span>
        </div>
      </div>

      {error && (
        <div className="admin-alert error">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {message && (
        <div className="admin-alert success">
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      <div className="admin-section-heading">
        <div>
          <h2>Visão geral</h2>
          <p>Indicadores das contas registadas.</p>
        </div>

        <button
          className="admin-refresh-button"
          onClick={loadDashboard}
          disabled={loading}
        >
          <RefreshCw
            size={17}
            className={loading ? "admin-spinning" : ""}
          />
          Atualizar
        </button>
      </div>

      <div className="admin-stat-grid">
        {stats.map((stat) => {
          const Icon = stat.icon;

          return (
            <article className="admin-stat-card" key={stat.label}>
              <div className="admin-stat-icon">
                <Icon size={23} />
              </div>

              <span>{stat.label}</span>

              <strong>
                {loading ? "..." : stat.value}
              </strong>
            </article>
          );
        })}
      </div>

      <div className="admin-middle-grid">
        <section className="admin-card">
          <div className="admin-card-heading">
            <Activity size={20} />
            <h3>Distribuição por função</h3>
          </div>

          {loading ? (
            <p className="admin-empty">A carregar...</p>
          ) : overview?.roleStats?.length ? (
            <div className="admin-role-list">
              {overview.roleStats.map((item) => (
                <div className="admin-role-item" key={item._id}>
                  <div>
                    <span>
                      {ROLE_LABELS[item._id] || item._id}
                    </span>
                    <strong>{item.total}</strong>
                  </div>

                  <div className="admin-role-track">
                    <span
                      style={{
                        width: `${
                          overview.totalUsers
                            ? (item.total / overview.totalUsers) * 100
                            : 0
                        }%`
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="admin-empty">
              Ainda não existem dados disponíveis.
            </p>
          )}
        </section>

        <section className="admin-card">
          <div className="admin-card-heading">
            <ShieldCheck size={20} />
            <h3>Segurança administrativa</h3>
          </div>

          <div className="admin-security-info">
            <div className="admin-security-icon">
              <Crown size={24} />
            </div>

            <div>
              <strong>Conta principal protegida</strong>
              <p>
                Os privilégios de Super Administrador
                não podem ser atribuídos ou removidos
                através da gestão normal de utilizadores.
              </p>
            </div>
          </div>
        </section>
      </div>

      <section className="admin-card admin-users-section">
        <div className="admin-section-heading">
          <div>
            <h2>Gestão de utilizadores</h2>
            <p>
              Pesquisa contas e administra as respetivas permissões.
            </p>
          </div>

          <div className="admin-users-total">
            {pagination.total} contas
          </div>
        </div>

        <form className="admin-filters" onSubmit={handleSearch}>
          <div className="admin-search">
            <Search size={18} />

            <input
              type="search"
              placeholder="Pesquisar nome ou email..."
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
            />
          </div>

          <button type="submit" className="admin-search-button">
            Pesquisar
          </button>

          <select
            value={roleFilter}
            onChange={(event) =>
              handleFilterChange("role", event.target.value)
            }
            aria-label="Filtrar por função"
          >
            <option value="">Todas as funções</option>
            {Object.entries(ROLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(event) =>
              handleFilterChange("status", event.target.value)
            }
            aria-label="Filtrar por estado"
          >
            <option value="">Todos os estados</option>
            <option value="active">Ativas</option>
            <option value="inactive">Suspensas</option>
          </select>
        </form>

        {loading ? (
          <div className="admin-empty large">
            A carregar utilizadores...
          </div>
        ) : users.length === 0 ? (
          <div className="admin-empty large">
            <Users size={28} />
            <strong>Nenhuma conta encontrada</strong>
            <span>Experimenta alterar os filtros de pesquisa.</span>
          </div>
        ) : (
          <div className="admin-table-wrapper">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Utilizador</th>
                  <th>Função</th>
                  <th>Estado</th>
                  <th>Registo</th>
                  <th>Permissões</th>
                  <th>Ações</th>
                </tr>
              </thead>

              <tbody>
                {users.map((user) => {
                  const isProtected =
                    user.role === "super_admin" ||
                    user.email?.toLowerCase() ===
                      "aldair347joao@gmail.com";

                  return (
                    <tr key={user._id}>
                      <td>
                        <div className="admin-user-cell">
                          <div className="admin-user-avatar">
                            {user.name?.charAt(0)?.toUpperCase() || "U"}
                          </div>

                          <div>
                            <strong>{user.name}</strong>
                            <span>{user.email}</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="admin-role-badge">
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>

                      <td>
                        <span
                          className={
                            user.isActive
                              ? "admin-status active"
                              : "admin-status inactive"
                          }
                        >
                          {user.isActive ? "Ativa" : "Suspensa"}
                        </span>
                      </td>

                      <td>{formatDate(user.createdAt)}</td>

                      <td>
                        {isProtected ? (
                          <span className="admin-protected">
                            <Crown size={15} />
                            Protegida
                          </span>
                        ) : (
                          <div className="admin-role-editor">
                            <select
                              value={roleDrafts[user._id] || user.role}
                              onChange={(event) =>
                                setRoleDrafts((current) => ({
                                  ...current,
                                  [user._id]: event.target.value
                                }))
                              }
                              disabled={updatingId === user._id}
                              aria-label={`Função de ${user.name}`}
                            >
                              {EDITABLE_ROLES.map((role) => (
                                <option key={role} value={role}>
                                  {ROLE_LABELS[role]}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleRoleChange(user)}
                              disabled={
                                updatingId === user._id ||
                                roleDrafts[user._id] === user.role
                              }
                              title="Guardar função"
                            >
                              <UserCog size={16} />
                            </button>
                          </div>
                        )}
                      </td>

                      <td>
                        {isProtected ? (
                          <span className="admin-protected">
                            <ShieldCheck size={15} />
                            Exclusiva
                          </span>
                        ) : (
                          <button
                            type="button"
                            className={
                              user.isActive
                                ? "admin-action-button suspend"
                                : "admin-action-button activate"
                            }
                            disabled={updatingId === user._id}
                            onClick={() => handleStatusChange(user)}
                          >
                            {updatingId === user._id
                              ? "Aguarda..."
                              : user.isActive
                                ? "Suspender"
                                : "Ativar"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="admin-pagination">
          <span>
            Página {pagination.page} de {Math.max(1, pagination.totalPages)}
          </span>

          <div>
            <button
              type="button"
              onClick={() => changePage(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              aria-label="Página anterior"
            >
              <ChevronLeft size={18} />
            </button>

            <button
              type="button"
              onClick={() => changePage(pagination.page + 1)}
              disabled={
                pagination.page >= pagination.totalPages || loading
              }
              aria-label="Página seguinte"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </section>

      <div className="admin-footer-note">
        <ShieldCheck size={16} />
        Área protegida por autenticação e autorização no servidor.
      </div>
    </div>
  );
}

export default AdminPanel;
