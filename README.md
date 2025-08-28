# TaskKeeper

Modern React + Tailwind app to keep track of your tasks. Add tasks, mark them as done, and organize with tags.

## Scripts

- `npm install` – install dependencies
- `npm run dev` – start Vite dev server
- `npm run build` – build for production
- `npm run preview` – preview the production build locally

## Features

- Add tasks with optional comma-separated tags
- Optionally assign a due date to tasks with a native date picker
- Toggle tasks done/undone
- Filter by tag or search by text
- Persist tasks in Supabase
- Switch between light and dark themes
- Toggle the interface language between English and Russian

## Supabase Setup

TaskKeeper uses Supabase to store tasks and tags. Set the following environment variables in a `.env` file:

```
VITE_SUPABASE_URL=your-project-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Create a `tasks` table with the columns:

- `id` (`text` or `uuid`) – primary key
- `text` (`text`) – task description
- `done` (`boolean`) – completion status
- `tags` (`text[]`) – array of tags
- `due_date` (`date`) – optional due date

