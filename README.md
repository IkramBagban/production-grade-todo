# Production-grade Todo UI

This project showcases a responsive, accessible todo experience built with React, TypeScript, and Vite. It demonstrates a modern front-end architecture that integrates TanStack Query for data fetching and mutations, and includes polished UX features such as loading skeletons, optimistic updates, toast feedback, and modal flows.

## Getting started

```bash
# install dependencies
npm install

# run the development server
npm run dev

# create a production build
npm run build
```

The development server starts at http://localhost:5173.

## Feature highlights

- **Todo management** – create, edit, complete, and delete todos with optimistic, TanStack Query powered updates.
- **Filtering & sorting** – quick controls for status, due date urgency, keyword search, and multiple sort orders.
- **Accessible modals** – focus-trapped dialogs for the todo form and delete confirmation with full keyboard support.
- **Detail view** – inline expandable region that surfaces the full description, due date, and audit metadata.
- **Responsive layout** – adaptive cards and controls that work seamlessly on desktop and mobile viewports.
- **UX polish** – shimmering skeletons during loading, toast notifications for all mutations, and contextual empty states.

## Project structure

```
src/
  components/        # Shared UI building blocks (modal, confirm dialog, toast system)
  features/
    todos/           # Todo-specific components, API helpers, and type definitions
  providers/         # Application-level providers (TanStack Query)
  utils/             # Cross-cutting helpers (date formatting)
```

The application uses a lightweight in-memory + localStorage backed API (`todoApi`) so that interaction flows behave like a real networked app without requiring an external backend.
