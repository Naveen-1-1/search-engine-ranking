import { apiRequest, escapeHtml, formatDate } from "./api.js";

const MAX_TAG_SELECTIONS = 3;

const form = document.querySelector("#recordForm");
const table = document.querySelector("#recordsTable");
const formMessage = document.querySelector("#formMessage");
const adminMessage = document.querySelector("#adminMessage");
const reindexButton = document.querySelector("#reindexButton");
const resetFormButton = document.querySelector("#resetForm");
const recordTagsLabel = document.querySelector("#recordTagsLabel");
let records = [];

form.addEventListener("change", (event) => {
  if (event.target.name !== "tags") {
    return;
  }

  if (
    event.target.checked &&
    form.querySelectorAll('input[name="tags"]:checked').length >
      MAX_TAG_SELECTIONS
  ) {
    event.target.checked = false;
    return;
  }

  updateTagLabel();
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await saveRecord();
});

resetFormButton.addEventListener("click", resetForm);
reindexButton.addEventListener("click", rebuildIndex);

table.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");

  if (!button) {
    return;
  }

  const record = records.find((item) => String(item._id) === button.dataset.id);

  if (button.dataset.action === "edit") {
    fillForm(record);
  }

  if (button.dataset.action === "delete") {
    await deleteRecord(record);
  }
});

loadRecords();

async function loadRecords() {
  table.innerHTML = `<tr><td colspan="4">Loading records...</td></tr>`;

  try {
    const data = await apiRequest("/records?limit=20");

    records = data.items;
    renderRecords();
  } catch (err) {
    table.innerHTML = `<tr><td colspan="4" class="text-danger">${escapeHtml(err.message)}</td></tr>`;
  }
}

async function saveRecord() {
  const id = document.querySelector("#recordId").value;
  const payload = getFormPayload();
  const method = id ? "PUT" : "POST";
  const path = id ? `/records/${id}` : "/records";

  try {
    await apiRequest(path, {
      method,
      body: JSON.stringify(payload),
    });
    showMessage(
      formMessage,
      "Record saved and search index updated.",
      "success"
    );
    resetForm();
    await loadRecords();
  } catch (err) {
    showMessage(formMessage, err.message, "danger");
  }
}

async function deleteRecord(record) {
  if (!record || !window.confirm(`Delete "${record.title}"?`)) {
    return;
  }

  try {
    await apiRequest(`/records/${record._id}`, { method: "DELETE" });
    showMessage(
      adminMessage,
      "Record deleted and removed from the index.",
      "success"
    );
    await loadRecords();
  } catch (err) {
    showMessage(adminMessage, err.message, "danger");
  }
}

async function rebuildIndex() {
  reindexButton.disabled = true;
  reindexButton.textContent = "Rebuilding...";

  try {
    const result = await apiRequest("/admin/reindex", { method: "POST" });

    showMessage(
      adminMessage,
      `Rebuilt index for ${result.indexedRecords} records and ${result.indexedTerms} index entries.`,
      "success"
    );
  } catch (err) {
    showMessage(adminMessage, err.message, "danger");
  } finally {
    reindexButton.disabled = false;
    reindexButton.textContent = "Rebuild index";
  }
}

function renderRecords() {
  if (records.length === 0) {
    table.innerHTML = `<tr><td colspan="4">No records yet.</td></tr>`;
    return;
  }

  table.innerHTML = records
    .map(
      (record) => `
        <tr>
          <td>
            <strong>${escapeHtml(record.title)}</strong>
            <div class="small text-muted">${formatDate(record.publishedAt)}</div>
          </td>
          <td><span class="badge text-bg-light">${escapeHtml(record.status)}</span></td>
          <td>${escapeHtml(record.category)}</td>
          <td>
            <button class="btn btn-sm btn-outline-primary" data-action="edit" data-id="${record._id}" type="button">Edit</button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${record._id}" type="button">Delete</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function fillForm(record) {
  if (!record) {
    return;
  }

  document.querySelector("#recordId").value = record._id;
  document.querySelector("#title").value = record.title || "";
  document.querySelector("#summary").value = record.summary || "";
  document.querySelector("#body").value = record.body || "";
  setSelectValue("#category", record.category);
  setSelectValue("#source", record.source);
  setSelectedTags(record.tags || []);
  document.querySelector("#publishedAt").value = toDateInput(
    record.publishedAt
  );
  document.querySelector("#popularity").value = record.popularity || 0;
  document.querySelector("#status").value = record.status || "published";
  document.querySelector("#author").value = record.author || "";
  document.querySelector("#readingMinutes").value = record.readingMinutes || 5;
  document.querySelector("#sourceUrl").value = record.sourceUrl || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getFormPayload() {
  return {
    title: document.querySelector("#title").value,
    summary: document.querySelector("#summary").value,
    body: document.querySelector("#body").value,
    category: document.querySelector("#category").value,
    source: document.querySelector("#source").value,
    tags: getSelectedTags(),
    publishedAt: document.querySelector("#publishedAt").value,
    popularity: document.querySelector("#popularity").value,
    status: document.querySelector("#status").value,
    author: document.querySelector("#author").value,
    readingMinutes: document.querySelector("#readingMinutes").value,
    sourceUrl: document.querySelector("#sourceUrl").value,
  };
}

function resetForm() {
  form.reset();
  document.querySelector("#recordId").value = "";
  document.querySelector("#status").value = "published";
  document.querySelector("#popularity").value = 100;
  document.querySelector("#readingMinutes").value = 5;
  setSelectedTags([]);
  formMessage.innerHTML = "";
}

function getSelectedTags() {
  return [...form.querySelectorAll('input[name="tags"]:checked')].map(
    (input) => input.value
  );
}

function setSelectedTags(tags) {
  const selectedTags = new Set(tags.map((tag) => String(tag).toLowerCase()));

  form.querySelectorAll('input[name="tags"]').forEach((input) => {
    input.checked = selectedTags.has(input.value);
  });

  updateTagLabel();
}

function updateTagLabel() {
  const selectedTags = getSelectedTags();

  recordTagsLabel.textContent =
    selectedTags.length === 0 ? "Select tags" : selectedTags.join(", ");
}

function setSelectValue(selector, value) {
  const select = document.querySelector(selector);

  if (!value) {
    select.value = "";
    return;
  }

  const hasOption = [...select.options].some(
    (option) => option.value === value
  );

  if (!hasOption) {
    select.add(new Option(value, value, true, true));
    return;
  }

  select.value = value;
}

function showMessage(container, message, type) {
  container.innerHTML = `<div class="alert alert-${type} mb-0">${escapeHtml(message)}</div>`;
}

function toDateInput(value) {
  if (!value) {
    return "";
  }

  return new Date(value).toISOString().slice(0, 10);
}
