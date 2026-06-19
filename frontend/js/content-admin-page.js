import { apiRequest, buildQuery, escapeHtml, formatDate } from "./api.js";

const MAX_TAG_SELECTIONS = 3;
const REQUIRED_SAVE_FIELDS = [
  "title",
  "summary",
  "body",
  "category",
  "source",
  "publishedAt",
];

const form = document.querySelector("#recordForm");
const table = document.querySelector("#recordsTable");
const formMessage = document.querySelector("#formMessage");
const adminMessage = document.querySelector("#adminMessage");
const reindexButton = document.querySelector("#reindexButton");
const resetFormButton = document.querySelector("#resetForm");
const searchRecordsButton = document.querySelector("#searchRecordsButton");
const resultsHeading = document.querySelector("#resultsHeading");
const pagination = document.querySelector("#recordsPagination");
const recordTagsLabel = document.querySelector("#recordTagsLabel");
let records = [];
let hasSearched = false;
let searchPage = 1;
const searchLimit = 10;

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
searchRecordsButton.addEventListener("click", () => {
  searchPage = 1;
  searchRecords();
});
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

renderInitialResults();

async function searchRecords() {
  const params = getSearchParams();

  if (!hasSearchFilters(params)) {
    showMessage(
      adminMessage,
      "Enter at least one field value before searching.",
      "warning"
    );
    return;
  }

  hasSearched = true;
  table.innerHTML = `<tr><td colspan="4">Searching records...</td></tr>`;
  pagination.innerHTML = "";
  adminMessage.innerHTML = "";

  try {
    const data = await apiRequest(`/records?${buildQuery(params)}`);

    records = data.items;
    searchPage = data.page;
    resultsHeading.textContent = `${data.total} matching records`;
    renderRecords();
    renderPagination(data);
  } catch (err) {
    records = [];
    table.innerHTML = `<tr><td colspan="4" class="text-danger">${escapeHtml(err.message)}</td></tr>`;
    pagination.innerHTML = "";
  }
}

async function saveRecord() {
  const payload = getFormPayload();
  const missingField = REQUIRED_SAVE_FIELDS.find(
    (field) => !String(payload[field] ?? "").trim()
  );

  if (missingField) {
    showMessage(
      formMessage,
      "Fill in title, summary, body, category, source, and published date before saving.",
      "danger"
    );
    return;
  }

  const id = document.querySelector("#recordId").value;
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

    if (hasSearched) {
      await searchRecords();
    }
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

    if (hasSearched) {
      if (records.length === 1 && searchPage > 1) {
        searchPage -= 1;
      }
      await searchRecords();
    } else {
      renderInitialResults();
    }
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

function renderInitialResults() {
  records = [];
  hasSearched = false;
  searchPage = 1;
  resultsHeading.textContent = "Matching records";
  table.innerHTML = `<tr><td colspan="4" class="text-muted">Fill in any fields and click Search to find matching records.</td></tr>`;
  pagination.innerHTML = "";
}

function renderPagination(data) {
  pagination.innerHTML = "";

  if (data.pages <= 1) {
    return;
  }

  for (let page = 1; page <= data.pages; page += 1) {
    const item = document.createElement("li");
    const button = document.createElement("button");

    item.className = `page-item${page === data.page ? " active" : ""}`;
    button.className = "page-link";
    button.type = "button";
    button.textContent = page;
    button.addEventListener("click", () => {
      searchPage = page;
      searchRecords();
    });
    item.append(button);
    pagination.append(item);
  }
}

function renderRecords() {
  if (records.length === 0) {
    table.innerHTML = `<tr><td colspan="4">No matching records found.</td></tr>`;
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
  document.querySelector("#popularity").value =
    record.popularity === undefined || record.popularity === null
      ? ""
      : record.popularity;
  document.querySelector("#status").value = record.status || "";
  document.querySelector("#author").value = record.author || "";
  document.querySelector("#readingMinutes").value =
    record.readingMinutes === undefined || record.readingMinutes === null
      ? ""
      : record.readingMinutes;
  document.querySelector("#sourceUrl").value = record.sourceUrl || "";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function getFormPayload() {
  return {
    title: document.querySelector("#title").value.trim(),
    summary: document.querySelector("#summary").value.trim(),
    body: document.querySelector("#body").value.trim(),
    category: document.querySelector("#category").value,
    source: document.querySelector("#source").value,
    tags: getSelectedTags(),
    publishedAt: document.querySelector("#publishedAt").value,
    popularity: document.querySelector("#popularity").value || 100,
    status: document.querySelector("#status").value || "published",
    author: document.querySelector("#author").value.trim(),
    readingMinutes: document.querySelector("#readingMinutes").value || 5,
    sourceUrl: document.querySelector("#sourceUrl").value.trim(),
  };
}

function getSearchParams() {
  const payload = getFormPayload();
  const params = {
    page: searchPage,
    limit: searchLimit,
  };

  if (payload.title) {
    params.title = payload.title;
  }

  if (payload.summary) {
    params.summary = payload.summary;
  }

  if (payload.body) {
    params.body = payload.body;
  }

  if (payload.category) {
    params.category = payload.category;
  }

  if (payload.source) {
    params.source = payload.source;
  }

  if (payload.tags.length > 0) {
    params.tags = payload.tags;
  }

  if (payload.publishedAt) {
    params.publishedAt = payload.publishedAt;
  }

  if (document.querySelector("#popularity").value !== "") {
    params.popularity = payload.popularity;
  }

  if (document.querySelector("#status").value) {
    params.status = payload.status;
  }

  if (document.querySelector("#readingMinutes").value !== "") {
    params.readingMinutes = payload.readingMinutes;
  }

  if (payload.author) {
    params.author = payload.author;
  }

  if (payload.sourceUrl) {
    params.sourceUrl = payload.sourceUrl;
  }

  return params;
}

function hasSearchFilters(params) {
  const ignored = new Set(["page", "limit"]);

  return Object.keys(params).some((key) => !ignored.has(key));
}

function resetForm() {
  form.reset();
  document.querySelector("#recordId").value = "";
  setSelectedTags([]);
  formMessage.innerHTML = "";
  renderInitialResults();
  adminMessage.innerHTML = "";
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
