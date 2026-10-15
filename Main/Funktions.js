function initializeTrainingApp() {
  if (!document.querySelector(".app-main")) return;
    const userName = sessionStorage.getItem("powerLevelUser");
    const authToken = sessionStorage.getItem("powerLevelToken");
    if (!userName || !authToken) {
      window.location.replace("LogIn.html");
      return;
    }

    const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[character]);
    let exercises = [];
    let exerciseLoadError = "";
    let plans = [];
    let profile = { displayName: userName || "Athlet", goal: "" };
    let planLoadError = "";

    async function loadPlans() {
      if (authToken === LOCAL_ADMIN_TOKEN) {
        plans = [];
        return;
      }

      try {
        plans = await requestJson("/plans");
      } catch (error) {
        plans = [];
        planLoadError = error.message || "TrainingsplÃƒÆ’Ã‚Â¤ne konnten nicht geladen werden.";
      }
    }

    async function loadProfile() {
      if (authToken === LOCAL_ADMIN_TOKEN) return;

      try {
        const user = await requestJson("/users/me");
        profile = { displayName: user.username || user.email, goal: "" };
      } catch (error) {
        document.querySelector("#profile-message").textContent =
          error.message || "Profil konnte nicht geladen werden.";
      }
    }

    function updateIdentity() {
      const name = profile.displayName || userName || "Athlet";
      document.querySelector("#current-user").textContent = name;
      document.querySelector("#greeting-name").textContent = name;
      document.querySelector("#profile-name").textContent = name;
      document.querySelector("#profile-goal").textContent = profile.goal || "Trainingsziel noch offen";
      document.querySelector("#user-avatar").textContent = name.slice(0, 1);
      document.querySelector("#profile-avatar").textContent = name.slice(0, 1);
      document.querySelector("#profile-display-name").value = profile.displayName || userName || "";
      document.querySelector("#profile-training-goal").value = profile.goal || "";
    }

    function renderOverviewStats() {
      document.querySelector("#stat-plans").textContent = plans.length;
    }

    function renderPlans() {
      const planGrid = document.querySelector("#plan-grid");
      if (plans.length === 0) {
        planGrid.innerHTML = `<p class="empty-state plans-empty">${escapeHtml(planLoadError || "Du hast noch keine TrainingsplÃƒÆ’Ã‚Â¤ne angelegt.")}</p>`;
        return;
      }

      planGrid.innerHTML = plans.map((plan) => `
        <article class="plan-card">
          <h3>${escapeHtml(plan.name)}</h3>
          <p>${escapeHtml(plan.description || "Keine Beschreibung hinterlegt.")}</p>
          <span class="plan-meta">${escapeHtml(plan.exerciseCount || 0)} ÃƒÆ’Ã…â€œbungen</span>
          <div class="plan-actions">
            <button class="plan-delete-button" type="button" data-delete-plan="${escapeHtml(plan.id)}">LÃƒÆ’Ã‚Â¶schen</button>
          </div>
        </article>
      `).join("");
    }

    async function loadExercises(query = "") {
      const exerciseGrid = document.querySelector("#exercise-grid");
      exerciseGrid.innerHTML = '<p class="empty-state">ÃƒÆ’Ã…â€œbungen werden geladen ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</p>';
      exerciseLoadError = "";
      try {
        const parameter = encodeURIComponent(query.trim());
        exercises = await requestJson(`/exercises?name=${parameter}&limit=20`);
        renderExercises();
      } catch (error) {
        exercises = [];
        exerciseLoadError = error.message || "ÃƒÆ’Ã…â€œbungen konnten nicht geladen werden.";
        renderExercises();
      }
    }

    function renderExercises() {
      document.querySelector("#exercise-grid").innerHTML = exercises.map((exercise) => `
        <article class="exercise-item">
          ${exercise.gifUrl ? `<img src="${escapeHtml(exercise.gifUrl)}" alt="" loading="lazy">` : ""}
          <strong>${escapeHtml(exercise.name)}</strong>
          <span>${escapeHtml((exercise.primaryMuscleGroups || []).join(" Ãƒâ€šÃ‚Â· ") || "Muskelgruppe nicht angegeben")}</span>
          <small>${escapeHtml((exercise.secondaryMuscleGroups || []).join(" Ãƒâ€šÃ‚Â· "))}</small>
        </article>
      `).join("") || `<p class="empty-state">${escapeHtml(exerciseLoadError || "Keine passende ÃƒÆ’Ã…â€œbung gefunden.")}</p>`;
    }

    function renderAll() {
      updateIdentity();
      renderOverviewStats();
      renderPlans();
      renderExercises();
    }

    function setView(viewName) {
      document.querySelectorAll(".app-view").forEach((view) => {
        view.hidden = view.id !== `view-${viewName}`;
      });
      document.querySelectorAll(".nav-item").forEach((item) => {
        if (item.dataset.viewTarget === viewName) item.setAttribute("aria-current", "page");
        else item.removeAttribute("aria-current");
      });
      closeMenu();
      window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const sideMenu = document.querySelector("#side-menu");
    const backdrop = document.querySelector("#menu-backdrop");
    const menuToggle = document.querySelector("#menu-toggle");

    function openMenu() {
      sideMenu.hidden = false;
      backdrop.hidden = false;
      menuToggle.setAttribute("aria-expanded", "true");
      document.querySelector("#menu-close").focus();
    }

    function closeMenu() {
      sideMenu.hidden = true;
      backdrop.hidden = true;
      menuToggle.setAttribute("aria-expanded", "false");
    }

    menuToggle.addEventListener("click", openMenu);
    document.querySelector("#menu-close").addEventListener("click", closeMenu);
    backdrop.addEventListener("click", closeMenu);
    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape" && !sideMenu.hidden) {
        closeMenu();
        menuToggle.focus();
      }
    });

    document.querySelectorAll("[data-view-target]").forEach((item) => {
      item.addEventListener("click", () => setView(item.dataset.viewTarget));
    });
    document.querySelectorAll("[data-open-view]").forEach((item) => {
      item.addEventListener("click", () => setView(item.dataset.openView));
    });

    document.querySelector("#plan-grid").addEventListener("click", async (event) => {
      const deleteButton = event.target.closest("[data-delete-plan]");
      if (deleteButton) {
        const plan = plans.find((item) => item.id === deleteButton.dataset.deletePlan);
        if (!plan || !window.confirm(`MÃƒÆ’Ã‚Â¶chtest du den Trainingsplan ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¾${plan.name}ÃƒÂ¢Ã¢â€šÂ¬Ã…â€œ wirklich lÃƒÆ’Ã‚Â¶schen?`)) return;
        try {
          await requestJson(`/plans/${plan.id}`, { method: "DELETE" });
          plans = plans.filter((item) => item.id !== plan.id);
          renderPlans();
          renderOverviewStats();
        } catch (error) {
          document.querySelector("#create-message").textContent =
            error.message || "Trainingsplan konnte nicht gelÃƒÆ’Ã‚Â¶scht werden.";
        }
        return;
      }
    });

    document.querySelector("#create-form").addEventListener("submit", async (event) => {
      event.preventDefault();
      const message = document.querySelector("#create-message");

      const form = new FormData(event.currentTarget);
      const name = String(form.get("name")).trim();
      const focus = String(form.get("focus"));

      try {
        const plan = await requestJson("/plans", {
          method: "POST",
          body: JSON.stringify({ name, description: focus })
        });
        plans.unshift({ ...plan, exerciseCount: 0 });
        renderPlans();
        renderOverviewStats();
        event.currentTarget.reset();
        message.textContent = "Trainingsplan gespeichert.";
      } catch (error) {
        message.textContent = error.message || "Trainingsplan konnte nicht gespeichert werden.";
      }
    });

    document.querySelector("#exercise-search").addEventListener("input", (event) => loadExercises(event.target.value));
    document.querySelector("#logout-button").addEventListener("click", async () => {
      const token = sessionStorage.getItem("powerLevelToken");
      if (token) {
        try {
          await requestJson("/auth", {
            method: "DELETE",
            body: JSON.stringify({ token })
          });
        } catch (error) {
          console.warn("Logout-Token konnte nicht auf dem Server deaktiviert werden:", error.message);
        }
      }

      sessionStorage.removeItem("powerLevelUser");
      sessionStorage.removeItem("powerLevelToken");
      window.location.href = "LogIn.html";
    });

    if (userName) {
      loadPlans().then(loadProfile).then(async () => {
        renderAll();
        await loadExercises();
      });
    }

}

