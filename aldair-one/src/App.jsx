
import { useState, useEffect } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Menu,
  X,
  Code2,
  GraduationCap,
  BriefcaseBusiness,
  Workflow,
  BrainCircuit,
  Video,
  Mail,
  Github,
  Linkedin,
  Globe,
  Layers3,
  ShieldCheck,
  Zap,
  ChevronRight,
  LogIn,
  UserRound
} from "lucide-react";

import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import { authAPI, getToken } from "./services/api";

const services = [
  {
    icon: Code2,
    title: "Desenvolvimento de Sistemas",
    description:
      "Criação de aplicações web, plataformas digitais e sistemas personalizados para responder às necessidades das empresas."
  },
  {
    icon: Workflow,
    title: "Automação Inteligente",
    description:
      "Automatização de processos, tarefas operacionais, navegação web e integração entre plataformas."
  },
  {
    icon: BriefcaseBusiness,
    title: "Gestão Empresarial",
    description:
      "Implementação, configuração e personalização de soluções empresariais, incluindo Odoo e CRM."
  },
  {
    icon: BrainCircuit,
    title: "Inteligência Artificial",
    description:
      "Integração de IA em processos empresariais, análise de dados e desenvolvimento de soluções inteligentes."
  }
];

const projects = [
  {
    name: "HONEY PAY",
    category: "Fintech · Pagamentos",
    description:
      "Projeto de plataforma digital orientada para integrações de pagamentos e soluções financeiras.",
    status: "Em desenvolvimento",
    icon: Zap
  },
  {
    name: "TRAVEL AUTOMATION",
    category: "Automação · Tecnologia",
    description:
      "Sistema de automação de processos de navegação e acompanhamento de fluxos de agendamento.",
    status: "Projeto em evolução",
    icon: Globe
  },
  {
    name: "SMARTBIZ",
    category: "Gestão · Inteligência",
    description:
      "Conceito de plataforma inteligente para apoiar operações, relacionamento com clientes e decisões empresariais.",
    status: "Em desenvolvimento",
    icon: Layers3
  }
];

