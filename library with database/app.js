// BookNest - Supabase edition
// Add your Supabase Project URL and publishable (anon) key in config.js.
const $ = (id) => document.getElementById(id);
const supabaseClient = window.supabase.createClient(
  window.BOOKNEST_SUPABASE_URL,
  window.BOOKNEST_SUPABASE_ANON_KEY
);
let currentUser = null;
let currentProfile = null;
let cachedBooks = [];

function escapeHTML(value = "") {
  return String(value).replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function message(id, text, error = false) {
  const el = $(id);
  if (!el) return;
  el.textContent = text;
  el.style.color = error ? "#c0392b" : "#16845b";
}
function showTab(tab) {
  document.querySelectorAll(".tab").forEach(b => b.classList.toggle("active", b.dataset.tab === tab));
  $("loginForm").classList.toggle("hidden", tab !== "login");
  $("registerForm").classList.toggle("hidden", tab !== "register");
  message("authMsg", "");
}
document.querySelectorAll(".tab").forEach(b => b.addEventListener("click", () => showTab(b.dataset.tab)));

async function loadProfile(user) {
  const { data, error } = await supabaseClient
    .from("profiles").select("id,full_name,email,role").eq("id", user.id).single();
  if (error) throw error;
  currentProfile = data;
  currentUser = user;
}
async function enterApp(user) {
  try {
    await loadProfile(user);
    $("authView").classList.add("hidden");
    $("appView").classList.remove("hidden");
    $("userBadge").textContent = `${currentProfile.full_name} · ${currentProfile.role}`;
    $("welcomeTitle").textContent = `Hello, ${currentProfile.full_name}!`;
    $("subtitle").textContent = currentProfile.role === "admin" ? "Administrator workspace" : "Welcome to your student library";
    $("adminPanel").classList.toggle("hidden", currentProfile.role !== "admin");
    $("historyTitle").textContent = currentProfile.role === "admin" ? "All borrowing records" : "My borrowing history";
    $("storageNote").textContent = "Connected to Supabase PostgreSQL · Your data is shared securely across signed-in devices.";
    await refreshDashboard();
  } catch (error) {
    console.error(error);
    message("authMsg", `Could not load your profile: ${error.message}. Check that the SQL setup has been run.`, true);
    $("authView").classList.remove("hidden");
    $("appView").classList.add("hidden");
  }
}
async function refreshDashboard() {
  await Promise.all([loadBooks(), loadHistory()]);
}
async function loadBooks() {
  const { data, error } = await supabaseClient.from("books").select("*").order("title");
  if (error) { console.error(error); $("bookList").textContent = error.message; return; }
  cachedBooks = data || [];
  $("bookCount").textContent = cachedBooks.length;
  $("availableCount").textContent = cachedBooks.reduce((sum, b) => sum + b.available_copies, 0);
  renderBooks();
}
function renderBooks() {
  const query = $("searchInput").value.trim().toLowerCase();
  const books = cachedBooks.filter(b =>
    `${b.title} ${b.author} ${b.category} ${b.isbn || ""}`.toLowerCase().includes(query)
  );
  $("bookList").innerHTML = books.length ? books.map(book => `
    <article class="book">
      <div class="bookTop"><div>
        <h3>${escapeHTML(book.title)}</h3>
        <p>By ${escapeHTML(book.author)} · ${escapeHTML(book.category)}</p>
        <p>ISBN: ${escapeHTML(book.isbn || "Not provided")} · ${book.available_copies}/${book.total_copies} available</p>
      </div><span class="pill">${book.available_copies > 0 ? "Available" : "Out of stock"}</span></div>
      ${currentProfile.role === "admin"
        ? `<button class="outline" data-delete="${book.id}">Delete book</button>`
        : `<button class="primary" data-borrow="${book.id}" ${book.available_copies < 1 ? "disabled" : ""}>Borrow book</button>`}
    </article>`).join("") : '<p class="muted">No books found.</p>';
}
$("bookList").addEventListener("click", async (event) => {
  const borrowId = event.target.dataset.borrow;
  const deleteId = event.target.dataset.delete;
  if (borrowId) await borrowBook(Number(borrowId));
  if (deleteId) await deleteBook(Number(deleteId));
});
async function loadHistory() {
  const isAdmin = currentProfile.role === "admin";
  let query = supabaseClient.from("borrow_records")
    .select("id,user_id,book_id,borrowed_at,due_date,returned_at,status,books(title,author),profiles(full_name,email)")
    .order("borrowed_at", { ascending: false });
  if (!isAdmin) query = query.eq("user_id", currentUser.id);
  const { data, error } = await query;
  if (error) { console.error(error); $("historyList").textContent = error.message; return; }
  const records = data || [];
  $("recordCount").textContent = isAdmin
    ? records.filter(r => r.status === "Borrowed").length
    : records.length;
  $("historyList").innerHTML = records.length ? records.map(r => {
    const book = r.books || {};
    const profile = r.profiles || {};
    const borrowed = new Date(r.borrowed_at).toLocaleDateString();
    const due = new Date(r.due_date).toLocaleDateString();
    return `<article class="record">
      <strong>${escapeHTML(book.title || "Book")}</strong>
      <p>By ${escapeHTML(book.author || "Unknown")}${isAdmin ? ` · Student: ${escapeHTML(profile.full_name || profile.email || r.user_id)}` : ""}</p>
      <p>Borrowed: ${borrowed} · Due: ${due}</p>
      <p>Status: <b>${escapeHTML(r.status)}</b>${r.status === "Borrowed" && new Date(r.due_date) < new Date() ? ' · <span class="overdue">Overdue</span>' : ""}</p>
      ${r.status === "Borrowed" ? `<button class="outline" data-return="${r.id}">Mark as returned</button>` : ""}
    </article>`;
  }).join("") : '<p class="muted">No borrowing records yet.</p>';
}
$("historyList").addEventListener("click", async (event) => {
  const id = event.target.dataset.return;
  if (id) await returnBook(id);
});

$("loginForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const button = event.currentTarget.querySelector("button");
  button.disabled = true; button.textContent = "Signing in...";
  const { data: result, error } = await supabaseClient.auth.signInWithPassword({
    email: data.email.trim(), password: data.password
  });
  button.disabled = false; button.textContent = "Login";
  if (error) return message("authMsg", error.message, true);
  await enterApp(result.user);
});
$("registerForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const data = Object.fromEntries(new FormData(event.currentTarget));
  const button = event.currentTarget.querySelector("button");
  button.disabled = true; button.textContent = "Creating account...";
  const { data: result, error } = await supabaseClient.auth.signUp({
    email: data.email.trim(),
    password: data.password,
    options: { data: { full_name: data.name.trim() } }
  });
  button.disabled = false; button.textContent = "Register";
  if (error) return message("authMsg", error.message, true);
  event.currentTarget.reset();
  if (result.session) {
    message("authMsg", "Account created successfully.");
    await enterApp(result.user);
  } else {
    message("authMsg", "Registration successful. Check your email to confirm your account, then log in.");
    showTab("login");
  }
});
$("logoutBtn").addEventListener("click", async () => {
  await supabaseClient.auth.signOut();
  currentUser = null; currentProfile = null;
  $("appView").classList.add("hidden");
  $("authView").classList.remove("hidden");
  $("userBadge").textContent = "";
  showTab("login");
});
$("searchInput").addEventListener("input", renderBooks);

