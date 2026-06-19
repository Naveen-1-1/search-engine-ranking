import { apiRequest, escapeHtml } from "./api.js";

const DEFAULT_WEIGHTS = {
  title: 5,
  summary: 3,
  body: 1,
  tags: 4,
  source: 1,
  popularity: 2,
  recency: 2,
};

const weightInputs = {
  title: document.querySelector("#weightTitle"),
  summary: document.querySelector("#weightSummary"),
  body: document.querySelector("#weightBody"),
  tags: document.querySelector("#weightTags"),
  source: document.querySelector("#weightSource"),
  popularity: document.querySelector("#weightPopularity"),
  recency: document.querySelector("#weightRecency"),
};

const form = document.querySelector("#profileForm");
const profilesTable = document.querySelector("#profilesTable");
const profileMessage = document.querySelector("#profileMessage");
const newProfileButton = document.querySelector("#newProfileButton");
const metricsContainer = document.querySelector("#metrics");
let profiles = [];

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveProfile();
});

newProfileButton.addEventListener("click", resetProfileForm);

profilesTable.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const profile = profiles.find(
    (item) => String(item._id) === button.dataset.id
  );

  if (button.dataset.action === "edit") {
    fillProfileForm(profile);
  }

  if (button.dataset.action === "activate") {
    await activateProfile(profile);
  }

  if (button.dataset.action === "delete") {
    await deleteProfile(profile);
  }
});

resetProfileForm();
loadProfiles();
loadMetrics();

async function loadProfiles() {
  profilesTable.innerHTML = `<tr><td colspan="3">Loading profiles...</td></tr>`;

  try {
    const data = await apiRequest("/ranking-profiles");

    profiles = data.profiles;
    renderProfiles();
  } catch (err) {
    profilesTable.innerHTML = `<tr><td colspan="3" class="text-danger">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function saveProfile() {
  const id = document.querySelector("#profileId").value;
  const payload = getProfilePayload();
  const method = id ? "PUT" : "POST";
  const path = id ? `/ranking-profiles/${id}` : "/ranking-profiles";

  try {
    await apiRequest(path, {
      method,
      body: JSON.stringify(payload),
    });
    showMessage("Ranking profile saved.", "success");
    resetProfileForm();
    await loadProfiles();
  } catch (err) {
    showMessage(err.message, "danger");
  }
}

async function activateProfile(profile) {
  if (!profile) {
    return;
  }

  try {
    await apiRequest(`/ranking-profiles/${profile._id}`, {
      method: "PUT",
      body: JSON.stringify({ isActive: true }),
    });
    showMessage(`"${profile.name}" is now active.`, "success");
    await loadProfiles();
  } catch (err) {
    showMessage(err.message, "danger");
  }
}

async function deleteProfile(profile) {
  if (!profile || !window.confirm(`Delete "${profile.name}"?`)) {
    return;
  }

  try {
    await apiRequest(`/ranking-profiles/${profile._id}`, { method: "DELETE" });
    showMessage("Ranking profile deleted.", "success");
    await loadProfiles();
  } catch (err) {
    showMessage(err.message, "danger");
  }
}

async function loadMetrics() {
  metricsContainer.innerHTML = `<div class="col-12">Loading metrics...</div>`;

  try {
    const metrics = await apiRequest("/metrics");

    metricsContainer.innerHTML = renderMetrics(metrics);
  } catch (err) {
    metricsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  }
}

function renderProfiles() {
  if (profiles.length === 0) {
    profilesTable.innerHTML = `<tr><td colspan="3">No ranking profiles yet.</td></tr>`;
    return;
  }

  profilesTable.innerHTML = profiles
    .map(
      (profile) => `
        <tr class="profile-row${profile.isActive ? " active" : ""}">
          <td>
            <strong>${escapeHtml(profile.name)}</strong>
            <div class="small text-muted">${escapeHtml(profile.description || "")}</div>
          </td>
          <td>${profile.isActive ? '<span class="badge text-bg-warning">Active</span>' : ""}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${profile._id}" type="button">Edit</button>
            <button class="btn btn-sm btn-outline-success" data-action="activate" data-id="${profile._id}" type="button">Activate</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${profile._id}" type="button">Delete</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderMetrics(metrics) {
  return `
    <div class="col-md-3"><div class="metric-card"><span class="text-muted">Records</span><strong>${metrics.records.total}</strong></div></div>
    <div class="col-md-3"><div class="metric-card"><span class="text-muted">Published</span><strong>${metrics.records.published}</strong></div></div>
    <div class="col-md-3"><div class="metric-card"><span class="text-muted">Index Terms</span><strong>${metrics.searchIndex.uniqueTerms}</strong></div></div>
    <div class="col-md-3"><div class="metric-card"><span class="text-muted">Searches</span><strong>${metrics.searches.total}</strong></div></div>
    <div class="col-12">
      <h3 class="h6 mt-3">Top Categories</h3>
      ${renderBars(metrics.categoryCounts)}
    </div>
    <div class="col-md-6">
      <h3 class="h6 mt-3">Top Tags</h3>
      ${renderList(metrics.topTags)}
    </div>
  `;
}

function renderBars(items) {
  const max = Math.max(...items.map((item) => item.count), 1);

  return items
    .map(
      (item) => `
        <div class="chart-row mb-2">
          <span>${escapeHtml(item._id || "Unknown")}</span>
          <span class="chart-bar"><span style="width: ${(item.count / max) * 100}%"></span></span>
          <strong>${item.count}</strong>
        </div>
      `
    )
    .join("");
}

function renderList(items) {
  if (!items.length) {
    return `<p class="muted-copy">No data yet.</p>`;
  }

  return `
    <ul class="list-group">
      ${items
        .map(
          (item) => `
            <li class="list-group-item d-flex justify-content-between">
              <span>${escapeHtml(item._id || "Unknown")}</span>
              <strong>${item.count}</strong>
            </li>
          `
        )
        .join("")}
    </ul>
  `;
}

function fillProfileForm(profile) {
  if (!profile) {
    return;
  }

  document.querySelector("#profileId").value = profile._id;
  document.querySelector("#profileName").value = profile.name || "";
  document.querySelector("#profileDescription").value =
    profile.description || "";
  document.querySelector("#profileActive").checked = Boolean(profile.isActive);
  setWeightInputs(profile.weights || DEFAULT_WEIGHTS);
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function resetProfileForm() {
  form.reset();
  document.querySelector("#profileId").value = "";
  document.querySelector("#profileName").value = "";
  document.querySelector("#profileDescription").value = "";
  document.querySelector("#profileActive").checked = false;
  setWeightInputs(DEFAULT_WEIGHTS);
  profileMessage.innerHTML = "";
}

function getProfilePayload() {
  return {
    name: document.querySelector("#profileName").value,
    description: document.querySelector("#profileDescription").value,
    isActive: document.querySelector("#profileActive").checked,
    weights: Object.fromEntries(
      Object.entries(weightInputs).map(([key, input]) => [
        key,
        Number(input.value),
      ])
    ),
  };
}

function setWeightInputs(weights) {
  Object.entries(weightInputs).forEach(([key, input]) => {
    input.value = weights[key] ?? DEFAULT_WEIGHTS[key];
  });
}

function showMessage(message, type) {
  profileMessage.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}
