
const API_BASE_URL = "http://localhost:3000/api";

let refreshPromise = null;

async function refreshAdminAccessToken() {
  const refreshToken = sessionStorage.getItem(
    "shopora_admin_refresh_token"
  );

  if (!refreshToken) {
    throw new Error("Admin session expired. Please log in again.");
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const response = await fetch(
        `${API_BASE_URL}/admin/auth/refresh`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ refreshToken }),
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.accessToken) {
        throw new Error(
          data.message || "Session expired. Please log in again."
        );
      }

      sessionStorage.setItem(
        "shopora_admin_access_token",
        data.accessToken
      );

      return data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function adminApi(endpoint, options = {}) {
  const isFormData =
    typeof FormData !== "undefined" &&
    options.body instanceof FormData;

  async function sendRequest(token) {
    const headers = {
      ...(isFormData
        ? {}
        : { "Content-Type": "application/json" }),
      ...(options.headers || {}),
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      credentials: "include",
      headers,
    });
  }

  let token = sessionStorage.getItem(
    "shopora_admin_access_token"
  );

  let response = await sendRequest(token);

  // If the access token expired, refresh it and retry once.
  if (response.status === 401 && token) {
    try {
      token = await refreshAdminAccessToken();
      response = await sendRequest(token);
    } catch (error) {
      sessionStorage.removeItem("shopora_admin_access_token");
      sessionStorage.removeItem("shopora_admin_refresh_token");
      sessionStorage.removeItem("shopora_admin_user");

      throw new Error(
        error.message || "Session expired. Please log in again."
      );
    }
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(
      data.message || data.error || "API request failed"
    );
  }

  return data;
}