$("bookForm").addEventListener("submit", async (event) => {
  event.preventDefault();
  const d = Object.fromEntries(new FormData(event.currentTarget));
  const copies = Number(d.copies);
  if (!Number.isInteger(copies) || copies < 1) return message("bookMsg", "Enter at least one copy.", true);
  const { error } = await supabaseClient.from("books").insert({
    title: d.title.trim(), author: d.author.trim(), category: d.category.trim(),
    isbn: d.isbn.trim() || null, total_copies: copies, available_copies: copies
  });
  if (error) return message("bookMsg", error.message, true);
  event.currentTarget.reset();
  message("bookMsg", "Book added successfully.");
  await loadBooks();
});
async function borrowBook(bookId) {
  const { error } = await supabaseClient.rpc("borrow_book", { p_book_id: bookId });
  if (error) return alert(error.message);
  alert("Book borrowed successfully! Please return it within 14 days.");
  await refreshDashboard();
}
async function returnBook(recordId) {
  const { error } = await supabaseClient.rpc("return_book", { p_record_id: recordId });
  if (error) return alert(error.message);
  await refreshDashboard();
}
async function deleteBook(bookId) {
  if (!confirm("Delete this book from the catalogue?")) return;
  const { error } = await supabaseClient.from("books").delete().eq("id", bookId);
  if (error) return alert(error.message);
  await loadBooks();
}

(async function init() {
  if (!window.BOOKNEST_SUPABASE_URL || !window.BOOKNEST_SUPABASE_ANON_KEY ||
      window.BOOKNEST_SUPABASE_URL.includes("YOUR_") ||
      window.BOOKNEST_SUPABASE_ANON_KEY.includes("YOUR_")) {
    $("setupWarning").classList.remove("hidden");
    $("loginForm").querySelector("button").disabled = true;
    $("registerForm").querySelector("button").disabled = true;
    return;
  }
  const { data: { session } } = await supabaseClient.auth.getSession();
  if (session) await enterApp(session.user);
  supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === "SIGNED_OUT") {
      currentUser = null; currentProfile = null;
      $("appView").classList.add("hidden"); $("authView").classList.remove("hidden");
    }
  });
})();
