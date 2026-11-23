
const API_URL = (
  import.meta.env.VITE_API_URL ||
  "https://astech-l7vb.onrender.com"
).replace(/\/+$/, "");

const TOKEN_KEY = "aldair_one_token";

export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function saveToken(token) {
  if (!token) return;
  sessionStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  sessionStorage.removeItem(TOKEN_KEY);
}

export async function apiRequest(path, options = {}) {
  const token = getToken();

  const headers = {
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers
    });
  } catch {
    throw new Error(
      "Não foi possível contactar o servidor. Verifica a tua ligação."
    );
  }

  const contentType = response.headers.get("content-type") || "";
  let data;

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    data = {
      success: false,
      message: "O servidor devolveu uma resposta inválida."
    };
  }

  if (!response.ok) {
    if (response.status === 401) {
      clearToken();
    }

    throw new Error(
      data.message || `Erro na comunicação (${response.status}).`
    );
  }

  return data;
}

function buildQuery(filters = {}) {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, String(value));
    }
  });

  const query = params.toString();
  return query ? `?${query}` : "";
}

// ==========================================
// AUTENTICAÇÃO
// ==========================================

export const authAPI = {
  register: async (userData) => {
    const data = await apiRequest("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(userData)
    });

    if (data.token) saveToken(data.token);
    return data;
  },

  registerSuperAdmin: async (setupData) => {
    const data = await apiRequest(
      "/api/auth/setup/super-admin/register",
      {
        method: "POST",
        body: JSON.stringify(setupData)
      }
    );

    if (data.token) saveToken(data.token);
    return data;
  },

  activateSuperAdmin: async (setupKey) => {
    const data = await apiRequest(
      "/api/auth/setup/super-admin/activate",
      {
        method: "POST",
        body: JSON.stringify({ setupKey })
      }
    );

    if (data.token) saveToken(data.token);
    return data;
  },

  login: async (credentials) => {
    const data = await apiRequest("/api/auth/login", {
      method: "POST",
      body: JSON.stringify(credentials)
    });

    if (data.token) saveToken(data.token);
    return data;
  },

  me: () => apiRequest("/api/auth/me"),

  logout: () => {
    clearToken();
  }
};

// ==========================================
// ADMINISTRAÇÃO
// ==========================================

export const adminAPI = {
  getOverview: () =>
    apiRequest("/api/admin/overview"),

  getUsers: (filters = {}) =>
    apiRequest(`/api/admin/users${buildQuery(filters)}`),

  updateUserStatus: (userId, isActive) =>
    apiRequest(
      `/api/admin/users/${encodeURIComponent(userId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ isActive })
      }
    ),

  updateUserRole: (userId, role) =>
    apiRequest(
      `/api/admin/users/${encodeURIComponent(userId)}/role`,
      {
        method: "PATCH",
        body: JSON.stringify({ role })
      }
    )
};

// ==========================================
// ACADEMIA
// ==========================================

export const academyAPI = {
  // CURSOS

  getCourses: (filters = {}) =>
    apiRequest(`/api/academy/courses${buildQuery(filters)}`),

  getCourse: (courseId) =>
    apiRequest(
      `/api/academy/courses/${encodeURIComponent(courseId)}`
    ),

  createCourse: (courseData) =>
    apiRequest("/api/academy/courses", {
      method: "POST",
      body: JSON.stringify(courseData)
    }),

  updateCourse: (courseId, courseData) =>
    apiRequest(
      `/api/academy/courses/${encodeURIComponent(courseId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(courseData)
      }
    ),

  updateCourseStatus: (courseId, status) =>
    apiRequest(
      `/api/academy/courses/${encodeURIComponent(courseId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status })
      }
    ),

  // TURMAS

  getClasses: (filters = {}) =>
    apiRequest(`/api/academy/classes${buildQuery(filters)}`),

  getClassRoster: (classId) =>
    apiRequest(
      `/api/academy/classes/${encodeURIComponent(classId)}/roster`
    ),

  createClass: (classData) =>
    apiRequest("/api/academy/classes", {
      method: "POST",
      body: JSON.stringify(classData)
    }),

  updateClass: (classId, classData) =>
    apiRequest(
      `/api/academy/classes/${encodeURIComponent(classId)}`,
      {
        method: "PATCH",
        body: JSON.stringify(classData)
      }
    ),

  updateClassStatus: (classId, status) =>
    apiRequest(
      `/api/academy/classes/${encodeURIComponent(classId)}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({ status })
      }
    ),

  enrollInClass: (classId) =>
    apiRequest(
      `/api/academy/classes/${encodeURIComponent(classId)}/enroll`,
      {
        method: "POST"
      }
    ),

  // INSCRIÇÕES

  getEnrollments: (filters = {}) =>
    apiRequest(
      `/api/academy/enrollments${buildQuery(filters)}`
    ),

  activateEnrollment: (enrollmentId) =>
    apiRequest(
      `/api/academy/enrollments/${encodeURIComponent(enrollmentId)}/activate`,
      {
        method: "PATCH"
      }
    ),

  // CONFIGURAÇÃO DE PAGAMENTOS

  getPaymentSettings: () =>
    apiRequest("/api/academy/payment-settings"),

  updatePaymentSettings: (settings) =>
    apiRequest("/api/academy/payment-settings", {
      method: "PATCH",
      body: JSON.stringify(settings)
    }),

  // PROGRESSO

  updateEnrollmentProgress: (enrollmentId, lessonId) =>
    apiRequest(
      `/api/academy/enrollments/${encodeURIComponent(enrollmentId)}/progress`,
      {
        method: "PATCH",
        body: JSON.stringify({ lessonId })
      }
    ),

  // AULAS ONLINE

  getLiveSessions: (filters = {}) =>
    apiRequest(
      `/api/academy/live-sessions${buildQuery(filters)}`
    ),

  createLiveSession: (sessionData) =>
    apiRequest("/api/academy/live-sessions", {
      method: "POST",
      body: JSON.stringify(sessionData)
    })
};

// ==========================================
// LIVEKIT - VIDEOCONFERÊNCIA E GRAVAÇÕES
// ==========================================

export const livekitAPI = {
  startSession: (sessionId) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/start`,
      {
        method: "POST"
      }
    ),

  startRecording: (sessionId) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/recording/start`,
      {
        method: "POST"
      }
    ),

  getAccessToken: (sessionId) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/token`,
      {
        method: "POST"
      }
    ),

  endSession: (sessionId) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/end`,
      {
        method: "POST"
      }
    ),

  getParticipants: (sessionId) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/participants`
    ),

  muteParticipant: (sessionId, identity, trackSid, muted) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(identity)}/mute`,
      {
        method: "POST",
        body: JSON.stringify({
          trackSid,
          muted
        })
      }
    ),

  removeParticipant: (sessionId, identity) =>
    apiRequest(
      `/api/livekit/sessions/${encodeURIComponent(sessionId)}/participants/${encodeURIComponent(identity)}`,
      {
        method: "DELETE"
      }
    )
};

export default apiRequest;
