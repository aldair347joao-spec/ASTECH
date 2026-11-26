
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
  UserRound,
  Sparkles,
  ExternalLink
} from "lucide-react";
import ServiceRequestModal from "./components/ServiceRequestModal";
import AuthModal from "./components/AuthModal";
import Dashboard from "./components/Dashboard";
import AcademyLanding from "./components/AcademyLanding";
import { authAPI, getToken } from "./services/api";

const services = [
  {
    icon: Code2,
    number: "01",
    title: "Desenvolvimento de Sistemas",
    description:
      "Criação de aplicações web, plataformas digitais e sistemas personalizados para responder às necessidades das empresas."
  },
  {
    icon: Workflow,
    number: "02",
    title: "Automação Inteligente",
    description:
      "Automatização de processos, tarefas operacionais, navegação web e integração entre plataformas."
  },
  {
    icon: BriefcaseBusiness,
    number: "03",
    title: "Gestão Empresarial",
    description:
      "Implementação, configuração e personalização de soluções empresariais, incluindo Odoo e CRM."
  },
  {
    icon: BrainCircuit,
    number: "04",
    title: "Inteligência Artificial",
    description:
      "Integração de IA em processos empresariais, análise de dados e desenvolvimento de soluções inteligentes."
  }
];

const projects = [
  {
    name: "HONEY PAY",
    category: "FINTECH · PAGAMENTOS",
    description:
      "Plataforma digital orientada para integrações de pagamentos e soluções financeiras.",
    status: "Em desenvolvimento",
    icon: Zap,
    number: "01"
  },
  {
    name: "TRAVEL AUTOMATION",
    category: "AUTOMAÇÃO · TECNOLOGIA",
    description:
      "Sistema de automação de processos de navegação e acompanhamento de fluxos de agendamento.",
    status: "Projeto em evolução",
    icon: Globe,
    number: "02"
  },
  {
    name: "SMARTBIZ",
    category: "GESTÃO · INTELIGÊNCIA",
    description:
      "Plataforma inteligente para apoiar operações, relacionamento com clientes e decisões empresariais.",
    status: "Em desenvolvimento",
    icon: Layers3,
    number: "03"
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
  const [serviceModalOpen, setServiceModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState("");
  const [academyPageOpen, setAcademyPageOpen] = useState(false);
  const [academyAccessRequested, setAcademyAccessRequested] = useState(false);
const [dashboardInitialSection, setDashboardInitialSection] = useState("overview");
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
  setAcademyPageOpen(false);

  setDashboardInitialSection(
    academyAccessRequested ? "academy" : "overview"
  );

  setAcademyAccessRequested(false);
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
            background: "#080d19",
            fontSize: "16px"
          }}
        >
          A carregar ALDAIR ONE...
        </div>
      </div>
    );
  }
 if (academyPageOpen && !user) {
  return (
    <>
      <AcademyLanding
        onBack={() => setAcademyPageOpen(false)}
        onAccess={() => {
  setAcademyAccessRequested(true);
  setDashboardInitialSection("academy");
  setAuthOpen(true);
}}
      />

      {authOpen && (
        <AuthModal
          onClose={() => setAuthOpen(false)}
          onAuthenticated={handleAuthenticated}
        />
      )}
    </>
  );
}

