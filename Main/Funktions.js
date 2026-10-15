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
    let selectedPlan = null;
    let planExercises = [];
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
      document.querySelector("#stat-exercises").textContent = exercises.length;
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
            <button type="button" data-open-plan="${escapeHtml(plan.id)}">Übungen verwalten</button>
            <button class="plan-delete-button" type="button" data-delete-plan="${escapeHtml(plan.id)}">LÃƒÆ’Ã‚Â¶schen</button>
          </div>
        </article>
      `).join("");
    }

    async function openPlan(plan) {
      selectedPlan = plan;
      document.querySelector("#plan-detail-title").textContent = plan.name;
      document.querySelector("#plan-detail-description").textContent =
        plan.description || "Keine Beschreibung hinterlegt.";
      setView("plan-detail");
      try {
        planExercises = await requestJson(`/plans/${plan.id}/exercises`);
        renderPlanExercises();
      } catch (error) {
        planExercises = [];
        document.querySelector("#plan-exercise-grid").innerHTML =
          `<p class="empty-state">${escapeHtml(error.message || "Planübungen konnten nicht geladen werden.")}</p>`;
      }
    }

    function renderPlanExercises() {
      const grid = document.querySelector("#plan-exercise-grid");
      grid.innerHTML = planExercises.map((exercise) => `
        <article class="exercise-item">
          ${exercise.gifUrl ? `<img src="${escapeHtml(exercise.gifUrl)}" alt="" loading="lazy">` : ""}
          <strong>${escapeHtml(exercise.position + ". " + exercise.name)}</strong>
          <span>${escapeHtml((exercise.primaryMuscleGroups || []).join(" · "))}</span>
          <small>${escapeHtml(exercise.note || "Keine Notiz")}</small>
          <div class="exercise-actions">
            <button type="button" data-edit-note="${escapeHtml(exercise.id)}">Notiz bearbeiten</button>
            <button class="plan-delete-button" type="button" data-remove-exercise="${escapeHtml(exercise.id)}">Entfernen</button>
          </div>
        </article>
      `).join("") || '<p class="empty-state">Noch keine Übungen in diesem Plan.</p>';
    }

    async function addExerciseToSelectedPlan(exercise) {
      if (!selectedPlan) {
        setView("plans");
        document.querySelector("#create-message").textContent =
          "Bitte zuerst bei einem Trainingsplan „Übungen verwalten“ auswählen.";
        return;
      }
      const note = window.prompt("Optionale Notiz zur Übung:", "");
      if (note === null) return;
      try {
        const added = await requestJson(`/plans/${selectedPlan.id}/exercises`, {
          method: "POST",
          body: JSON.stringify({ externalId: exercise.externalId, note: note || null })
        });
        planExercises.push(added);
        selectedPlan.exerciseCount = planExercises.length;
        plans = plans.map((plan) => plan.id === selectedPlan.id ? selectedPlan : plan);
        renderPlanExercises();
        renderPlans();
        setView("plan-detail");
      } catch (error) {
        document.querySelector("#exercise-grid").insertAdjacentHTML(
          "afterbegin",
          `<p class="empty-state">${escapeHtml(error.message || "Übung konnte nicht hinzugefügt werden.")}</p>`
        );
      }
    }

    async function loadExercises(query = "") {
      const exerciseGrid = document.querySelector("#exercise-grid");
      exerciseGrid.innerHTML = '<p class="empty-state">ÃƒÆ’Ã…â€œbungen werden geladen ÃƒÂ¢Ã¢â€šÂ¬Ã‚Â¦</p>';
      exerciseLoadError = "";
      try {
        const parameter = encodeURIComponent(query.trim());
        exercises = await requestJson(`/exercises?name=${parameter}&limit=20`);
        renderExercises();
        renderOverviewStats();
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
          <button class="add-exercise-button" type="button" data-add-exercise="${escapeHtml(exercise.externalId)}">Zu Plan hinzufügen</button>
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
      const openButton = event.target.closest("[data-open-plan]");
      if (openButton) {
        const plan = plans.find((item) => String(item.id) === openButton.dataset.openPlan);
        if (plan) await openPlan(plan);
        return;
      }
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

    document.querySelector("#plan-exercise-grid").addEventListener("click", async (event) => {
      const removeButton = event.target.closest("[data-remove-exercise]");
      const editButton = event.target.closest("[data-edit-note]");
      const exerciseId = removeButton?.dataset.removeExercise || editButton?.dataset.editNote;
      const exercise = planExercises.find((item) => String(item.id) === exerciseId);
      if (!selectedPlan || !exercise) return;

      if (removeButton) {
        if (!window.confirm(`„${exercise.name}“ aus dem Plan entfernen?`)) return;
        try {
          await requestJson(`/plans/${selectedPlan.id}/exercises/${exercise.id}`, { method: "DELETE" });
          planExercises = planExercises.filter((item) => item.id !== exercise.id);
          selectedPlan.exerciseCount = planExercises.length;
          plans = plans.map((plan) => plan.id === selectedPlan.id ? selectedPlan : plan);
          renderPlanExercises();
          renderPlans();
        } catch (error) {
          window.alert(error.message || "Übung konnte nicht entfernt werden.");
        }
        return;
      }

      const note = window.prompt("Notiz bearbeiten:", exercise.note || "");
      if (note === null) return;
      try {
        const updated = await requestJson(`/plans/${selectedPlan.id}/exercises/${exercise.id}`, {
          method: "PUT",
          body: JSON.stringify({ note: note || null })
        });
        planExercises = planExercises.map((item) => item.id === updated.id ? updated : item);
        renderPlanExercises();
      } catch (error) {
        window.alert(error.message || "Notiz konnte nicht gespeichert werden.");
      }
    });

    document.querySelector("#back-to-plans").addEventListener("click", () => setView("plans"));
    document.querySelector("#open-exercise-library").addEventListener("click", () => setView("exercises"));
    document.querySelector("#exercise-grid").addEventListener("click", (event) => {
      const addButton = event.target.closest("[data-add-exercise]");
      if (!addButton) return;
      const exercise = exercises.find((item) => String(item.externalId) === addButton.dataset.addExercise);
      if (exercise) addExerciseToSelectedPlan(exercise);
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
