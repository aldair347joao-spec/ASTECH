
import { useCallback, useEffect, useState } from "react";
import {
  BookOpen,
  Users,
  Video,
  ClipboardList,
  Plus,
  RefreshCw,
  CalendarDays,
  Clock,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  Lock,
  X,
  Eye,
  Mail,
  UserCheck,
  UserX
} from "lucide-react";

import { academyAPI, adminAPI } from "../services/api";
import StudentProgress from "./StudentProgress";
import LiveRoom from "./LiveRoom";
import "./Academy.css";

const ROLE_LABELS = {
  super_admin: "Super Administrador",
  admin: "Administrador",
  instructor: "Formador",
  student: "Aluno"
};

function formatDate(value) {
  if (!value) return "Data não definida";

  return new Date(value).toLocaleDateString("pt-PT", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });
}

function formatDateTime(value) {
  if (!value) return "Horário não definido";

  return new Date(value).toLocaleString("pt-PT", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatPrice(price) {
  const amount = Number(price?.amount || 0);
  const currency = price?.currency || "AOA";

  if (amount <= 0) return "Gratuito";

  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency
  }).format(amount);
}

function statusLabel(status) {
  const labels = {
    active: "Ativa",
    pending: "Pendente",
    completed: "Concluída",
    cancelled: "Cancelada",
    paid: "Pago",
    failed: "Falhou",
    refunded: "Reembolsado",
    not_required: "Não necessário"
  };

  return labels[status] || status || "Não definido";
}

