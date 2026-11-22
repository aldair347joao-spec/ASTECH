
import { useState } from "react";
import {
  LayoutDashboard,
  UserRound,
  GraduationCap,
  Video,
  BriefcaseBusiness,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  Bell,
  ChevronRight,
  Settings,
  Crown,
  LockKeyhole,
  Users
} from "lucide-react";

import { authAPI } from "../services/api";
import AdminPanel from "./AdminPanel";
import Academy from "./Academy";
import "./Dashboard.css";

const SUPER_ADMIN_EMAIL = "aldair347joao@gmail.com";

function Dashboard({ user, onLogout }) {
  const [currentUser, setCurrentUser] = useState(user);
  const [activeSection, setActiveSection] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);
  const [setupKey, setSetupKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");

  const isSuperAdmin =
    currentUser?.role === "super_admin" &&
    currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL;

  const canSetupSuperAdmin =
    currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL &&
    currentUser?.role !== "super_admin";

  const sections = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "profile", label: "Meu perfil", icon: UserRound },
    { id: "academy", label: "Academia", icon: GraduationCap },
    { id: "classes", label: "Aulas online", icon: Video },
    { id: "services", label: "Serviços", icon: BriefcaseBusiness },
    { id: "security", label: "Segurança", icon: ShieldCheck },

    ...(isSuperAdmin
      ? [
          {
            id: "admin",
            label: "Painel administrativo",
            icon: Users
          }
        ]
      : []),

    ...(canSetupSuperAdmin
      ? [
          {
            id: "superadmin-setup",
            label: "Conta principal",
            icon: Crown
          }
        ]
      : [])
  ];

  const roleLabels = {
    super_admin: "Super Administrador",
    admin: "Administrador",
    instructor: "Formador",
    student: "Aluno",
    client: "Cliente",
    user: "Utilizador"
  };

  const role = roleLabels[currentUser?.role] || "Utilizador";

  async function activateSuperAdmin(event) {
    event.preventDefault();

    if (!setupKey.trim()) {
      setMessage("Introduz a chave privada de ativação.");
      setMessageType("error");
      return;
    }

    setLoading(true);
    setMessage("");
    setMessageType("");

    try {
      const response = await authAPI.activateSuperAdmin(setupKey);

      if (response.user) {
        setCurrentUser(response.user);
      }

      setSetupKey("");
      setMessage(
        "Ativação concluída. A tua conta é agora o Super Administrador do ALDAIR ONE."
      );
      setMessageType("success");
      setActiveSection("overview");
    } catch (error) {
      setMessage(error.message);
      setMessageType("error");
    } finally {
      setLoading(false);
    }
  }

  function renderContent() {
    switch (activeSection) {
      case "admin":
        if (!isSuperAdmin) {
          return (
            <section className="dashboard-panel">
              <ShieldCheck size={34} />
              <h2>Acesso não autorizado</h2>
              <p className="dashboard-muted">
                Não tens permissões para aceder ao painel administrativo.
              </p>
            </section>
          );
        }

        return <AdminPanel />;

      case "superadmin-setup":
        return (
          <section className="dashboard-panel">
            <Crown size={34} />

            <h2>Ativação da conta principal</h2>

            <p className="dashboard-muted">
              Esta área permite ativar os privilégios exclusivos
              de Super Administrador através da chave privada
              configurada no servidor.
            </p>

            <div className="dashboard-security">
              <div>
                <ShieldCheck size={23} />
                <span>
                  <strong>Email reservado</strong>
                  <small>{SUPER_ADMIN_EMAIL}</small>
                </span>
              </div>
            </div>

            <form
              className="dashboard-admin-form"
              onSubmit={activateSuperAdmin}
            >
              <label htmlFor="super-admin-key">
                Chave privada de ativação
              </label>

              <input
                id="super-admin-key"
                type="password"
                autoComplete="new-password"
                placeholder="Introduz a tua chave privada"
                value={setupKey}
                onChange={(event) => setSetupKey(event.target.value)}
                required
              />

              <button
                type="submit"
                className="dashboard-admin-button"
                disabled={loading || !setupKey.trim()}
              >
                <LockKeyhole size={18} />
                {loading ? "A ativar..." : "Ativar Super Administrador"}
              </button>
            </form>

            {message && (
              <p
                className={`dashboard-admin-message ${messageType}`}
                role="status"
              >
                {message}
              </p>
            )}

            <p className="dashboard-muted">
              A chave é enviada diretamente ao servidor através
              de uma ligação segura. Não a partilhes com ninguém.
            </p>
          </section>
        );

      case "profile":
        return (
          <section className="dashboard-panel">
            <h2>Meu perfil</h2>

            <p className="dashboard-muted">
              Consulta os dados associados à tua conta.
            </p>

            <div className="dashboard-profile">
              <div className="dashboard-avatar">
                {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <h3>{currentUser?.name || "Utilizador"}</h3>
                <p>{currentUser?.email}</p>
                <span>{role}</span>
              </div>
            </div>

            <div className="dashboard-info-grid">
              <div>
                <small>Nome completo</small>
                <strong>{currentUser?.name || "Não disponível"}</strong>
              </div>

              <div>
                <small>Email</small>
                <strong>{currentUser?.email || "Não disponível"}</strong>
              </div>

              <div>
                <small>Tipo de conta</small>
                <strong>{role}</strong>
              </div>
            </div>
          </section>
        );

      case "academy":
        return (
          <Academy
            key="academy"
            user={currentUser}
            initialTab="courses"
          />
        );

      case "classes":
        return (
          <Academy
            key="classes"
            user={currentUser}
            initialTab="sessions"
          />
        );

      case "services":
        return (
          <section className="dashboard-panel">
            <BriefcaseBusiness size={32} />
            <h2>Serviços tecnológicos</h2>

            <p className="dashboard-muted">
              Acompanha os teus pedidos de desenvolvimento,
              automação e consultoria tecnológica.
            </p>

            <div className="dashboard-empty">
              <BriefcaseBusiness size={28} />
              <strong>Os teus pedidos</strong>
              <span>Ainda não existem pedidos para apresentar.</span>
            </div>
          </section>
        );

      case "security":
        return (
          <section className="dashboard-panel">
            <ShieldCheck size={32} />
            <h2>Segurança da conta</h2>

            <p className="dashboard-muted">
              Gere o acesso à tua conta ALDAIR ONE.
            </p>

            <div className="dashboard-security">
              <div>
                <ShieldCheck size={22} />
                <span>
                  <strong>Sessão autenticada</strong>
                  <small>A tua conta tem uma sessão activa.</small>
                </span>
              </div>

              <button
                onClick={onLogout}
                className="dashboard-logout-button"
              >
                <LogOut size={17} />
                Terminar sessão
              </button>
            </div>
          </section>
        );

      default:
        return (
          <>
            <div className="dashboard-welcome">
              <div>
                <span className="dashboard-eyebrow">
                  ÁREA PESSOAL · ALDAIR ONE
                </span>

                <h2>
                  Olá, {currentUser?.name?.split(" ")[0] || "bem-vindo"}!
                </h2>

                <p>
                  Bem-vindo ao teu espaço pessoal. Aqui podes acompanhar
                  a tua actividade na plataforma.
                </p>
              </div>

              <div className="dashboard-welcome-icon">
                <LayoutDashboard size={42} />
              </div>
            </div>

            {isSuperAdmin && (
              <div className="dashboard-superadmin-banner">
                <Crown size={22} />
                <div>
                  <strong>Super Administrador</strong>
                  <span>Conta principal do ALDAIR ONE.</span>
                </div>
              </div>
            )}

            <div className="dashboard-stats">
              <article>
                <GraduationCap size={23} />
                <span>Meus cursos</span>
                <strong>0</strong>
              </article>

              <article>
                <Video size={23} />
                <span>Aulas disponíveis</span>
                <strong>0</strong>
              </article>

              <article>
                <BriefcaseBusiness size={23} />
                <span>Pedidos de serviços</span>
                <strong>0</strong>
              </article>
            </div>

            <section className="dashboard-panel">
              <div className="dashboard-panel-heading">
                <div>
                  <h2>Começa por aqui</h2>
                  <p className="dashboard-muted">
                    Explora as funcionalidades da plataforma.
                  </p>
                </div>
              </div>

              <div className="dashboard-shortcuts">
                {sections
                  .filter((section) =>
                    ["profile", "academy", "classes", "services"].includes(
                      section.id
                    )
                  )
                  .map((section) => {
                    const Icon = section.icon;

                    return (
                      <button
                        key={section.id}
                        onClick={() => setActiveSection(section.id)}
                      >
                        <span className="dashboard-shortcut-icon">
                          <Icon size={22} />
                        </span>

                        <span>{section.label}</span>
                        <ChevronRight size={18} />
                      </button>
                    );
                  })}
              </div>
            </section>
          </>
        );
    }
  }

  return (
    <div className="dashboard-layout">
      <aside
        className={
          menuOpen
            ? "dashboard-sidebar open"
            : "dashboard-sidebar"
        }
      >
        <div className="dashboard-brand">
          <span className="dashboard-brand-mark">A</span>

          <span>
            <strong>ALDAIR ONE</strong>
            <small>PERSONAL SPACE</small>
          </span>

          <button
            className="dashboard-mobile-close"
            onClick={() => setMenuOpen(false)}
            aria-label="Fechar menu"
          >
            <X size={20} />
          </button>
        </div>

        <div className="dashboard-user">
          <div className="dashboard-avatar">
            {currentUser?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>

          <div>
            <strong>{currentUser?.name || "Utilizador"}</strong>
            <span>{role}</span>
          </div>
        </div>

        <span className="dashboard-menu-label">MENU PRINCIPAL</span>

        <nav className="dashboard-navigation">
          {sections.map((section) => {
            const Icon = section.icon;

            return (
              <button
                key={section.id}
                className={
                  activeSection === section.id ? "active" : ""
                }
                onClick={() => {
                  setActiveSection(section.id);
                  setMenuOpen(false);
                  setMessage("");
                }}
              >
                <Icon size={19} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </nav>

        <div className="dashboard-sidebar-bottom">
          <button onClick={onLogout}>
            <LogOut size={19} />
            Terminar sessão
          </button>

          <small>ALDAIR ONE © {new Date().getFullYear()}</small>
        </div>
      </aside>

      {menuOpen && (
        <button
          className="dashboard-backdrop"
          onClick={() => setMenuOpen(false)}
          aria-label="Fechar navegação"
        />
      )}

      <main className="dashboard-main">
        <header className="dashboard-topbar">
          <button
            className="dashboard-menu-toggle"
            onClick={() => setMenuOpen(true)}
            aria-label="Abrir navegação"
          >
            <Menu size={22} />
          </button>

          <div className="dashboard-breadcrumb">
            <span>ALDAIR ONE</span>
            <ChevronRight size={15} />

            <strong>
              {sections.find(
                (item) => item.id === activeSection
              )?.label || "Visão geral"}
            </strong>
          </div>

          <div className="dashboard-topbar-actions">
            <button
              className="dashboard-icon-button"
              title="Notificações"
              aria-label="Notificações"
            >
              <Bell size={19} />
            </button>

            <button
              className="dashboard-icon-button"
              onClick={() => setActiveSection("security")}
              title="Definições"
              aria-label="Definições"
            >
              <Settings size={19} />
            </button>
          </div>
        </header>

        <div className="dashboard-content">
          {renderContent()}
        </div>
      </main>
    </div>
  );
}

export default Dashboard;
