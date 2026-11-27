
import {
  ArrowLeft,
  ArrowRight,
  GraduationCap,
  BookOpen,
  Video,
  Users,
  CreditCard,
  ShieldCheck,
  MonitorPlay,
  CheckCircle2,
  LogIn
} from "lucide-react";

import "./AcademyLanding.css";

function AcademyLanding({ onBack, onAccess }) {
  const steps = [
    {
      number: "01",
      title: "Cria a tua conta",
      description:
        "Regista-te gratuitamente na plataforma ou entra com a tua conta ALDAIR ONE."
    },
    {
      number: "02",
      title: "Explora os cursos",
      description:
        "Consulta os cursos e as turmas disponíveis na Academia."
    },
    {
      number: "03",
      title: "Solicita a inscrição",
      description:
        "Escolhe a turma pretendida e segue as instruções apresentadas pela plataforma."
    },
    {
      number: "04",
      title: "Começa a aprender",
      description:
        "Depois da inscrição ser confirmada, acede às aulas e aos materiais disponibilizados."
    }
  ];

  return (
    <div className="academy-landing">
      <header className="academy-landing-header">
        <button
          type="button"
          className="academy-back"
          onClick={onBack}
        >
          <ArrowLeft size={17} />
          Voltar ao ALDAIR ONE
        </button>

        <a
          href="#academy-top"
          className="academy-landing-brand"
          aria-label="ALDAIR ONE Academy"
        >
          <span className="academy-brand-mark">A</span>
          <span>
            <strong>ALDAIR ONE</strong>
            <small>ACADEMY</small>
          </span>
        </a>

        <button
          type="button"
          className="academy-header-login"
          onClick={onAccess}
        >
          <LogIn size={16} />
          Entrar
        </button>
      </header>

      <main id="academy-top">
        <section className="academy-landing-hero">
          <div className="academy-hero-content">
            <span className="academy-eyebrow">
  APRENDIZAGEM · TECNOLOGIA · FUTURO
</span>

            <h1>
              Aprende hoje.
              <br />
              <span>Constrói o amanhã.</span>
            </h1>

            <p>
              A ALDAIR ONE Academy é um espaço de aprendizagem
              orientado para a prática, onde podes desenvolver
              conhecimentos e competências através de cursos,
              aulas online e materiais de formação.
            </p>

            <div className="academy-hero-actions">
              <button
                type="button"
                className="academy-primary-button"
                onClick={onAccess}
              >
                Explorar cursos e obter acesso
                <ArrowRight size={18} />
              </button>

              <a
                href="#como-funciona"
                className="academy-secondary-button"
              >
                Como funciona?
              </a>
            </div>

            <div className="academy-hero-note">
              <ShieldCheck size={16} />
              Acesso pessoal através da tua conta ALDAIR ONE.
            </div>
          </div>

          <div className="academy-hero-visual">
            <div className="academy-visual-glow" />

            <div className="academy-visual-card">
              <div className="academy-visual-top">
                <span className="academy-visual-icon">
                  <GraduationCap size={30} />
                </span>
                <span className="academy-live-indicator">
                  LEARNING SPACE
                </span>
              </div>

              <div className="academy-visual-lines">
                <span />
                <span />
                <span />
              </div>

              <div className="academy-visual-bottom">
                <div>
                  <small>ALDAIR ONE</small>
                  <strong>Academy</strong>
                </div>
                <BookOpen size={30} />
              </div>
            </div>

            <div className="academy-floating-label">
              <MonitorPlay size={18} />
              <span>
                <strong>Aprendizagem online</strong>
                <small>Estuda a partir de onde estiveres</small>
              </span>
            </div>
          </div>
        </section>

        <section className="academy-benefits">
          <article>
            <span><BookOpen size={23} /></span>
            <div>
              <strong>Formação estruturada</strong>
              <p>Conteúdos organizados por cursos e turmas.</p>
            </div>
          </article>

          <article>
            <span><Video size={23} /></span>
            <div>
              <strong>Aulas online</strong>
              <p>Participa nas sessões disponibilizadas.</p>
            </div>
          </article>

          <article>
            <span><Users size={23} /></span>
            <div>
              <strong>Acompanhamento</strong>
              <p>Área pessoal para acompanhar a tua aprendizagem.</p>
            </div>
          </article>
        </section>

        <section
          className="academy-how-section"
          id="como-funciona"
        >
          <div className="academy-section-heading">
            <span>O TEU PERCURSO</span>
            <h2>Como entrar na Academia?</h2>
            <p>
              O processo foi pensado para tornar o acesso à formação
              simples e organizado.
            </p>
          </div>

          <div className="academy-steps">
            {steps.map((step) => (
              <article key={step.number}>
                <span className="academy-step-number">
                  {step.number}
                </span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="academy-enrollment-section">
          <div className="academy-enrollment-content">
            <span className="academy-enrollment-icon">
              <CreditCard size={25} />
            </span>

            <div>
              <span className="academy-enrollment-label">
                INSCRIÇÕES E PAGAMENTOS
              </span>

              <h2>Um processo claro e acompanhado.</h2>

              <p>
                As condições de inscrição dependem do curso e da turma.
                Quando existir um curso pago, a plataforma apresenta
                os dados e as instruções de pagamento configurados.
                Poderás submeter o comprovativo para validação.
              </p>

              <p>
                Nas formações gratuitas, a inscrição pode ser realizada
                diretamente, de acordo com as condições da turma.
              </p>
            </div>
          </div>
        </section>

        <section className="academy-access-section">
          <span className="academy-access-icon">
            <GraduationCap size={30} />
          </span>

          <span className="academy-eyebrow">
            O PRÓXIMO PASSO COMEÇA AQUI
          </span>

          <h2>O teu desenvolvimento começa com uma oportunidade.</h2>

          <p>
            Acede à tua conta, explora as formações disponíveis
            e encontra o próximo passo da tua aprendizagem.
          </p>

          <button
            type="button"
            className="academy-primary-button"
            onClick={onAccess}
          >
            Explorar cursos e obter acesso
            <ArrowRight size={18} />
          </button>
        </section>
      </main>

      <footer className="academy-landing-footer">
        <a
          href="#academy-top"
          className="academy-landing-brand"
        >
          <span className="academy-brand-mark">A</span>
          <span>
            <strong>ALDAIR ONE</strong>
            <small>ACADEMY</small>
          </span>
        </a>

        <p>
          © {new Date().getFullYear()} ALDAIR ONE.
          Todos os direitos reservados.
        </p>

        <button type="button" onClick={onBack}>
          Voltar ao início
        </button>
      </footer>
    </div>
  );
}

export default AcademyLanding;
