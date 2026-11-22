
import { useState } from "react";
import {
  BookOpen,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  Loader2,
  RefreshCw,
  AlertCircle
} from "lucide-react";

import { academyAPI } from "../services/api";

function StudentProgress({ enrollment, onUpdated }) {
  const [course, setCourse] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [savingLesson, setSavingLesson] = useState("");
  const [error, setError] = useState("");

  const [localProgress, setLocalProgress] = useState(
    enrollment.progress || {
      percentage: 0,
      completedLessons: []
    }
  );

  const completedIds = new Set(
    (localProgress.completedLessons || []).map((item) =>
      String(typeof item === "object" ? item._id : item)
    )
  );

  const publishedLessons = (course?.modules || []).flatMap((module) =>
    (module.lessons || [])
      .filter((lesson) => lesson.isPublished === true)
      .map((lesson) => ({
        ...lesson,
        moduleTitle: module.title
      }))
  );

  async function handleOpen() {
    if (expanded) {
      setExpanded(false);
      return;
    }

    if (course) {
      setExpanded(true);
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response = await academyAPI.getCourse(
        enrollment.course?._id || enrollment.course
      );

      setCourse(response.course);
      setExpanded(true);
    } catch (err) {
      setError(
        err.message || "Não foi possível carregar as aulas do curso."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCompleteLesson(lessonId) {
    if (!lessonId || completedIds.has(String(lessonId))) {
      return;
    }

    setSavingLesson(String(lessonId));
    setError("");

    try {
      const response = await academyAPI.updateEnrollmentProgress(
        enrollment._id,
        lessonId
      );

      const nextCompletedIds = [
        ...completedIds,
        String(lessonId)
      ];

      const nextProgress = {
        ...localProgress,
        percentage: response.progress.percentage,
        completedLessons: nextCompletedIds,
        lastAccessedAt: response.progress.lastAccessedAt
      };

      setLocalProgress(nextProgress);

      if (onUpdated) {
        onUpdated({
          ...enrollment,
          status: response.enrollmentStatus,
          progress: nextProgress
        });
      }
    } catch (err) {
      setError(
        err.message || "Não foi possível atualizar o progresso."
      );
    } finally {
      setSavingLesson("");
    }
  }

  const percentage = Math.min(
    100,
    Math.max(0, Number(localProgress.percentage || 0))
  );

  return (
    <section className="student-progress">
      <div className="student-progress-summary">
        <div className="student-progress-main">
          <div className="student-progress-icon">
            <BookOpen size={20} />
          </div>

          <div className="student-progress-info">
            <strong>Progresso da aprendizagem</strong>

            <span>
              {percentage}% concluído
            </span>
          </div>
        </div>

        <div className="student-progress-action">
          <div className="student-progress-bar">
            <div
              className="student-progress-bar-fill"
              style={{ width: `${percentage}%` }}
            />
          </div>

          <button
            type="button"
            onClick={handleOpen}
            disabled={loading}
          >
            {loading ? (
              <Loader2 size={16} className="student-progress-spin" />
            ) : expanded ? (
              <ChevronUp size={16} />
            ) : (
              <ChevronDown size={16} />
            )}

            {loading
              ? "A carregar..."
              : expanded
                ? "Fechar aulas"
                : "Ver aulas"}
          </button>
        </div>
      </div>

      {error && (
        <div className="student-progress-error">
          <AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {expanded && (
        <div className="student-progress-lessons">
          {!course ? (
            <div className="student-progress-loading">
              <RefreshCw size={18} />
              A carregar conteúdo...
            </div>
          ) : publishedLessons.length === 0 ? (
            <div className="student-progress-empty">
              Ainda não existem aulas publicadas neste curso.
            </div>
          ) : (
            <>
              <div className="student-progress-lessons-heading">
                <strong>Conteúdo do curso</strong>

                <span>
                  {completedIds.size} de {publishedLessons.length} aulas
                </span>
              </div>

              {publishedLessons.map((lesson) => {
                const lessonId = String(lesson._id);
                const completed = completedIds.has(lessonId);
                const saving = savingLesson === lessonId;

                return (
                  <article
                    className="student-progress-lesson"
                    key={lessonId}
                  >
                    <div className="student-progress-lesson-info">
                      <div className="student-progress-lesson-status">
                        {completed ? (
                          <CheckCircle2 size={20} />
                        ) : (
                          <Circle size={20} />
                        )}
                      </div>

                      <div>
                        <strong>{lesson.title}</strong>

                        <span>{lesson.moduleTitle}</span>

                        {lesson.durationMinutes > 0 && (
                          <small>
                            {lesson.durationMinutes} minutos
                          </small>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className={
                        completed
                          ? "student-progress-completed"
                          : "student-progress-complete-button"
                      }
                      disabled={completed || Boolean(savingLesson)}
                      onClick={() =>
                        handleCompleteLesson(lessonId)
                      }
                    >
                      {saving ? (
                        <Loader2
                          size={15}
                          className="student-progress-spin"
                        />
                      ) : completed ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Circle size={15} />
                      )}

                      {completed
                        ? "Concluída"
                        : saving
                          ? "A guardar..."
                          : "Marcar concluída"}
                    </button>
                  </article>
                );
              })}
            </>
          )}
        </div>
      )}
    </section>
  );
}

export default StudentProgress;
