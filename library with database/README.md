# BookNest – Library Management System (Supabase Edition)

A browser-based library management demo using HTML, CSS, JavaScript, Supabase Authentication and Supabase PostgreSQL.

## Features

- Student registration and login through Supabase Auth
- Admin/student roles stored in `profiles`
- Browse and search the shared book catalogue
- Admin can add and delete books
- Students can borrow available books
- 14-day due date is created by the database
- Students can return their own borrowed books; admins can process returns
- Stock count updates in the database
- Students see their own borrowing history; admins see all records
- Row Level Security (RLS) protects database access

## Setup (one-time)

### 1. Create a Supabase project
Create a project at https://supabase.com and wait for it to finish provisioning.

### 2. Create the database
In Supabase, open **SQL Editor → New query**.
Open `supabase-schema.sql`, copy all its contents, paste into the SQL Editor and click **Run**.
This creates the tables, security policies, borrow/return functions and five sample books.

### 3. Connect the website
In Supabase, open **Project Settings → API** (or API Keys).
Copy:
- Project URL
- Publishable key (or legacy anon/public key)

Open `config.js` and replace the two placeholder values:

```js
window.BOOKNEST_SUPABASE_URL = "https://YOUR-PROJECT-REF.supabase.co";
window.BOOKNEST_SUPABASE_ANON_KEY = "YOUR-PUBLISHABLE-OR-ANON-KEY";
```

Only use the browser-safe publishable/anon key. **Never** paste the `service_role` key or a secret key into frontend files.

### 4. Email confirmation setting for a quick classroom demo
If you want newly registered users to log in immediately without checking email:
Supabase → **Authentication → Providers → Email** → turn off **Confirm email** for the demo.
You can leave it enabled if you want users to verify their email. Menu names may vary slightly in the dashboard.

### 5. Create the admin account
First, open the website and register an account using the email you want as the administrator.
Then open Supabase → SQL Editor and run this, replacing the email:

```sql
update public.profiles
set role = 'admin'
where email = 'your-admin-email@example.com';
```

Sign out and sign in again so the app loads the updated role. All accounts registered normally are students by default. Do not make the role editable in the public registration form.

## Run locally

The easiest way is VS Code with the **Live Server** extension:
1. Extract the ZIP.
2. Open the extracted folder in VS Code.
3. Edit `config.js`.
4. Right-click `index.html` → **Open with Live Server**.

You can also run a simple static server from this folder:

```bash
python -m http.server 5500
```

Then visit `http://localhost:5500`.

Opening `index.html` directly may work, but using a local server is recommended.

## Demo flow for presentation

1. Register a student account and sign in.
2. Search for a book and borrow it.
3. Show the available-copy count decreasing.
4. Show the student's borrowing history and 14-day due date.
5. Sign out and sign in with the admin account.
6. Add a new book and show the full borrowing records.
7. Return a book and show the available-copy count increasing.

For a clean demo, use one browser window for the student and another private/incognito window for the admin. Both connect to the same Supabase database.

## Files

```text
booknest-supabase-demo/
├── index.html
├── style.css
├── config.js
├── app.js
├── supabase-schema.sql
└── README.md
```

## Notes

- The frontend is intentionally plain HTML/CSS/JavaScript to match the original project.
- Supabase handles authentication, persistent shared storage and database access control.
- Do not use real sensitive student information in a classroom demo.
- This is a demo foundation, not a complete production library platform. Production deployments should add stronger operational controls, backups, audit logging, rate limits and a managed admin provisioning process.
