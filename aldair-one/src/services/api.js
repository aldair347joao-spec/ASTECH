
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

export default apiRequest;