const API_BASE_URL = (window.API_BASE_URL || "http://localhost:8080/api/v1").replace(/\/$/, "");
const LOCAL_ADMIN_EMAIL = "admin";
const LOCAL_ADMIN_PASSWORD = "admin123";
const LOCAL_ADMIN_TOKEN = "local-admin";

function translateApiError(message) {
  return {
    "Email or password invalid.": "E-Mail oder Passwort ist ungÃƒÆ’Ã‚Â¼ltig.",
    "Password wrong.": "E-Mail oder Passwort ist falsch.",
    "Email already registered.": "Diese E-Mail-Adresse ist bereits registriert.",
    "Username missing.": "Bitte einen Benutzernamen eingeben.",
    "Not authenticated.": "Die Anmeldung ist abgelaufen. Bitte erneut einloggen.",
    "Plan not found.": "Trainingsplan nicht gefunden.",
    "Invalid request.": "Die Anfrage ist ungÃƒÆ’Ã‚Â¼ltig."
  }[message] || message;
}

async function requestJson(endpoint, options = {}) {
  const { headers = {}, ...fetchOptions } = options;
  const token = sessionStorage.getItem("powerLevelToken");
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...fetchOptions,
    headers: {
      "Content-Type": "application/json",
      ...(token && token !== LOCAL_ADMIN_TOKEN ? { Authorization: "Bearer " + token } : {}),
      ...headers
    }
  });

  const contentType = response.headers.get("content-type") || "";
  const payload = contentType.includes("application/json") ? await response.json() : await response.text();

  if (!response.ok) {
    const message = payload && typeof payload === "object" && payload.message ? payload.message : "Die Anfrage konnte nicht verarbeitet werden.";
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

    if (email === LOCAL_ADMIN_EMAIL && password === LOCAL_ADMIN_PASSWORD) {
      sessionStorage.setItem("powerLevelUser", LOCAL_ADMIN_EMAIL);
      sessionStorage.setItem("powerLevelToken", LOCAL_ADMIN_TOKEN);
      window.location.href = "Homepage.html";
      return;
    }

    message.textContent = "Anmeldung lÃƒÆ’Ã‚Â¤uft...";

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
        ? "Backend nicht erreichbar. Bitte Backend starten oder den lokalen Admin verwenden."
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
      message.textContent = "Bitte alle Felder ausfÃƒÆ’Ã‚Â¼llen.";
      return;
    }

    if (password !== confirmation) {
      message.textContent = "Die PasswÃƒÆ’Ã‚Â¶rter stimmen nicht ÃƒÆ’Ã‚Â¼berein.";
      return;
    }

    message.textContent = "Registrierung lÃƒÆ’Ã‚Â¤uft...";

    try {
      await requestJson("/users", {
        method: "POST",
        body: JSON.stringify({ username, email, password })
      });

      message.textContent = "Registrierung erfolgreich. Du wirst weitergeleitet...";
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

initializeTrainingApp();
