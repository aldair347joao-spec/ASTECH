
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
  Settings
} from "lucide-react";

import "./Dashboard.css";

function Dashboard({ user, onLogout }) {
  const [activeSection, setActiveSection] = useState("overview");
  const [menuOpen, setMenuOpen] = useState(false);

  const sections = [
    { id: "overview", label: "Visão geral", icon: LayoutDashboard },
    { id: "profile", label: "Meu perfil", icon: UserRound },
    { id: "academy", label: "Academia", icon: GraduationCap },
    { id: "classes", label: "Aulas online", icon: Video },
    { id: "services", label: "Serviços", icon: BriefcaseBusiness },
    { id: "security", label: "Segurança", icon: ShieldCheck }
  ];

  const roleLabels = {
    admin: "Administrador",
    instructor: "Formador",
    student: "Aluno",
    client: "Cliente",
    user: "Utilizador"
  };

  const role = roleLabels[user?.role] || "Utilizador";

  function renderContent() {
    switch (activeSection) {
      case "profile":
        return (
          <section className="dashboard-panel">
            <h2>Meu perfil</h2>
            <p className="dashboard-muted">
              Consulta os dados associados à tua conta.
            </p>

            <div className="dashboard-profile">
              <div className="dashboard-avatar">
                {user?.name?.charAt(0)?.toUpperCase() || "U"}
              </div>

              <div>
                <h3>{user?.name || "Utilizador"}</h3>
                <p>{user?.email}</p>
                <span>{role}</span>
              </div>
            </div>

            <div className="dashboard-info-grid">
              <div>
                <small>Nome completo</small>
                <strong>{user?.name || "Não disponível"}</strong>
              </div>
              <div>
                <small>Email</small>
                <strong>{user?.email || "Não disponível"}</strong>
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
          <section className="dashboard-panel">
            <GraduationCap size={32} />
            <h2>ALDAIR ONE Academy</h2>
            <p className="dashboard-muted">
              Aqui poderás acompanhar os teus cursos, inscrições,
              materiais de aprendizagem e certificados.
            </p>
            <div className="dashboard-empty">
              <GraduationCap size={28} />
              <strong>A tua área de formação</strong>
              <span>Os teus cursos serão apresentados aqui.</span>
            </div>
          </section>
        );

      case "classes":
        return (
          <section className="dashboard-panel">
            <Video size={32} />
            <h2>Aulas online</h2>
            <p className="dashboard-muted">
              Acede às salas de videoconferência e acompanha as tuas aulas.
            </p>
            <div className="dashboard-empty">
              <Video size={28} />
              <strong>Nenhuma sala disponível</strong>
              <span>As salas às quais tiveres acesso aparecerão aqui.</span>
            </div>
          </section>
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

              <button onClick={onLogout} className="dashboard-logout-button">
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
                <h2>Olá, {user?.name?.split(" ")[0] || "bem-vindo"}!</h2>
                <p>
                  Bem-vindo ao teu espaço pessoal. Aqui podes acompanhar
                  a tua actividade na plataforma.
                </p>
              </div>
              <div className="dashboard-welcome-icon">
                <LayoutDashboard size={42} />
              </div>
            </div>

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
                {sections.slice(1, 5).map((section) => {
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
      <aside className={menuOpen ? "dashboard-sidebar open" : "dashboard-sidebar"}>
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
            {user?.name?.charAt(0)?.toUpperCase() || "U"}
          </div>
          <div>
            <strong>{user?.name || "Utilizador"}</strong>
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
                className={activeSection === section.id ? "active" : ""}
                onClick={() => {
                  setActiveSection(section.id);
                  setMenuOpen(false);
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
              {sections.find((item) => item.id === activeSection)?.label}
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