function Academy({ user, initialTab = "courses" }) {
  const role = user?.role || "user";
  const isAdmin = ["super_admin", "admin"].includes(role);
  const isInstructor = role === "instructor";
  const isStudent = role === "student";
  const canTeach = isAdmin || isInstructor;

  const [activeTab, setActiveTab] = useState(initialTab);

  const [courses, setCourses] = useState([]);
  const [classes, setClasses] = useState([]);
  const [enrollments, setEnrollments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [instructors, setInstructors] = useState([]);
  const [paymentSettings, setPaymentSettings] = useState({ multicaixaExpress: { number: "", holder: "" }, bfa: { holder: "", account: "", iban: "" }, instructions: "" });
  const [paymentSettingsLoading, setPaymentSettingsLoading] = useState(false);
    const [selectedEnrollmentClass, setSelectedEnrollmentClass] = useState(null);
  const [enrollmentPaymentMethod, setEnrollmentPaymentMethod] = useState("multicaixa_express");
  const [enrollmentPaymentConfirmed, setEnrollmentPaymentConfirmed] = useState(false);
  const [enrollmentProof, setEnrollmentProof] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [showForm, setShowForm] = useState(false);

  // ESTADO DA LISTA DE ALUNOS
  const [selectedRoster, setSelectedRoster] = useState(null);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterError, setRosterError] = useState("");

  // ESTADO DA VIDEOCONFERÊNCIA LIVEKIT
  const [selectedSession, setSelectedSession] = useState(null);

  const [courseForm, setCourseForm] = useState({
    title: "",
    summary: "",
    description: "",
    category: "",
    level: "beginner",
    price: "0",
    durationHours: "0"
  });

  const [classForm, setClassForm] = useState({
    name: "",
    description: "",
    course: "",
    instructor: "",
    capacity: "30",
    modality: "online",
    startDate: "",
    endDate: ""
  });

  const [sessionForm, setSessionForm] = useState({
    title: "",
    description: "",
    class: "",
    scheduledStart: "",
    scheduledEnd: "",
    recordingEnabled: false
  });

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const requests = [
        academyAPI.getCourses(),
        academyAPI.getClasses(),
        academyAPI.getEnrollments(),
        academyAPI.getLiveSessions()
      ];

      if (isAdmin) {
        requests.push(
          adminAPI.getUsers({
            role: "instructor",
            status: "active",
            limit: 100
          })
        );
      }

      const results = await Promise.all(requests);

      setCourses(results[0].courses || []);
      setClasses(results[1].classes || []);
      setEnrollments(results[2].enrollments || []);
      setSessions(results[3].sessions || []);

      if (isAdmin) {
        setInstructors(results[4].users || []);
      }
    } catch (err) {
      setError(
        err.message || "Não foi possível carregar os dados da Academia."
      );
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => { loadData(); }, [loadData]);
  const loadPaymentSettings = useCallback(async () => {
    if (!isAdmin) return;
    setPaymentSettingsLoading(true); setError("");
    try {
      const response = await academyAPI.getPaymentSettings();
      const settings = response.settings || {};
      setPaymentSettings({
        multicaixaExpress: { number: settings.multicaixaExpress?.number || "", holder: settings.multicaixaExpress?.holder || "" },
        bfa: { holder: settings.bfa?.holder || "", account: settings.bfa?.account || "", iban: settings.bfa?.iban || "" },
        instructions: settings.instructions || ""
      });
    } catch (err) { setError(err.message || "Não foi possível carregar os dados de pagamento."); }
    finally { setPaymentSettingsLoading(false); }
  }, [isAdmin]);
    useEffect(() => { if (activeTab === "payments" && isAdmin) loadPaymentSettings(); }, [activeTab, isAdmin, loadPaymentSettings]);

  function clearFeedback() { setError(""); setMessage(""); }
  async function handleSavePaymentSettings(event) {
    event.preventDefault(); setSaving(true); clearFeedback();
    try {
      const response = await academyAPI.updatePaymentSettings({
        multicaixaExpress: { number: paymentSettings.multicaixaExpress.number.trim(), holder: paymentSettings.multicaixaExpress.holder.trim() },
        bfa: { holder: paymentSettings.bfa.holder.trim(), account: paymentSettings.bfa.account.trim(), iban: paymentSettings.bfa.iban.trim() },
        instructions: paymentSettings.instructions.trim()
      });
      setMessage(response.message || "Dados de pagamento guardados com sucesso."); await loadPaymentSettings();
    } catch (err) { setError(err.message || "Não foi possível guardar os dados de pagamento."); }
    finally { setSaving(false); }
  }

  function openForm() {
    clearFeedback();
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
  }

  // CONSULTAR ALUNOS DE UMA TURMA
  async function handleViewRoster(classItem) {
    setRosterLoading(true);
    setRosterError("");
    setSelectedRoster({
      class: classItem,
      enrollments: [],
      statistics: null
    });

    try {
      const response = await academyAPI.getClassRoster(classItem._id);

      setSelectedRoster({
        class: response.class || classItem,
        enrollments: response.enrollments || [],
        statistics: response.class?.statistics || null
      });
    } catch (err) {
      setRosterError(
        err.message || "Não foi possível carregar os alunos desta turma."
      );
    } finally {
      setRosterLoading(false);
    }
  }

  function closeRoster() {
    setSelectedRoster(null);
    setRosterError("");
  }

  async function handleCreateCourse(event) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();

    try {
      const response = await academyAPI.createCourse({
        title: courseForm.title.trim(),
        summary: courseForm.summary.trim(),
        description: courseForm.description.trim(),
        category: courseForm.category.trim(),
        level: courseForm.level,
        price: {
          amount: Number(courseForm.price),
          currency: "AOA"
        },
        durationHours: Number(courseForm.durationHours)
      });

      setMessage(response.message || "Curso criado com sucesso.");

      setCourseForm({
        title: "",
        summary: "",
        description: "",
        category: "",
        level: "beginner",
        price: "0",
        durationHours: "0"
      });

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handlePublishCourse(course) {
    clearFeedback();

    try {
      const nextStatus =
        course.status === "published" ? "draft" : "published";

      const response = await academyAPI.updateCourseStatus(
        course._id,
        nextStatus
      );

      setMessage(response.message || "Estado do curso atualizado.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateClass(event) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();

    try {
      const response = await academyAPI.createClass({
        ...classForm,
        capacity: Number(classForm.capacity),
        startDate: new Date(classForm.startDate).toISOString(),
        endDate: new Date(classForm.endDate).toISOString()
      });

      setMessage(response.message || "Turma criada com sucesso.");

      setClassForm({
        name: "",
        description: "",
        course: "",
        instructor: "",
        capacity: "30",
        modality: "online",
        startDate: "",
        endDate: ""
      });

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleClassStatus(classItem, status) {
    clearFeedback();

    try {
      const response = await academyAPI.updateClassStatus(
        classItem._id,
        status
      );

      setMessage(response.message || "Estado da turma atualizado.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

    async function handleEnrollment(classItem) {
    clearFeedback();

    const amount = Number(classItem.course?.price?.amount || 0);

    if (amount <= 0) {
      try {
        const response = await academyAPI.enrollInClass(classItem._id, {});
        setMessage(response.message || "Inscrição realizada com sucesso.");
        await loadData();
      } catch (err) {
        setError(err.message || "Não foi possível realizar a inscrição.");
      }

      return;
    }

    try {
      const response = await academyAPI.getPaymentSettings();
      const settings = response.settings || {};

      setPaymentSettings({
        multicaixaExpress: {
          number: settings.multicaixaExpress?.number || "",
          holder: settings.multicaixaExpress?.holder || ""
        },
        bfa: {
          holder: settings.bfa?.holder || "",
          account: settings.bfa?.account || "",
          iban: settings.bfa?.iban || ""
        },
        instructions: settings.instructions || ""
      });

      setEnrollmentPaymentMethod("multicaixa_express");
      setEnrollmentPaymentConfirmed(false);
      setEnrollmentProof(null);
      setSelectedEnrollmentClass(classItem);
    } catch (err) {
      setError(err.message || "Não foi possível carregar os dados de pagamento.");
    }
  }
  async function handleActivateEnrollment(enrollmentId) {
    clearFeedback();

    try {
      const response = await academyAPI.activateEnrollment(enrollmentId);

      setMessage(response.message || "Inscrição ativada.");
      await loadData();
    } catch (err) {
      setError(err.message);
    }
  }

  // ATUALIZAR O PROGRESSO DE UMA INSCRIÇÃO
  function handleProgressUpdated(updatedEnrollment) {
    setEnrollments((current) =>
      current.map((item) =>
        item._id === updatedEnrollment._id
          ? updatedEnrollment
          : item
      )
    );
  }
    // AGENDAR AULA ONLINE
  async function handleCreateSession(event) {
    event.preventDefault();
    setSaving(true);
    clearFeedback();

    try {
      const response = await academyAPI.createLiveSession({
        ...sessionForm,
        scheduledStart: new Date(
          sessionForm.scheduledStart
        ).toISOString(),
        scheduledEnd: new Date(
          sessionForm.scheduledEnd
        ).toISOString()
      });

      setMessage(response.message || "Aula online agendada.");

      setSessionForm({
        title: "",
        description: "",
        class: "",
        scheduledStart: "",
        scheduledEnd: "",
        recordingEnabled: false
      });

      setShowForm(false);
      await loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleSubmitEnrollment(event) {
    event.preventDefault();

    if (!selectedEnrollmentClass) return;

    if (!enrollmentPaymentConfirmed) {
      setError("Confirma que já realizaste o pagamento.");
      return;
    }

    if (!enrollmentProof) {
      setError("Anexa o comprovativo do pagamento.");
      return;
    }

    setSaving(true);
    clearFeedback();

    try {
      const reader = new FileReader();

      const fileData = await new Promise((resolve, reject) => {
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error("Não foi possível ler o comprovativo."));
        reader.readAsDataURL(enrollmentProof);
      });

      const base64Data = String(fileData).split(",")[1];

      const response = await academyAPI.enrollInClass(
        selectedEnrollmentClass._id,
        {
          paymentConfirmed: true,
          paymentMethod: enrollmentPaymentMethod,
          proof: {
            originalName: enrollmentProof.name,
            mimeType: enrollmentProof.type,
            data: base64Data
          }
        }
      );

      setSelectedEnrollmentClass(null);
      setEnrollmentProof(null);
      setEnrollmentPaymentConfirmed(false);

      setMessage(
        response.message ||
        "Inscrição enviada. Aguarda a confirmação do pagamento."
      );

      await loadData();
    } catch (err) {
      setError(err.message || "Não foi possível enviar a inscrição.");
    } finally {
      setSaving(false);
    }
  }

  function renderEnrollmentModal() {
    if (!selectedEnrollmentClass) return null;

    const express = paymentSettings.multicaixaExpress;
    const bfa = paymentSettings.bfa;

    return (
      <div className="academy-modal-backdrop">
        <section className="academy-modal">
          <div className="academy-modal-heading">
            <div>
              <span>ALDAIR ONE ACADEMY</span>
              <h2>Inscrição na turma</h2>
              <p>{selectedEnrollmentClass.name}</p>
            </div>

            <button
              type="button"
              onClick={() => setSelectedEnrollmentClass(null)}
              aria-label="Fechar inscrição"
            >
              <X size={20} />
            </button>
          </div>

          <div>
            <p>Curso: <strong>{selectedEnrollmentClass.course?.title}</strong></p>
            <p>
              Valor a pagar:{" "}
              <strong>
                {formatPrice(selectedEnrollmentClass.course?.price)}
              </strong>
            </p>
          </div>

          <form onSubmit={handleSubmitEnrollment}>
            <label>Método de pagamento</label>

            <select
              value={enrollmentPaymentMethod}
              onChange={(event) =>
                setEnrollmentPaymentMethod(event.target.value)
              }
            >
              <option value="multicaixa_express">
                MULTICAIXA Express
              </option>
              <option value="bfa_transfer">
                Transferência bancária — BFA
              </option>
            </select>

            {enrollmentPaymentMethod === "multicaixa_express" && (
              <div className="academy-payment-details">
                <h3>Pagamento por MULTICAIXA Express</h3>
                <p>
                  Número: <strong>{express.number || "Não configurado"}</strong>
                </p>
                <p>
                  Titular: <strong>{express.holder || "Não configurado"}</strong>
                </p>
              </div>
            )}

            {enrollmentPaymentMethod === "bfa_transfer" && (
              <div className="academy-payment-details">
                <h3>Transferência bancária — BFA</h3>
                <p>
                  Titular: <strong>{bfa.holder || "Não configurado"}</strong>
                </p>
                <p>
                  Conta: <strong>{bfa.account || "Não configurada"}</strong>
                </p>
                <p>
                  IBAN: <strong>{bfa.iban || "Não configurado"}</strong>
                </p>
              </div>
            )}

            {paymentSettings.instructions && (
              <div className="academy-payment-details">
                <h3>Instruções</h3>
                <p>{paymentSettings.instructions}</p>
              </div>
            )}

            <label>Comprovativo de pagamento</label>
            <input
              type="file"
              accept=".pdf,image/jpeg,image/png"
              required
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (!file) {
                  setEnrollmentProof(null);
                  return;
                }

                const allowedTypes = [
                  "application/pdf",
                  "image/jpeg",
                  "image/png"
                ];

                if (!allowedTypes.includes(file.type)) {
                  setEnrollmentProof(null);
                  event.target.value = "";
                  setError("Anexa um PDF ou uma imagem JPG/PNG.");
                  return;
                }

                if (file.size > 5 * 1024 * 1024) {
                  setEnrollmentProof(null);
                  event.target.value = "";
                  setError("O comprovativo não pode ultrapassar 5 MB.");
                  return;
                }

                clearFeedback();
                setEnrollmentProof(file);
              }}
            />

            {enrollmentProof && (
              <p>
                Ficheiro selecionado: <strong>{enrollmentProof.name}</strong>
              </p>
            )}

            <label className="academy-checkbox-label">
              <input
                type="checkbox"
                checked={enrollmentPaymentConfirmed}
                onChange={(event) =>
                  setEnrollmentPaymentConfirmed(event.target.checked)
                }
              />
              Confirmo que já realizei o pagamento.
            </label>

            <button
              type="submit"
              disabled={saving || !enrollmentProof || !enrollmentPaymentConfirmed}
            >
              {saving ? "A enviar inscrição..." : "Enviar inscrição"}
            </button>
          </form>
        </section>
      </div>
    );
  }

  // ABRIR FORMULÁRIOS
  function renderForm() {
    if (!showForm) return null;

    return (
      <div className="academy-modal-backdrop">
        <section className="academy-modal">
          <div className="academy-modal-heading">
            <div>
              <span>ALDAIR ONE ACADEMY</span>
              <h2>
                {activeTab === "courses" && "Criar novo curso"}
                {activeTab === "classes" && "Criar nova turma"}
                {activeTab === "sessions" && "Agendar aula online"}
              </h2>
            </div>

            <button
              type="button"
              onClick={closeForm}
              aria-label="Fechar formulário"
            >
              <X size={20} />
            </button>
          </div>

          {activeTab === "courses" && (
            <form onSubmit={handleCreateCourse}>
              <label>Título do curso</label>
              <input
                required
                maxLength={150}
                value={courseForm.title}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    title: e.target.value
                  })
                }
                placeholder="Ex.: Programação JavaScript"
              />

              <label>Resumo</label>
              <input
                required
                maxLength={300}
                value={courseForm.summary}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    summary: e.target.value
                  })
                }
                placeholder="Breve apresentação do curso"
              />

              <label>Descrição completa</label>
              <textarea
                value={courseForm.description}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    description: e.target.value
                  })
                }
                placeholder="Conteúdo e objetivos do curso"
              />

              <label>Categoria</label>
              <input
                required
                value={courseForm.category}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    category: e.target.value
                  })
                }
                placeholder="Ex.: Tecnologia"
              />

              <div className="academy-form-grid">
                <div>
                  <label>Nível</label>
                  <select
                    value={courseForm.level}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        level: e.target.value
                      })
                    }
                  >
                    <option value="beginner">Iniciante</option>
                    <option value="intermediate">Intermédio</option>
                    <option value="advanced">Avançado</option>
                  </select>
                </div>

                <div>
                  <label>Preço (AOA)</label>
                  <input
                    type="number"
                    min="0"
                    value={courseForm.price}
                    onChange={(e) =>
                      setCourseForm({
                        ...courseForm,
                        price: e.target.value
                      })
                    }
                  />
                </div>
              </div>

              <label>Duração estimada (horas)</label>
              <input
                type="number"
                min="0"
                value={courseForm.durationHours}
                onChange={(e) =>
                  setCourseForm({
                    ...courseForm,
                    durationHours: e.target.value
                  })
                }
              />

              <button disabled={saving} type="submit">
                {saving ? "A criar..." : "Criar curso"}
              </button>
            </form>
          )}
                    {activeTab === "classes" && (
            <form onSubmit={handleCreateClass}>
              <label>Nome da turma</label>
              <input
                required
                value={classForm.name}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    name: e.target.value
                  })
                }
                placeholder="Ex.: Turma JavaScript 01"
              />

              <label>Descrição</label>
              <textarea
                value={classForm.description}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    description: e.target.value
                  })
                }
              />

              <label>Curso</label>
              <select
                required
                value={classForm.course}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    course: e.target.value
                  })
                }
              >
                <option value="">Seleciona um curso publicado</option>
                {courses
                  .filter((course) => course.status === "published")
                  .map((course) => (
                    <option key={course._id} value={course._id}>
                      {course.title}
                    </option>
                  ))}
              </select>

              <label>Formador</label>
              <select
                required
                value={classForm.instructor}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    instructor: e.target.value
                  })
                }
              >
                <option value="">Seleciona um formador</option>
                {instructors.map((instructor) => (
                  <option key={instructor._id} value={instructor._id}>
                    {instructor.name} — {instructor.email}
                  </option>
                ))}
              </select>

              <div className="academy-form-grid">
                <div>
                  <label>Capacidade de alunos</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={classForm.capacity}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        capacity: e.target.value
                      })
                    }
                  />
                </div>

                <div>
                  <label>Modalidade</label>
                  <select
                    value={classForm.modality}
                    onChange={(e) =>
                      setClassForm({
                        ...classForm,
                        modality: e.target.value
                      })
                    }
                  >
                    <option value="online">Online</option>
                    <option value="in_person">Presencial</option>
                    <option value="hybrid">Híbrida</option>
                  </select>
                </div>
              </div>

              <label>Data de início</label>
              <input
                type="date"
                required
                value={classForm.startDate}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    startDate: e.target.value
                  })
                }
              />

              <label>Data de término</label>
              <input
                type="date"
                required
                value={classForm.endDate}
                onChange={(e) =>
                  setClassForm({
                    ...classForm,
                    endDate: e.target.value
                  })
                }
              />

              <button disabled={saving} type="submit">
                {saving ? "A criar..." : "Criar turma"}
              </button>
            </form>
          )}

          {activeTab === "sessions" && (
            <form onSubmit={handleCreateSession}>
              <label>Título da aula</label>
              <input
                required
                value={sessionForm.title}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    title: e.target.value
                  })
                }
                placeholder="Ex.: Aula 01 — Introdução"
              />

              <label>Descrição</label>
              <textarea
                value={sessionForm.description}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    description: e.target.value
                  })
                }
              />

              <label>Turma</label>
              <select
                required
                value={sessionForm.class}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    class: e.target.value
                  })
                }
              >
                <option value="">Seleciona a turma</option>
                {classes.map((classItem) => (
                  <option key={classItem._id} value={classItem._id}>
                    {classItem.name}
                  </option>
                ))}
              </select>

              <label>Início da aula</label>
              <input
                type="datetime-local"
                required
                value={sessionForm.scheduledStart}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    scheduledStart: e.target.value
                  })
                }
              />

              <label>Fim da aula</label>
              <input
                type="datetime-local"
                required
                value={sessionForm.scheduledEnd}
                onChange={(e) =>
                  setSessionForm({
                    ...sessionForm,
                    scheduledEnd: e.target.value
                  })
                }
              />

              {(isAdmin || user?.role === "instructor") && (
                <label className="academy-checkbox-label">
                  <input
                    type="checkbox"
                    checked={sessionForm.recordingEnabled}
                    onChange={(e) =>
                      setSessionForm({
                        ...sessionForm,
                        recordingEnabled: e.target.checked
                      })
                    }
                  />
                  Permitir gravação desta aula
                </label>
              )}

              <button disabled={saving} type="submit">
                {saving ? "A agendar..." : "Agendar aula"}
              </button>
            </form>
          )}
        </section>
      </div>
    );
  }
    // LISTA DE ALUNOS DA TURMA
  function renderRoster() {
    if (!selectedRoster) return null;

    const rosterClass = selectedRoster.class;
    const statistics = selectedRoster.statistics;
    const roster = selectedRoster.enrollments || [];

    return (
      <div
        className="academy-modal-backdrop"
        onClick={(event) => {
          if (event.target === event.currentTarget) closeRoster();
        }}
      >
        <section
          className="academy-modal academy-roster-modal"
          role="dialog"
          aria-modal="true"
          aria-label="Lista de alunos da turma"
        >
          <div className="academy-modal-heading">
            <div>
              <span>ALDAIR ONE ACADEMY</span>
              <h2>Alunos da turma</h2>
              <p>{rosterClass?.name}</p>
            </div>

            <button
              type="button"
              onClick={closeRoster}
              aria-label="Fechar lista de alunos"
            >
              <X size={20} />
            </button>
          </div>

          {rosterLoading ? (
            <div className="academy-loading">
              <RefreshCw size={24} />
              <span>A carregar alunos...</span>
            </div>
          ) : rosterError ? (
            <div className="academy-alert error">
              <AlertCircle size={18} />
              {rosterError}
            </div>
          ) : (
            <>
              {statistics && (
                <div className="academy-roster-stats">
                  <div>
                    <strong>{statistics.active ?? 0}</strong>
                    <span>Ativos</span>
                  </div>
                  <div>
                    <strong>{statistics.pending ?? 0}</strong>
                    <span>Pendentes</span>
                  </div>
                  <div>
                    <strong>{statistics.completed ?? 0}</strong>
                    <span>Concluídos</span>
                  </div>
                  <div>
                    <strong>{statistics.cancelled ?? 0}</strong>
                    <span>Cancelados</span>
                  </div>
                  <div>
                    <strong>{statistics.available ?? 0}</strong>
                    <span>Vagas livres</span>
                  </div>
                </div>
              )}

              {roster.length === 0 ? (
                <div className="academy-empty">
                  <Users size={30} />
                  <strong>Esta turma ainda não tem inscrições.</strong>
                  <span>Os alunos inscritos aparecerão aqui.</span>
                </div>
              ) : (
                <div className="academy-roster-list">
                  {roster.map((enrollment) => (
                    <article
                      className="academy-roster-student"
                      key={enrollment._id}
                    >
                      <div className="academy-roster-avatar">
                        <GraduationCap size={21} />
                      </div>

                      <div className="academy-roster-info">
                        <strong>
                          {enrollment.student?.name || "Aluno sem nome"}
                        </strong>
                        <span>
                          <Mail size={13} />
                          {enrollment.student?.email || "Email não disponível"}
                        </span>
                        <small>
                          Inscrição: {formatDate(enrollment.enrolledAt)}
                        </small>
                      </div>

                      <span
                        className={`academy-status ${enrollment.status}`}
                      >
                        {statusLabel(enrollment.status)}
                      </span>
                    </article>
                  ))}
                </div>
              )}

              <div className="academy-roster-footer">
                <span>
                  {roster.length} inscrição(ões) registada(s)
                </span>
                <button type="button" onClick={closeRoster}>
                  Fechar
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    );
  }

  const tabs = [
    { id: "courses", label: "Cursos", icon: BookOpen },
    { id: "classes", label: "Turmas", icon: Users },
    { id: "enrollments", label: "Inscrições", icon: ClipboardList },
    { id: "sessions", label: "Aulas online", icon: Video },
    ...(isAdmin ? [{ id: "payments", label: "Pagamentos", icon: ClipboardList }] : [])
  ];

  return (
    <div className="academy-page">

      <div className="academy-header">
        <div>
          <span className="academy-eyebrow">
            APRENDIZAGEM · FORMAÇÃO · TECNOLOGIA
          </span>
          <h1>ALDAIR ONE Academy</h1>
          <p>
            Aprende, ensina e acompanha a tua evolução numa
            plataforma integrada.
          </p>
        </div>

        <div className="academy-header-icon">
          <GraduationCap size={36} />
        </div>
      </div>

      <div className="academy-role-info">
        <GraduationCap size={18} />
        <span>
          Acesso: <strong>{ROLE_LABELS[role] || "Utilizador"}</strong>
        </span>
      </div>

      {error && (
        <div className="academy-alert error">
          <AlertCircle size={18} />
          {error}
        </div>
      )}

      {message && (
        <div className="academy-alert success">
          <CheckCircle2 size={18} />
          {message}
        </div>
      )}

      <div className="academy-toolbar">
        <div className="academy-tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            return (
              <button
                key={tab.id}
                className={activeTab === tab.id ? "active" : ""}
                onClick={() => {
                  setActiveTab(tab.id);
                  setShowForm(false);
                  clearFeedback();
                }}
              >
                <Icon size={17} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <button
          className="academy-refresh"
          onClick={loadData}
          disabled={loading}
          title="Atualizar dados"
        >
          <RefreshCw size={17} />
        </button>
      </div>
            <div className="academy-section-heading">
        <div>
          <h2>
            {tabs.find((tab) => tab.id === activeTab)?.label}
          </h2>
          <p>
            {activeTab === "courses" &&
              "Explora os cursos disponíveis na Academia."}
            {activeTab === "classes" &&
              "Consulta as turmas, os alunos e acompanha as inscrições."}
            {activeTab === "enrollments" &&
              "Acompanha os pedidos e o estado das inscrições."}
            {activeTab === "sessions" && "Consulta e agenda sessões de videoconferência."}
            {activeTab === "payments" && "Define os dados bancários que os alunos verão ao solicitar inscrição."}
          </p>
        </div>

        {(
          (activeTab === "courses" && isAdmin) ||
          (activeTab === "classes" && isAdmin) ||
          (activeTab === "sessions" && canTeach)
        ) && (
          <button
            className="academy-primary-button"
            onClick={openForm}
          >
            <Plus size={18} />
            {activeTab === "courses" && "Novo curso"}
            {activeTab === "classes" && "Nova turma"}
            {activeTab === "sessions" && "Agendar aula"}
          </button>
        )}
      </div>

      {loading ? (
        <div className="academy-loading">
          <RefreshCw size={25} />
          <span>A carregar Academia...</span>
        </div>
      ) : (
        <>
          {activeTab === "payments" && isAdmin && (
            <section className="academy-modal" style={{ maxWidth: "760px", maxHeight: "none", margin: "0 auto" }}>
              <div className="academy-modal-heading"><div><span>ALDAIR ONE ACADEMY</span><h2>Dados para recebimento</h2></div></div>
              {paymentSettingsLoading ? <div className="academy-loading"><RefreshCw size={22} /><span>A carregar dados de pagamento...</span></div> : (
                <form onSubmit={handleSavePaymentSettings}>
                  <h3 style={{ color: "#ffffff", margin: "8px 0 2px" }}>Multicaixa Express</h3>
                  <label>Número associado ao Express</label>
                  <input type="text" inputMode="tel" maxLength={30} value={paymentSettings.multicaixaExpress.number} onChange={(event) => setPaymentSettings((current) => ({ ...current, multicaixaExpress: { ...current.multicaixaExpress, number: event.target.value } }))} placeholder="Ex.: 923 000 000" />
                  <label>Nome do titular do Express</label>
                  <input type="text" maxLength={120} value={paymentSettings.multicaixaExpress.holder} onChange={(event) => setPaymentSettings((current) => ({ ...current, multicaixaExpress: { ...current.multicaixaExpress, holder: event.target.value } }))} placeholder="Nome do titular" />
                  <h3 style={{ color: "#ffffff", margin: "18px 0 2px" }}>Transferência bancária — BFA</h3>
                  <label>Nome do titular da conta</label>
                  <input type="text" maxLength={120} value={paymentSettings.bfa.holder} onChange={(event) => setPaymentSettings((current) => ({ ...current, bfa: { ...current.bfa, holder: event.target.value } }))} placeholder="Nome do titular" />
                  <label>Número da conta</label>
                  <input type="text" maxLength={50} value={paymentSettings.bfa.account} onChange={(event) => setPaymentSettings((current) => ({ ...current, bfa: { ...current.bfa, account: event.target.value } }))} placeholder="Número da conta BFA" />
                  <label>IBAN</label>
                  <input type="text" maxLength={50} value={paymentSettings.bfa.iban} onChange={(event) => setPaymentSettings((current) => ({ ...current, bfa: { ...current.bfa, iban: event.target.value } }))} placeholder="AO06 ..." />
                  <label>Instruções para o aluno</label>
                  <textarea maxLength={1000} value={paymentSettings.instructions} onChange={(event) => setPaymentSettings((current) => ({ ...current, instructions: event.target.value }))} placeholder="Indica o nome e o curso na descrição do pagamento." />
                  <button disabled={saving} type="submit">{saving ? "A guardar..." : "Guardar dados de pagamento"}</button>
                </form>
              )}
            </section>
          )}

          {/* CURSOS */}
          {activeTab === "courses" && (
            <div className="academy-card-grid">
              {courses.length === 0 ? (
                <div className="academy-empty">
                  <BookOpen size={30} />
                  <strong>Ainda não existem cursos publicados.</strong>
                  <span>
                    Os cursos disponíveis serão apresentados aqui.
                  </span>
                </div>
              ) : (
                courses.map((course) => (
                  <article className="academy-course-card" key={course._id}>
                    <div className="academy-course-cover">
                      <GraduationCap size={31} />
                      <span>{course.category}</span>
                    </div>

                    <div className="academy-course-body">
                      <div className="academy-course-meta">
                        <span>{course.level || "Iniciante"}</span>
                        <strong>{formatPrice(course.price)}</strong>
                      </div>

                      <h3>{course.title}</h3>
                      <p>{course.summary}</p>

                      <div className="academy-card-footer">
                        <span>
                          <Clock size={15} />
                          {course.durationHours || 0} horas
                        </span>

                        {isAdmin && (
                          <button
                            onClick={() => handlePublishCourse(course)}
                          >
                            {course.status === "published"
                              ? "Retirar publicação"
                              : "Publicar"}
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* TURMAS */}
          {activeTab === "classes" && (
            <div className="academy-list">
              {classes.length === 0 ? (
                <div className="academy-empty">
                  <Users size={30} />
                  <strong>Nenhuma turma disponível.</strong>
                  <span>
                    As turmas associadas à tua conta aparecerão aqui.
                  </span>
                </div>
              ) : (
                classes.map((classItem) => (
                  <article className="academy-list-card" key={classItem._id}>
                    <div className="academy-list-icon">
                      <Users size={24} />
                    </div>

                    <div className="academy-list-main">
                      <h3>{classItem.name}</h3>
                      <p>{classItem.course?.title || "Curso"}</p>

                      <div className="academy-list-details">
                        <span>
                          <GraduationCap size={14} />
                          {classItem.instructor?.name || "Formador"}
                        </span>
                        <span>
                          <CalendarDays size={14} />
                          {formatDate(classItem.startDate)}
                        </span>
                        <span>
                          <Users size={14} />
                          {classItem.students?.length || 0}/
                          {classItem.capacity} alunos
                        </span>
                      </div>
                    </div>

                    <div className="academy-list-actions">
                      <span className={`academy-status ${classItem.status}`}>
                        {classItem.status}
                      </span>

                      {canTeach && (
                        <button
                          type="button"
                          onClick={() => handleViewRoster(classItem)}
                        >
                          <Eye size={15} />
                          Ver alunos
                        </button>
                      )}

                                            {isStudent && classItem.status === "open" && (
                        <button
                          onClick={() => handleEnrollment(classItem)}
                        >
                          Inscrever-me
                        </button>
                      )}
                      {isAdmin && (
                        <select
                          value={classItem.status}
                          onChange={(e) =>
                            handleClassStatus(classItem, e.target.value)
                          }
                                                    
                          aria-label={`Estado de ${classItem.name}`}
                        >
                          <option value="draft">Rascunho</option>
                          <option value="open">Inscrições abertas</option>
                          <option value="in_progress">Em andamento</option>
                          <option value="completed">Concluída</option>
                          <option value="cancelled">Cancelada</option>
                        </select>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          )}

          {/* INSCRIÇÕES */}
          {activeTab === "enrollments" && (
            <div className="academy-list">
              {enrollments.length === 0 ? (
                <div className="academy-empty">
                  <ClipboardList size={30} />
                  <strong>Ainda não existem inscrições.</strong>
                  <span>
                    Os pedidos de inscrição serão apresentados aqui.
                  </span>
                </div>
              ) : (
                enrollments.map((enrollment) => (
                  <article
                    className="academy-list-card"
                    key={enrollment._id}
                  >
                    <div className="academy-list-icon">
                      <ClipboardList size={23} />
                    </div>

                    <div className="academy-list-main">
                      <h3>
                        {enrollment.course?.title || "Curso"}
                      </h3>
                      <p>
                        {enrollment.class?.name || "Turma"} ·{" "}
                        {enrollment.student?.name || "Aluno"}
                      </p>
                      <div className="academy-list-details">
                        <span>
                          <CalendarDays size={14} />
                          {formatDate(enrollment.enrolledAt)}
                        </span>
                        <span>
                          {formatPrice({
                            amount: enrollment.payment?.amount,
                            currency: enrollment.payment?.currency
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="academy-list-actions">
                      <span
                        className={`academy-status ${enrollment.status}`}
                      >
                        {enrollment.status}
                      </span>

                      {isAdmin && enrollment.status === "pending" && (
                        <button
                          onClick={() =>
                            handleActivateEnrollment(enrollment._id)
                          }
                        >
                          Ativar inscrição
                        </button>
                      )}
                    </div>

                    {isStudent &&
                      ["active", "completed"].includes(enrollment.status) && (
                        <StudentProgress
                          enrollment={enrollment}
                          onUpdated={handleProgressUpdated}
                        />
                      )}
                  </article>
                ))
              )}
            </div>
          )}

          {/* AULAS ONLINE E VIDEOCONFERÊNCIA */}
          {activeTab === "sessions" && (
            <div className="academy-list">
              {sessions.length === 0 ? (
                <div className="academy-empty">
                  <Video size={30} />
                  <strong>Nenhuma aula online agendada.</strong>
                  <span>
                    As próximas sessões aparecerão nesta área.
                  </span>
                </div>
              ) : (
                sessions.map((session) => (
                  <article
                    className="academy-session-card"
                    key={session._id}
                  >
                    <div className="academy-session-icon">
                      <Video size={25} />
                    </div>

                    <div className="academy-session-content">
                      <span className="academy-session-label">
                        VIDEOCONFERÊNCIA
                      </span>
                      <h3>{session.title}</h3>
                      <p>
                        {session.class?.name || "Turma"} ·{" "}
                        {session.instructor?.name || "Formador"}
                      </p>

                      <div className="academy-list-details">
                        <span>
                          <CalendarDays size={14} />
                          {formatDateTime(session.scheduledStart)}
                        </span>
                        <span>
                          <Clock size={14} />
                          {formatDateTime(session.scheduledEnd)}
                        </span>
                      </div>
                    </div>

                    <div className="academy-list-actions">
                      <span className={`academy-status ${session.status}`}>
                        {session.status}
                      </span>

                      <button
                        className="academy-join-disabled"
                        type="button"
                        disabled={
                          !(
                            (canTeach &&
                              ["scheduled", "live"].includes(session.status)) ||
                            (isStudent && session.status === "live")
                          )
                        }
                        onClick={() => setSelectedSession(session)}
                        title={
                          session.status === "scheduled"
                            ? "Iniciar esta aula"
                            : session.status === "live"
                              ? "Entrar na videoconferência"
                              : "Esta aula ainda não está disponível"
                        }
                      >
                        <Video size={15} />
                        {canTeach && session.status === "scheduled"
                          ? "Iniciar aula"
                          : session.status === "live"
                            ? "Entrar na sala"
                            : "Sala indisponível"}
                      </button>
                    </div>
                  </article>
                ))
              )}
            </div>
          )}
        </>
      )}

      <div className="academy-security-note">
        <Lock size={16} />
        <span>
          As inscrições, permissões e salas de videoconferência
          são controladas pelo servidor.
        </span>
      </div>

            {renderForm()}
      {renderEnrollmentModal()}
      {renderRoster()}

      {/* SALA DE VIDEOCONFERÊNCIA LIVEKIT */}
      {selectedSession && (
        <LiveRoom
          session={selectedSession}
          canManage={canTeach}
          onClose={() => setSelectedSession(null)}
          onEnded={loadData}
        />
      )}
    </div>
  );
}

export default Academy;
