const MPA_API = (window.API_BASE_URL || "https://trainingsapp-dd913c63a7fd.herokuapp.com/api/v1").replace(/\/$/, "");
const MPA_TOKEN_KEY = "powerLevelToken";
const MPA_LOCAL_TOKEN = "local-admin";

function mpaEscape(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);
}

async function mpaRequest(path) {
  const token = sessionStorage.getItem(MPA_TOKEN_KEY);
  if (!token || token === MPA_LOCAL_TOKEN) {
    throw new Error("Bitte über die MPA anmelden. Der lokale Demo-Admin hat keinen Backend-Zugriff.");
  }
  const response = await fetch(`${MPA_API}${path}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.message || "Die Anfrage konnte nicht verarbeitet werden.");
  return payload;
}

async function loadMpaExercises(name = "") {
  const grid = document.querySelector("#exercise-grid");
  const message = document.querySelector("#exercise-message");
  if (!grid) return;
  grid.innerHTML = '<p class="empty-state">Übungen werden geladen …</p>';
  try {
    const payload = await mpaRequest(`/exercisedb/exercises?name=${encodeURIComponent(name)}&limit=20`);
    grid.innerHTML = payload.exercises.map((exercise) => `
      <article class="exercise-item">
        ${exercise.gifUrl ? `<img src="${mpaEscape(exercise.gifUrl)}" alt="" loading="lazy">` : ""}
        <strong>${mpaEscape(exercise.name)}</strong>
        <span>${mpaEscape((exercise.primaryMuscleGroups || []).join(" · "))}</span>
        <a class="gold-button" href="ExerciseDetails.html?id=${encodeURIComponent(exercise.externalId)}">Details anzeigen</a>
      </article>
    `).join("") || '<p class="empty-state">Keine passende Übung gefunden.</p>';
    message.textContent = `${payload.total} Übungen gefunden.`;
  } catch (error) {
    grid.innerHTML = `<p class="empty-state">${mpaEscape(error.message)}</p>`;
  }
}

async function loadMpaExerciseDetails() {
  const detail = document.querySelector("#exercise-detail");
  if (!detail) return;
  const id = new URLSearchParams(window.location.search).get("id");
  if (!id) {
    detail.innerHTML = '<p class="empty-state">Keine Übung ausgewählt.</p>';
    return;
  }
  try {
    const exercise = await mpaRequest(`/exercisedb/exercises/${encodeURIComponent(id)}`);
    detail.innerHTML = `
      ${exercise.gifUrl ? `<img src="${mpaEscape(exercise.gifUrl)}" alt="${mpaEscape(exercise.name)}">` : ""}
      <p class="eyebrow">ExerciseDB-Detailansicht</p>
      <h1>${mpaEscape(exercise.name)}</h1>
      <p><strong>Primäre Muskeln:</strong> ${mpaEscape((exercise.primaryMuscleGroups || []).join(" · "))}</p>
      <p><strong>Sekundäre Muskeln:</strong> ${mpaEscape((exercise.secondaryMuscleGroups || []).join(" · "))}</p>
      <p><strong>Körperbereiche:</strong> ${mpaEscape((exercise.bodyParts || []).join(" · "))}</p>
      <h2>Anleitung</h2>
      <ol>${(exercise.instructions || []).map((instruction) => `<li>${mpaEscape(instruction)}</li>`).join("")}</ol>
    `;
  } catch (error) {
    detail.innerHTML = `<p class="empty-state">${mpaEscape(error.message)}</p>`;
  }
}

const mpaSearchForm = document.querySelector("#exercise-search-form");
if (mpaSearchForm) {
  const user = sessionStorage.getItem("powerLevelUser");
  document.querySelector("#current-user").textContent = user || "";
  mpaSearchForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loadMpaExercises(document.querySelector("#exercise-search").value.trim());
  });
  loadMpaExercises();
}

loadMpaExerciseDetails();
