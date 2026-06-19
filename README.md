# SearchX

SearchX is a custom search engine and ranking platform built with Node.js, Express.js, MongoDB, vanilla JavaScript, HTML, CSS, and Bootstrap.

Author: Naveen Shankar

Class link: To be added before submission.

## Project Objective

SearchX demonstrates how a search system works without external search libraries. Users can search a large seeded corpus, apply filters, review ranked results, and open detail pages. Admin pages support record CRUD, full index rebuilds, ranking profile CRUD, and MongoDB aggregation metrics.

## Features

- Custom tokenization and stopword removal.
- Custom MongoDB-backed inverted index.
- Ranked search results using title, summary, body, tags, source, popularity, and recency weights.
- Filters for category, source, tag, and date range.
- Record detail pages.
- Content Admin CRUD for searchable records.
- Search Admin CRUD for ranking profiles.
- Metrics dashboard powered by MongoDB aggregations.
- Vanilla JavaScript client-side rendering.

## Tech Stack

- Node.js
- Express.js
- MongoDB native Node.js driver
- Vanilla ES modules
- HTML, CSS, Bootstrap

## Requirements

- Node.js 20 or newer recommended.
- MongoDB Atlas connection string.
- A `.env` file with:

```bash
MONGODB_URI=your-mongodb-atlas-connection-string
MONGODB_DB=searchx
```

Do not commit `.env`.

## Install

```bash
npm install
```

## Seed The Database

The Mockaroo export should be saved at:

```bash
assets/search-records.json
```

Then run:

```bash
npm run seed
```

The seed command validates that the JSON file has at least 1,000 records, imports the records into MongoDB, creates default ranking profiles, and rebuilds the custom search index.

## Run Locally

Run the Express app:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

Optional split frontend workflow:

```bash
npm run dev-frontend
```

The frontend detects Live Server on port `8080` and calls the backend at `http://localhost:3000/api`.

## How To Use

1. Open the Search page and enter a keyword such as `mongodb`, `ranking`, or `api`.
2. Submit the search form.
3. Use category, source, tag, and date filters to refine results.
4. Open any result to view the full record detail page.
5. Use Content Admin to create, update, delete, and re-index records.
6. Use Search Admin to tune ranking profiles and review metrics.

## Project Documentation

- Design document: `docs/design.md`
- Requirements and rubric notes: `temp/actual.md` and `temp/Rubrics.md`

## Screenshot

To be added after the final UI is reviewed locally.

## Deployment

Deploy the Node app to a public Node-compatible host such as Render, Railway, or Fly.io. Add `MONGODB_URI` and `MONGODB_DB` as environment variables in the deployment dashboard.

## Quality Checks

```bash
npm run lint
npm run format:check
```

## Submission Notes

Before final submission, add the class link, screenshot, public deployment URL, and public narrated demo video link.
