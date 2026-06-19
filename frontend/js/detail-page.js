import { apiRequest, escapeHtml, formatDate, getIdFromQuery } from "./api.js";

const container = document.querySelector("#recordDetail");
const id = getIdFromQuery();

if (!id) {
  container.innerHTML = `<div class="alert alert-warning mb-0">No record ID was provided.</div>`;
} else {
  loadRecord(id);
}

async function loadRecord(recordId) {
  try {
    const record = await apiRequest(`/records/${recordId}`);

    container.innerHTML = renderRecord(record);
  } catch (err) {
    container.innerHTML = `<div class="alert alert-danger mb-0">${escapeHtml(err.message)}</div>`;
  }
}

function renderRecord(record) {
  const tags = (record.tags || [])
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");

  return `
    <div class="row g-4">
      <div class="col-lg-8">
        <p class="eyebrow mb-2">${escapeHtml(record.category)} / ${escapeHtml(record.source)}</p>
        <h1>${escapeHtml(record.title)}</h1>
        <p class="lead muted-copy">${escapeHtml(record.summary)}</p>
        <div class="mb-4">${tags}</div>
        <div class="detail-body">${escapeHtml(record.body)}</div>
      </div>
      <aside class="col-lg-4">
        <dl class="detail-meta">
          <dt>Published</dt>
          <dd>${formatDate(record.publishedAt)}</dd>
          <dt>Author</dt>
          <dd>${escapeHtml(record.author || "Unknown")}</dd>
          <dt>Popularity</dt>
          <dd>${escapeHtml(record.popularity)}</dd>
          <dt>Reading Time</dt>
          <dd>${escapeHtml(record.readingMinutes || "?")} minutes</dd>
          <dt>Status</dt>
          <dd>${escapeHtml(record.status)}</dd>
        </dl>
        ${
          record.sourceUrl
            ? `<a class="btn btn-outline-primary" href="${escapeHtml(record.sourceUrl)}" target="_blank" rel="noreferrer">Open source</a>`
            : ""
        }
      </aside>
    </div>
  `;
}