const technologies = [
  "JavaScript",
  "React",
  "Node.js",
  "Python",
  "HTML & CSS",
  "MongoDB",
  "Odoo",
  "Playwright",
  "Puppeteer",
  "APIs",
  "Inteligência Artificial"
];

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [dashboardOpen, setDashboardOpen] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;

    async function restoreSession() {
      if (!getToken()) {
        if (active) {
          setCheckingSession(false);
        }
        return;
      }

      try {
        const response = await authAPI.me();

        if (active && response.success && response.user) {
          setUser(response.user);
          setDashboardOpen(true);
        }
      } catch (error) {
        authAPI.logout();
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    }

    restoreSession();

    return () => {
      active = false;
    };
  }, []);

  const closeMenu = () => setMenuOpen(false);

  const navItems = [
    ["Início", "#inicio"],
    ["Sobre", "#sobre"],
    ["Serviços", "#servicos"],
    ["Projetos", "#projetos"],
    ["Academia", "#academia"],
    ["Contacto", "#contacto"]
  ];

  function handleAuthenticated(authenticatedUser) {
    setUser(authenticatedUser);
    setAuthOpen(false);
    setDashboardOpen(true);
  }

  function handleLogout() {
    authAPI.logout();
    setUser(null);
    setDashboardOpen(false);
    setAuthOpen(false);
    setMenuOpen(false);
  }

  if (checkingSession) {
    return (
      <div className="app">
        <div
          style={{
            minHeight: "100vh",
            display: "grid",
            placeItems: "center",
            color: "#ffffff",
            background: "#080f1e",
            fontSize: "16px"
          }}
        >
          A carregar ALDAIR ONE...
        </div>
      </div>
    );
  }

  if (user && dashboardOpen) {
    return (
      <Dashboard
        user={user}
        onLogout={handleLogout}
      />
    );
  }

  return (
    <div className="app">
      <header className="header">
        <a href="#inicio" className="brand" onClick={closeMenu}>
          <span className="brand-mark">A</span>
          <span>
            <strong>ALDAIR ONE</strong>
            <small>TECHNOLOGY ECOSYSTEM</small>
          </span>
        </a>

        <button
          className="mobile-menu"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label="Abrir menu"
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          {navItems.map(([label, link]) => (
            <a key={link} href={link} onClick={closeMenu}>
              {label}
            </a>
          ))}

          <a
            href="#contacto"
            className="nav-cta"
            onClick={closeMenu}
          >
            Vamos conversar <ArrowUpRight size={15} />
          </a>

          <button
            type="button"
            className="nav-cta"
            onClick={() => {
              closeMenu();

              if (user) {
                setDashboardOpen(true);
              } else {
                setAuthOpen(true);
              }
            }}
            style={{
              border: "none",
              cursor: "pointer",
              fontFamily: "inherit"
            }}
          >
            {user ? (
              <>
                <UserRound size={16} />
                Minha conta
              </>
            ) : (
              <>
                <LogIn size={16} />
                Entrar / Criar conta
              </>
            )}
          </button>
        </nav>
      </header>

      <main>
        {/* APRESENTAÇÃO PRINCIPAL */}
        <section className="hero section" id="inicio">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              TECNOLOGIA · INOVAÇÃO · SOLUÇÕES
            </div>

            <h1>
              Uma visão.
              <br />
              <span>Múltiplas soluções.</span>
            </h1>

            <p className="hero-description">
              Sou Aldair João Francisco. Desenvolvo soluções tecnológicas
              que conectam negócios, automação e inteligência para transformar
              ideias em resultados.
            </p>

            <div className="hero-actions">
              <a href="#projetos" className="button button-primary">
                Explorar projetos <ArrowRight size={18} />
              </a>

              <a href="#sobre" className="button button-outline">
                Conhecer o meu trabalho
              </a>
            </div>

            <div className="hero-meta">
              <span>
                <ShieldCheck size={16} />
                Soluções orientadas a resultados
              </span>

              <span>
                <Globe size={16} />
                Angola · Disponível remotamente
              </span>
            </div>
          </div>

          {/* FOTOGRAFIA PROFISSIONAL */}
          <div className="hero-visual">
            <div className="hero-photo-frame">
              <img
                src="/aldair-profile.jpg"
                alt="Aldair João Francisco"
                className="hero-profile-photo"
                loading="eager"
              />

              <div className="hero-photo-caption">
                <span className="status-dot" />

                <div>
                  <strong>Aldair João Francisco</strong>
                  <small>DESENVOLVEDOR FULL STACK</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* INDICADORES */}
        <section className="metrics">
          <div>
            <strong>01</strong>
            <span>Ecossistema digital</span>
          </div>

          <div>
            <strong>04</strong>
            <span>Áreas de atuação</span>
          </div>

          <div>
            <strong>∞</strong>
            <span>Possibilidades de inovação</span>
          </div>
        </section>

        {/* SOBRE */}
        <section className="section about" id="sobre">
          <div className="section-heading">
            <span className="section-label">01 — SOBRE</span>
            <h2>Tecnologia com propósito.</h2>
          </div>

          <div className="about-grid">
            <div>
              <p className="about-lead">
                Acredito que a tecnologia deve resolver problemas reais,
                simplificar processos e criar novas oportunidades.
              </p>

              <p className="muted">
                O meu trabalho cruza desenvolvimento de software, automação,
                plataformas de gestão empresarial, análise de dados e
                integração de inteligência artificial. O objetivo é criar
                ferramentas úteis, eficientes e adaptadas às necessidades
                concretas dos negócios.
              </p>

              <a href="#contacto" className="text-link">
                Trabalhar comigo <ArrowUpRight size={17} />
              </a>
            </div>

            <div className="profile-card">
              <div className="profile-symbol">AJF</div>
              <h3>Aldair João Francisco</h3>
              <p>Desenvolvedor Full Stack</p>
              <div className="profile-line" />
              <span>
                Desenvolvimento · Automação · Sistemas empresariais
              </span>
            </div>
          </div>

          <div className="tech-area">
            <h3>Ferramentas e tecnologias</h3>

            <div className="tech-list">
              {technologies.map((tech) => (
                <span key={tech}>{tech}</span>
              ))}
            </div>
          </div>
        </section>

        {/* SERVIÇOS */}
        <section className="section services" id="servicos">
          <div className="section-heading">
            <span className="section-label">02 — SERVIÇOS</span>
            <h2>Soluções para avançar.</h2>
            <p className="muted">
              Tecnologia aplicada às necessidades de pessoas, projetos e empresas.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service, index) => {
              const Icon = service.icon;

              return (
                <article className="service-card" key={service.title}>
                  <div className="service-top">
                    <span>0{index + 1}</span>
                    <Icon size={25} />
                  </div>

                  <h3>{service.title}</h3>
                  <p>{service.description}</p>

                  <a
                    href="#contacto"
                    aria-label={`Consultar ${service.title}`}
                  >
                    <ArrowUpRight size={20} />
                  </a>
                </article>
              );
            })}
          </div>
        </section>

        {/* PROJETOS */}
        <section className="section projects" id="projetos">
          <div className="section-heading">
            <span className="section-label">03 — PROJETOS</span>
            <h2>Ideias em construção.</h2>
            <p className="muted">
              Projetos que demonstram a aplicação prática da tecnologia.
            </p>
          </div>

          <div className="project-grid">
            {projects.map((project) => {
              const Icon = project.icon;

              return (
                <article className="project-card" key={project.name}>
                  <div className="project-icon">
                    <Icon size={27} />
                  </div>

                  <span className="project-category">
                    {project.category}
                  </span>

                  <h3>{project.name}</h3>
                  <p>{project.description}</p>

                  <div className="project-footer">
                    <span>{project.status}</span>
                    <ArrowUpRight size={18} />
                  </div>
                </article>
              );
            })}
          </div>
        </section>

        {/* ACADEMIA */}
        <section className="academy" id="academia">
          <div className="academy-icon">
            <GraduationCap size={35} />
          </div>

          <div className="academy-content">
            <span className="section-label">04 — EDUCAÇÃO</span>
            <h2>ALDAIR ONE Academy</h2>

            <p>
              Um espaço de aprendizagem prática, onde o conhecimento
              tecnológico se transforma em competências e soluções para
              o mercado de trabalho.
            </p>

            <div className="academy-features">
              <span>
                <Code2 size={16} />
                Formação prática
              </span>

              <span>
                <Video size={16} />
                Aulas online
              </span>

              <span>
                <GraduationCap size={16} />
                Certificados
              </span>
            </div>

            <a href="#contacto" className="button button-primary">
              Conhecer a Academia <ArrowRight size={18} />
            </a>
          </div>

          <div className="academy-decoration">ONE</div>
        </section>

        {/* CONTACTO */}
        <section className="section contact" id="contacto">
          <div className="section-heading">
            <span className="section-label">05 — CONTACTO</span>
            <h2>Vamos criar algo relevante?</h2>

            <p className="muted">
              Tens um desafio, uma ideia ou um projeto? Vamos conversar.
            </p>
          </div>

          <div className="contact-grid">
            <a
              href="mailto:contacto@aldairone.com"
              className="contact-item"
            >
              <Mail size={22} />

              <span>
                <small>EMAIL</small>
                <strong>Enviar uma mensagem</strong>
              </span>

              <ArrowUpRight />
            </a>

            <a
              href="https://github.com/aldair347joao-spec"
              target="_blank"
              rel="noreferrer"
              className="contact-item"
            >
              <Github size={22} />

              <span>
                <small>GITHUB</small>
                <strong>Explorar repositórios</strong>
              </span>

              <ArrowUpRight />
            </a>

            <a
              href="https://www.linkedin.com/"
              target="_blank"
              rel="noreferrer"
              className="contact-item"
            >
              <Linkedin size={22} />

              <span>
                <small>LINKEDIN</small>
                <strong>Perfil profissional</strong>
              </span>

              <ArrowUpRight />
            </a>
          </div>
        </section>
      </main>

      {/* RODAPÉ */}
      <footer className="footer">
        <a href="#inicio" className="brand footer-brand">
          <span className="brand-mark">A</span>

          <span>
            <strong>ALDAIR ONE</strong>
            <small>ONE PLATFORM. MULTIPLE SOLUTIONS.</small>
          </span>
        </a>

        <p>
          © {new Date().getFullYear()} ALDAIR ONE. Todos os direitos reservados.
        </p>

        <a href="#inicio" className="back-top">
          Voltar ao topo <ChevronRight size={16} />
        </a>
      </footer>

      {/* AUTENTICAÇÃO */}
      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </div>
  );
}

export default App;
