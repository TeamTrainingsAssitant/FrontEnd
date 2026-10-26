function translateApiError(message) {
  return {
    "Email or password invalid.": "E-Mail oder Passwort ist ungültig.",
    "Password wrong.": "E-Mail oder Passwort ist falsch.",
    "Email already registered.": "Diese E-Mail-Adresse ist bereits registriert.",
    "Username missing.": "Bitte einen Benutzernamen eingeben.",
    "Not authenticated.": "Die Anmeldung ist abgelaufen. Bitte erneut einloggen.",
    "Invalid request.": "Die Anfrage ist ungültig."
  }[message] || message;
}

async function requestJson(endpoint, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const token = sessionStorage.getItem("powerLevelToken");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json")
    ? await response.json()
    : await response.text();

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload.message
      ? payload.message
      : "Die Anfrage konnte nicht verarbeitet werden.";
    throw new Error(translateApiError(message));
  }

  return payload;
}

const loginForm = document.querySelector("#login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const email = document.querySelector("#login-name").value.trim();
    const password = document.querySelector("#login-password").value;
    const message = document.querySelector("#login-message");

    if (!email || !password) {
      message.textContent = "Bitte E-Mail und Passwort eingeben.";
      return;
    }

    message.textContent = "Anmeldung läuft …";
    try {
      const result = await requestJson("/auth", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      sessionStorage.setItem("powerLevelUser", email);
      sessionStorage.setItem("powerLevelToken", result.token);
      window.location.href = "Homepage.html";
    } catch (error) {
      message.textContent = error.message === "Failed to fetch"
        ? "Backend nicht erreichbar. Bitte später erneut versuchen."
        : (error.message || "Login fehlgeschlagen.");
    }
  });
}

const registerForm = document.querySelector("#register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    const username = document.querySelector("#register-name").value.trim();
    const email = document.querySelector("#register-email").value.trim();
    const password = document.querySelector("#register-password").value;
    const confirmation = document.querySelector("#register-password-confirm").value;
    const message = document.querySelector("#register-message");

    if (!username || !email || !password) {
      message.textContent = "Bitte alle Felder ausfüllen.";
      return;
    }

    if (password !== confirmation) {
      message.textContent = "Die Passwörter stimmen nicht überein.";
      return;
    }

    message.textContent = "Registrierung läuft …";
    try {
      await requestJson("/users", {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });
      message.textContent = "Registrierung erfolgreich. Du wirst weitergeleitet …";
      setTimeout(() => {
        window.location.href = "LogIn.html";
      }, 1200);
    } catch (error) {
      message.textContent = error.message === "Failed to fetch"
        ? "Backend nicht erreichbar. Bitte zuerst das Backend starten."
        : (error.message || "Registrierung fehlgeschlagen.");
    }
  });
}
