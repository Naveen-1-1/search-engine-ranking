const EDGE_PAGE_COUNT = 1;
const SIBLING_PAGE_COUNT = 1;
const ELLIPSIS = "ellipsis";

export function renderPagination({ container, page, pages, onPageChange }) {
  container.innerHTML = "";

  if (pages <= 1) {
    return;
  }

  container.append(
    createPageItem({
      label: "Previous",
      page: page - 1,
      disabled: page === 1,
      onPageChange,
    })
  );

  getVisiblePageItems(page, pages).forEach((item) => {
    if (item === ELLIPSIS) {
      container.append(createEllipsisItem());
      return;
    }

    container.append(
      createPageItem({
        label: item,
        page: item,
        active: item === page,
        ariaLabel: `Go to page ${item}`,
        onPageChange,
      })
    );
  });

  container.append(
    createPageItem({
      label: "Next",
      page: page + 1,
      disabled: page === pages,
      onPageChange,
    })
  );
}

function getVisiblePageItems(currentPage, totalPages) {
  const visiblePages = new Set();

  for (let page = 1; page <= Math.min(EDGE_PAGE_COUNT, totalPages); page += 1) {
    visiblePages.add(page);
  }

  for (
    let page = Math.max(1, currentPage - SIBLING_PAGE_COUNT);
    page <= Math.min(totalPages, currentPage + SIBLING_PAGE_COUNT);
    page += 1
  ) {
    visiblePages.add(page);
  }

  for (
    let page = Math.max(1, totalPages - EDGE_PAGE_COUNT + 1);
    page <= totalPages;
    page += 1
  ) {
    visiblePages.add(page);
  }

  return [...visiblePages]
    .sort((first, second) => first - second)
    .reduce((items, page) => {
      const previousPage = items.at(-1);

      if (typeof previousPage === "number" && page - previousPage > 1) {
        items.push(ELLIPSIS);
      }

      items.push(page);
      return items;
    }, []);
}

function createPageItem({
  label,
  page,
  active = false,
  disabled = false,
  ariaLabel,
  onPageChange,
}) {
  const item = document.createElement("li");
  const button = document.createElement("button");

  item.className = `page-item${active ? " active" : ""}${disabled ? " disabled" : ""}`;
  button.className = "page-link";
  button.type = "button";
  button.textContent = label;
  button.disabled = disabled;
  button.setAttribute("aria-label", ariaLabel || `${label} page`);

  if (active) {
    button.setAttribute("aria-current", "page");
  }

  button.addEventListener("click", () => {
    if (!disabled && !active) {
      onPageChange(page);
    }
  });

  item.append(button);
  return item;
}

function createEllipsisItem() {
  const item = document.createElement("li");
  const span = document.createElement("span");

  item.className = "page-item disabled";
  span.className = "page-link";
  span.textContent = "...";
  span.setAttribute("aria-hidden", "true");

  item.append(span);
  return item;
}
