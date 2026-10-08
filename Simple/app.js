// Adresse des Backends (hier anpassen)
const API = "https://trainingsplan-backend-6a384026392a.herokuapp.com/api/v1";

const $ = (id) => document.getElementById(id);
let token = localStorage.getItem("token");
let currentPlanId = null;

// Schickt eine Anfrage ans Backend und gibt das JSON zurück
async function request(method, path, body) {
  const headers = { "Content-Type": "application/json" };
  if (token) headers.Authorization = "Bearer " + token;
  const response = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || "Fehler " + response.status);
  return data;
}

function show(view) {
  for (const id of ["auth-view", "plans-view", "plan-view"]) $(id).hidden = id !== view;
}

// Führt eine Funktion aus und zeigt Fehler als Meldung an
async function run(action) {
  $("message").textContent = "";
  try {
    await action();
  } catch (error) {
    $("message").textContent = error.message;
  }
}

// Text sicher einfügen (kein HTML)
function item(text, buttonText, onClick, onTextClick) {
  const li = document.createElement("li");
  const span = document.createElement("span");
  span.textContent = text + " ";
  if (onTextClick) {
    span.style.cursor = "pointer";
    span.style.textDecoration = "underline";
    span.onclick = onTextClick;
  }
  const button = document.createElement("button");
  button.textContent = buttonText;
  button.onclick = () => run(onClick);
  li.append(span, button);
  return li;
}

// ---------- Anmelden ----------
$("login-form").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    const data = await request("POST", "/auth", {
      email: $("login-email").value,
      password: $("login-password").value,
    });
    token = data.token;
    localStorage.setItem("token", token);
    await loadPlans();
  });
};

$("register-form").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    await request("POST", "/users", {
      username: $("register-username").value,
      email: $("register-email").value,
      password: $("register-password").value,
    });
    $("message").textContent = "Registriert, bitte jetzt anmelden.";
  });
};

$("logout-button").onclick = () => run(async () => {
  try { await request("DELETE", "/auth", { token }); } catch {}
  token = null;
  localStorage.removeItem("token");
  show("auth-view");
});

// ---------- Pläne ----------
async function loadPlans() {
  const plans = await request("GET", "/plans");
  $("plan-list").replaceChildren(...plans.map((plan) =>
    item(`${plan.name} `, "Löschen", async () => {
      if (!confirm("Plan wirklich löschen?")) return;
      await request("DELETE", "/plans/" + plan.id);
      await loadPlans();
    }, () => run(() => openPlan(plan.id)))
  ));
  show("plans-view");
}

$("plan-form").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    await request("POST", "/plans", {
      name: $("plan-name").value,
      description: $("plan-description").value || null,
    });
    event.target.reset();
    await loadPlans();
  });
};

// ---------- Ein Plan ----------
// Das Backend liefert (noch) keine Übungsliste, daher merken wir uns nur die neu hinzugefügten
async function openPlan(planId) {
  currentPlanId = planId;
  const plan = await request("GET", "/plans/" + planId);
  $("plan-title").textContent = plan.name;
  $("plan-description-text").textContent = plan.description || "";
  $("exercise-list").replaceChildren();
  show("plan-view");
}

$("back-button").onclick = () => run(loadPlans);

$("exercise-form").onsubmit = (event) => {
  event.preventDefault();
  run(async () => {
    const exercise = await request("POST", `/plans/${currentPlanId}/exercises`, {
      externalId: $("exercise-id").value.trim(),
      note: $("exercise-note").value || null,
    });
    event.target.reset();
    const row = item(exercise.name, "Entfernen", async () => {
      await request("DELETE", `/plans/${currentPlanId}/exercises/${exercise.id}`);
      row.remove();
    });
    $("exercise-list").append(row);
  });
};

// ---------- Start ----------
run(async () => {
  if (token) await loadPlans();
  else show("auth-view");
});