if (user && dashboardOpen) {
  return (
    <Dashboard
      user={user}
      onLogout={handleLogout}
      initialSection={dashboardInitialSection}
    />
  );
}

  return (
    <div className="app">
      {/* CABEÇALHO */}
      <header className="header">
        <a
          href="#inicio"
          className="brand"
          onClick={closeMenu}
          aria-label="ALDAIR ONE - Início"
        >
          <span className="brand-mark">A</span>

          <span>
            <strong>ALDAIR ONE</strong>
            <small>TECHNOLOGY ECOSYSTEM</small>
          </span>
        </a>

        <nav className={menuOpen ? "nav nav-open" : "nav"}>
          {navItems.map(([label, link]) => (
  <a
    key={link}
    href={link}
    onClick={(event) => {
      closeMenu();
 if (label === "Academia") {
  event.preventDefault();

  if (user) {
    setAcademyPageOpen(false);
    setDashboardInitialSection("academy");
    setDashboardOpen(true);
  } else {
    setAcademyAccessRequested(false);
    setAcademyPageOpen(true);
  }
}
    }}
  >
    {label}
  </a>
))}

          <a
            href="#contacto"
            className="nav-cta"
            onClick={closeMenu}
          >
            Vamos conversar
            <ArrowUpRight size={15} />
          </a>

          <button
            type="button"
            className="nav-cta nav-account"
            onClick={() => {
              closeMenu();

              if (user) {
  setDashboardInitialSection("overview");
  setDashboardOpen(true);
} else {
  setAcademyAccessRequested(false);
  setAuthOpen(true);
}
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

        {/* FOTOGRAFIA DE PERFIL NO CABEÇALHO */}
        <a
          href="#sobre"
          className="header-profile"
          onClick={closeMenu}
          aria-label="Ver perfil de Aldair João Francisco"
          title="Aldair João Francisco"
        >
          <img
            src="/aldair-profile.jpg"
            alt="Aldair João Francisco"
          />
        </a>

        <button
          className="mobile-menu"
          type="button"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </header>

      <main>
        {/* APRESENTAÇÃO PRINCIPAL */}
        <section className="hero section" id="inicio">
          <div className="hero-content">
            <div className="eyebrow">
              <span className="status-dot" />
              TECNOLOGIA · INOVAÇÃO · SOLUÇÕES
            </div>

            <span className="hero-intro">
              OLÁ, SOU ALDAIR JOÃO FRANCISCO
            </span>

            <h1>
              Transformo ideias
              <br />
              em <span>soluções digitais.</span>
            </h1>

            <p className="hero-description">
              Desenvolvedor Full Stack focado na criação de sistemas,
              automação de processos e soluções tecnológicas que ajudam
              empresas e pessoas a evoluir.
            </p>

            <div className="hero-specialties">
              <span>Desenvolvimento de software</span>
              <span>Automação</span>
              <span>Inteligência Artificial</span>
            </div>

            <div className="hero-actions">
              <a href="#projetos" className="button button-primary">
                Explorar projetos
                <ArrowRight size={18} />
              </a>

              <a href="#contacto" className="button button-outline">
                Entrar em contacto
                <ArrowUpRight size={17} />
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

          {/* VÍDEO DE APRESENTAÇÃO ALDAIR ONE */}
          <div className="hero-visual">
            <div className="hero-video-frame">
              <video
                className="hero-presentation-video"
                controls
                playsInline
                preload="metadata"
                aria-label="Vídeo de apresentação da plataforma ALDAIR ONE"
              >
                <source
                  src="/aldair-one-presentation.mp4"
                  type="video/mp4"
                />
                O teu navegador não suporta a reprodução deste vídeo.
              </video>
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
            <span className="section-label">01 — SOBRE MIM</span>
            <h2>Tecnologia com propósito.</h2>
            <p className="muted">
              Conhecimento técnico aplicado à resolução de problemas reais.
            </p>
          </div>

          <div className="about-grid">
            <div>
              <p className="about-lead">
                Acredito que a tecnologia deve resolver problemas reais,
                simplificar processos e criar novas oportunidades.
              </p>

              <p className="muted">
                O meu trabalho cruza desenvolvimento de software, automação,
                plataformas de gestão empresarial, integração de APIs e
                inteligência artificial. Procuro construir ferramentas
                úteis, eficientes e adaptadas às necessidades concretas
                dos negócios.
              </p>

              <a href="#contacto" className="text-link">
                Trabalhar comigo
                <ArrowUpRight size={17} />
              </a>
            </div>

            <div className="profile-card">
              <div className="profile-symbol">AJF</div>

              <span className="profile-card-label">
                PERFIL PROFISSIONAL
              </span>

              <h3>Aldair João Francisco</h3>
              <p>Desenvolvedor Full Stack</p>

              <div className="profile-line" />

              <span className="profile-card-description">
                Desenvolvimento de software · Automação · Sistemas
                empresariais · Integrações tecnológicas
              </span>
            </div>
          </div>

          <div className="tech-area">
            <div className="tech-heading">
              <span className="section-label">COMPETÊNCIAS TÉCNICAS</span>
              <h3>Ferramentas e tecnologias</h3>
            </div>

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
              Tecnologia aplicada às necessidades de pessoas, projetos
              e empresas.
            </p>
          </div>

          <div className="service-grid">
            {services.map((service) => {
              const Icon = service.icon;

              return (
                <article className="service-card" key={service.title}>
                  <div className="service-top">
                    <span>{service.number}</span>
                    <Icon size={25} />
                  </div>

                  <h3>{service.title}</h3>
                  <p>{service.description}</p>

                  <button
                    type="button"
                    className="service-request-link"
                    onClick={() => {
                      setSelectedService(service.title);
                      setServiceModalOpen(true);
                    }}
                    aria-label={`Solicitar ${service.title}`}
                  >
                    Solicitar serviço
                    <ArrowUpRight size={18} />
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        {/* PROJETOS */}
        <section className="section projects" id="projetos">
          <div className="section-heading">
            <span className="section-label">03 — PORTFÓLIO</span>
            <h2>Projetos e soluções.</h2>
            <p className="muted">
              Projetos que representam a aplicação prática da tecnologia
              em diferentes áreas.
            </p>
          </div>

          <div className="project-grid">
            {projects.map((project) => {
              const Icon = project.icon;

              return (
                <article className="project-card" key={project.name}>
                  <div className="project-card-top">
                    <div className="project-icon">
                      <Icon size={27} />
                    </div>

                    <span className="project-number">
                      {project.number}
                    </span>
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

            <button
  type="button"
  className="button button-primary"
  onClick={() => setAcademyPageOpen(true)}
>
  Conhecer a Academia
  <ArrowRight size={18} />
</button>
          </div>

          <div className="academy-decoration">ONE</div>
        </section>

        {/* CONTACTO */}
        <section className="section contact" id="contacto">
          <div className="section-heading">
            <span className="section-label">05 — CONTACTO</span>
            <h2>Vamos criar algo relevante?</h2>

            <p className="muted">
              Tens um desafio, uma ideia ou um projeto?
              Estou disponível para conversar.
            </p>
          </div>

          <div className="contact-grid">
            <a
              href="mailto:contactoaldairone@gmail.com"
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

              <ExternalLink />
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

              <ExternalLink />
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
          © {new Date().getFullYear()} ALDAIR ONE.
          Todos os direitos reservados.
        </p>

        <a href="#inicio" className="back-top">
          Voltar ao topo
          <ChevronRight size={16} />
        </a>
      </footer>

      {serviceModalOpen && (
        <ServiceRequestModal
          service={selectedService}
          onClose={() => setServiceModalOpen(false)}
        />
      )}

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
