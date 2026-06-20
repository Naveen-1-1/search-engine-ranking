import { apiRequest, buildQuery, escapeHtml, formatDate } from "./api.js";
import { renderPagination as renderPaginationControls } from "./pagination.js";

const MAX_TAG_SELECTIONS = 3;

const state = {
  q: "",
  category: "",
  source: "",
  tags: [],
  from: "",
  to: "",
  page: 1,
  limit: 10,
};

const searchForm = document.querySelector("#searchForm");
const filterForm = document.querySelector("#filterForm");
const resetSearchButton = document.querySelector("#resetSearchButton");
const tagFilterLabel = document.querySelector("#tagFilterLabel");
const searchInput = document.querySelector("#searchInput");
const results = document.querySelector("#results");
const resultHeading = document.querySelector("#resultHeading");
const rankingProfile = document.querySelector("#rankingProfile");
const pagination = document.querySelector("#pagination");

searchForm.addEventListener("submit", (event) => {
  event.preventDefault();
  state.q = searchInput.value.trim();
  state.page = 1;
  runSearch();
});

filterForm.addEventListener("change", (event) => {
  if (
    event.target.name === "tags" &&
    event.target.checked &&
    filterForm.querySelectorAll('input[name="tags"]:checked').length >
      MAX_TAG_SELECTIONS
  ) {
    event.target.checked = false;
    return;
  }

  if (event.target.name === "tags") {
    updateTagFilterLabel();
  }

  const formData = new FormData(filterForm);

  state.category = formData.get("category");
  state.source = formData.get("source");
  state.tags = formData.getAll("tags");
  state.from = formData.get("from");
  state.to = formData.get("to");
  state.page = 1;
  runSearch();
});

filterForm.addEventListener("submit", (event) => {
  event.preventDefault();
});

resetSearchButton.addEventListener("click", resetSearch);

readStateFromUrl();
applyStateToForm();
runSearch();

function readStateFromUrl() {
  const params = new URLSearchParams(window.location.search);

  state.q = params.get("q") || "";
  state.category = params.get("category") || "";
  state.source = params.get("source") || "";
  state.from = params.get("from") || "";
  state.to = params.get("to") || "";
  state.page = Math.max(Number(params.get("page")) || 1, 1);
  state.limit = Math.min(Math.max(Number(params.get("limit")) || 10, 1), 50);

  const tags = params.get("tags");

  state.tags = tags
    ? tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean)
    : [];
}

function applyStateToForm() {
  searchInput.value = state.q;
  filterForm.category.value = state.category;
  filterForm.source.value = state.source;
  filterForm.from.value = state.from;
  filterForm.to.value = state.to;

  const selectedTags = new Set(state.tags);

  filterForm.querySelectorAll('input[name="tags"]').forEach((input) => {
    input.checked = selectedTags.has(input.value);
  });

  updateTagFilterLabel();
}

function writeStateToUrl() {
  const query = buildQuery(state);
  const url = query ? `/?${query}` : "/";

  history.replaceState(null, "", url);
}

function getSearchReturnUrl() {
  const query = buildQuery(state);

  return query ? `/?${query}` : "/";
}

function updateTagFilterLabel() {
  const selectedTags = [
    ...filterForm.querySelectorAll('input[name="tags"]:checked'),
  ].map((input) => input.value);

  tagFilterLabel.textContent =
    selectedTags.length === 0 ? "All tags" : selectedTags.join(", ");
}

function resetSearch() {
  state.q = "";
  state.category = "";
  state.source = "";
  state.tags = [];
  state.from = "";
  state.to = "";
  state.page = 1;

  searchInput.value = "";
  filterForm.reset();
  updateTagFilterLabel();
  runSearch();
}

async function runSearch() {
  results.innerHTML = `<div class="col-12"><div class="surface-card p-4">Loading results...</div></div>`;
  writeStateToUrl();

  try {
    const query = buildQuery(state);
    const data = await apiRequest(`/search?${query}`);

    state.page = data.page;
    writeStateToUrl();
    renderResults(data);
    renderPagination(data);
  } catch (err) {
    results.innerHTML = `<div class="col-12"><div class="alert alert-danger">${escapeHtml(err.message)}</div></div>`;
  }
}

function renderResults(data) {
  resultHeading.textContent =
    data.query || state.category || state.source || state.tags.length
      ? `${data.total} matching records`
      : `${data.total} records`;
  rankingProfile.textContent = `Ranking: ${data.rankingProfile.name}`;

  if (data.results.length === 0) {
    results.innerHTML = `
      <div class="col-12">
        <div class="surface-card p-4">
          <h3 class="h5">No records found</h3>
          <p class="muted-copy mb-0">Try a broader keyword or remove a filter.</p>
        </div>
      </div>
    `;
    return;
  }

  results.innerHTML = data.results
    .map(({ record, score, matchedTerms }) =>
      renderResultCard(record, score, matchedTerms)
    )
    .join("");
}

function renderResultCard(record, score, matchedTerms) {
  const tags = (record.tags || [])
    .map((tag) => `<span class="tag-pill">${escapeHtml(tag)}</span>`)
    .join("");
  const terms = matchedTerms?.length
    ? `Matched: ${matchedTerms.map(escapeHtml).join(", ")}`
    : "Browse result";

  return `
    <article class="col-12">
      <div class="surface-card result-card p-4">
        <div class="d-flex justify-content-between gap-3">
          <div>
            <p class="eyebrow mb-1">${escapeHtml(record.category)} / ${escapeHtml(record.source)}</p>
            <h3 class="h4">
              <a class="link-dark text-decoration-none" href="/record.html?id=${record._id}&return=${encodeURIComponent(getSearchReturnUrl())}">
                ${escapeHtml(record.title)}
              </a>
            </h3>
          </div>
          <span class="score-badge align-self-start">Score ${score}</span>
        </div>
        <p class="muted-copy">${escapeHtml(record.summary)}</p>
        <div class="mb-2">${tags}</div>
        <p class="small text-muted mb-0">
          ${escapeHtml(terms)} · ${formatDate(record.publishedAt)} · Popularity ${escapeHtml(record.popularity)}
        </p>
      </div>
    </article>
  `;
}

function renderPagination(data) {
  renderPaginationControls({
    container: pagination,
    page: data.page,
    pages: data.pages,
    onPageChange: (page) => {
      state.page = page;
      runSearch();
    },
  });
}
