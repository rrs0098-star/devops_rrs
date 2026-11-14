const STORAGE_KEY = "penny-finance-v1";
const colors = ["#4e8668", "#e8bd62", "#8ca8c2", "#d78a73", "#a196c0", "#78a6a0"];
const categoryMeta = {
  Food: { icon: "◒", color: "#e8bd62" },
  Rent: { icon: "⌂", color: "#8ca8c2" },
  Transport: { icon: "↗", color: "#d78a73" },
  Bills: { icon: "ϟ", color: "#a196c0" },
  Shopping: { icon: "◇", color: "#78a6a0" },
  Health: { icon: "✚", color: "#8ab293" },
  Entertainment: { icon: "♫", color: "#d99877" },
  Salary: { icon: "↙", color: "#57916b" },
  Freelance: { icon: "✳", color: "#7d9bb4" },
  Other: { icon: "•", color: "#a9b0aa" }
};
const defaultBudgets = [
  { category: "Food", limit: 12000 },
  { category: "Rent", limit: 18000 },
  { category: "Transport", limit: 5000 },
  { category: "Shopping", limit: 8000 }
];

const localDateString = date => [
  date.getFullYear(),
  String(date.getMonth() + 1).padStart(2, "0"),
  String(date.getDate()).padStart(2, "0")
].join("-");
const dateInMonth = (day, offset = 0) => {
  const now = new Date();
  return localDateString(new Date(now.getFullYear(), now.getMonth() + offset, day));
};
const starterTransactions = [
  { id: "demo-1", name: "Monthly salary", category: "Salary", type: "income", amount: 65000, date: dateInMonth(1), account: "Everyday account", note: "Monthly salary" },
  { id: "demo-2", name: "Apartment rent", category: "Rent", type: "expense", amount: 18000, date: dateInMonth(2), account: "Everyday account", note: "Apartment rent" },
  { id: "demo-3", name: "Groceries at FreshMart", category: "Food", type: "expense", amount: 2340, date: dateInMonth(4), account: "Credit card", note: "Groceries at FreshMart" },
  { id: "demo-4", name: "Metro card recharge", category: "Transport", type: "expense", amount: 750, date: dateInMonth(6), account: "Cash wallet", note: "Metro card recharge" },
  { id: "demo-5", name: "Electricity bill", category: "Bills", type: "expense", amount: 1850, date: dateInMonth(8), account: "Everyday account", note: "Electricity bill" },
  { id: "demo-6", name: "Weekend brunch", category: "Food", type: "expense", amount: 1250, date: dateInMonth(10), account: "Credit card", note: "Weekend brunch" },
  { id: "demo-7", name: "Design project", category: "Freelance", type: "income", amount: 12000, date: dateInMonth(12), account: "Everyday account", note: "Design project" },
  { id: "demo-8", name: "New running shoes", category: "Shopping", type: "expense", amount: 3200, date: dateInMonth(12), account: "Credit card", note: "New running shoes" },
  { id: "demo-9", name: "Pharmacy", category: "Health", type: "expense", amount: 640, date: dateInMonth(13), account: "Cash wallet", note: "Pharmacy" }
];

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (stored && Array.isArray(stored.transactions) && Array.isArray(stored.budgets)) return stored;
  } catch (error) {
    console.warn("Saved finance data could not be read; starting with sample data.", error);
  }
  return { transactions: starterTransactions, budgets: defaultBudgets, currency: "INR" };
}

let state = loadState();
let activeType = "expense";
let editingId = null;
let toastTimer;
const transactionDialog = document.querySelector("#transaction-dialog");
const budgetDialog = document.querySelector("#budget-dialog");
const transactionForm = document.querySelector("#transaction-form");
const budgetForm = document.querySelector("#budget-form");

const formatMoney = amount => new Intl.NumberFormat("en-IN", {
  style: "currency", currency: state.currency || "INR", maximumFractionDigits: 0
}).format(amount || 0);
const formatDate = value => new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short" }).format(new Date(`${value}T00:00:00`));
const today = () => localDateString(new Date());
const currentMonthTransactions = () => {
  const now = new Date();
  return state.transactions.filter(tx => {
    const date = new Date(`${tx.date}T00:00:00`);
    return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
  });
};
const escapeHTML = value => String(value).replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
})[char]);

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    showToast("Could not save your changes in this browser.");
    console.error("Could not save finance data.", error);
    return false;
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("visible"), 2800);
}

function categoryIcon(category) {
  return (categoryMeta[category] || categoryMeta.Other).icon;
}

function getTotals(transactions) {
  return transactions.reduce((totals, transaction) => {
    totals[transaction.type] += Number(transaction.amount) || 0;
    return totals;
  }, { income: 0, expense: 0 });
}

function renderSummary() {
  const transactions = currentMonthTransactions();
  const totals = getTotals(transactions);
  const allTimeTotals = getTotals(state.transactions);
  const savings = totals.income - totals.expense;
  const rate = totals.income ? Math.max(0, Math.round(savings / totals.income * 100)) : 0;
  document.querySelector("#income-value").textContent = formatMoney(totals.income);
  document.querySelector("#expense-value").textContent = formatMoney(totals.expense);
  document.querySelector("#balance-value").textContent = formatMoney(124800 + allTimeTotals.income - allTimeTotals.expense);
  document.querySelector("#saved-value").textContent = formatMoney(savings);
  document.querySelector("#savings-rate").textContent = `${rate}%`;
  document.querySelector("#savings-progress").style.width = `${Math.min(rate, 100)}%`;
  document.querySelector("#donut-total").textContent = formatMoney(totals.expense);
  const spending = transactions.filter(tx => tx.type === "expense").reduce((byCategory, tx) => {
    byCategory[tx.category] = (byCategory[tx.category] || 0) + Number(tx.amount);
    return byCategory;
  }, {});
  const sortedCategories = Object.entries(spending).sort((a, b) => b[1] - a[1]);
  const chartCategories = sortedCategories.slice(0, 5);
  if (!chartCategories.length) {
    document.querySelector("#donut-chart").style.background = "#edf0ed";
    document.querySelector("#category-legend").innerHTML = '<div class="legend-row">No expenses yet <strong>—</strong></div>';
  } else {
    let offset = 0;
    const gradient = chartCategories.map(([name, value], index) => {
      const start = offset;
      offset += value / totals.expense * 100;
      return `${categoryMeta[name]?.color || colors[index % colors.length]} ${start}% ${offset}%`;
    }).join(", ");
    document.querySelector("#donut-chart").style.background = `conic-gradient(${gradient})`;
    document.querySelector("#category-legend").innerHTML = chartCategories.map(([name, value], index) => `
      <div class="legend-row"><i style="background:${categoryMeta[name]?.color || colors[index % colors.length]}"></i>
        <span>${escapeHTML(name)}</span><strong>${Math.round(value / totals.expense * 100)}%</strong></div>`).join("");
  }
  const note = savings >= 0 ? "Your spending is looking good this month." : "You’ve spent more than you’ve earned this month.";
  document.querySelector("#spending-footer").textContent = note;
  document.querySelector("#insight-title").textContent = savings >= 0 ? "You’re doing great." : "Let’s take a closer look.";
  document.querySelector("#insight-message").textContent = savings >= 0
    ? "A little awareness today makes for a lot less stress tomorrow."
    : "A quick budget check can help you feel back in control.";
}

function renderBudgets() {
  const transactions = currentMonthTransactions().filter(tx => tx.type === "expense");
  const totalBudget = state.budgets.reduce((sum, budget) => sum + Number(budget.limit), 0);
  const spent = transactions.reduce((sum, tx) => sum + Number(tx.amount), 0);
  const overallProgress = totalBudget ? Math.min(spent / totalBudget * 100, 100) : 0;
  document.querySelector("#budget-total").textContent = formatMoney(totalBudget);
  document.querySelector("#budget-remaining").textContent = formatMoney(Math.max(0, totalBudget - spent));
  document.querySelector("#overall-progress").style.width = `${overallProgress}%`;
  document.querySelector("#budget-list").innerHTML = state.budgets.slice(0, 3).map(budget => {
    const categorySpent = transactions.filter(tx => tx.category === budget.category).reduce((sum, tx) => sum + Number(tx.amount), 0);
    const progress = budget.limit ? categorySpent / budget.limit * 100 : 0;
    const status = progress > 100 ? "over" : progress >= 80 ? "warning" : "";
    return `<div class="budget-row">
      <span class="category-icon">${categoryIcon(budget.category)}</span>
      <div class="budget-row-main">
        <div class="budget-row-title"><span>${escapeHTML(budget.category)}</span><strong>${formatMoney(categorySpent)} / ${formatMoney(budget.limit)}</strong></div>
        <div class="budget-row-track"><i class="${status}" style="width:${Math.min(progress, 100)}%"></i></div>
      </div><span class="sr-only">${Math.round(progress)}% of budget spent</span>
    </div>`;
  }).join("");
  document.querySelector("#add-budget-button").hidden = state.budgets.length >= 5;
}

function renderTransactions() {
  const search = document.querySelector("#transaction-search").value.trim().toLowerCase();
  const selectedCategory = document.querySelector("#category-filter").value;
  const filtered = state.transactions.filter(tx => {
    const matchesText = !search || [tx.name, tx.note, tx.category, tx.account].some(value => String(value || "").toLowerCase().includes(search));
    return matchesText && (!selectedCategory || tx.category === selectedCategory);
  }).sort((a, b) => b.date.localeCompare(a.date));
  const visible = filtered.slice(0, 8);
  document.querySelector("#transaction-rows").innerHTML = visible.map(tx => {
    const categoryColor = categoryMeta[tx.category]?.color || "#a9b0aa";
    const amountPrefix = tx.type === "income" ? "+" : "−";
    return `<tr>
      <td><div class="transaction-name"><span class="transaction-icon">${categoryIcon(tx.category)}</span><span><strong>${escapeHTML(tx.name || tx.note || tx.category)}</strong><small>${escapeHTML(tx.note || tx.category)}</small></span></div></td>
      <td><span class="category-chip"><i style="background:${categoryColor}"></i>${escapeHTML(tx.category)}</span></td>
      <td>${formatDate(tx.date)}</td><td>${escapeHTML(tx.account)}</td>
      <td class="amount-cell ${tx.type}">${amountPrefix}${formatMoney(Number(tx.amount)).replace(/^−/, "")}</td>
      <td><div class="row-actions"><button class="row-action" type="button" data-edit="${escapeHTML(tx.id)}" aria-label="Edit ${escapeHTML(tx.name)}">✎</button><button class="row-action" type="button" data-delete="${escapeHTML(tx.id)}" aria-label="Delete ${escapeHTML(tx.name)}">×</button></div></td>
    </tr>`;
  }).join("");
  document.querySelector("#empty-state").hidden = filtered.length !== 0;
  document.querySelector("#transaction-count").textContent = filtered.length > 8
    ? `Showing 8 of ${filtered.length} transactions`
    : `Showing ${filtered.length} transaction${filtered.length === 1 ? "" : "s"}`;
  document.querySelector("#view-all-button").hidden = filtered.length <= 8;
}

function renderCategoryOptions() {
  const allCategories = Object.keys(categoryMeta);
  const categories = [...new Set([...allCategories, ...state.transactions.map(tx => tx.category)])];
  const categoryFilter = document.querySelector("#category-filter");
  const previous = categoryFilter.value;
  categoryFilter.innerHTML = '<option value="">All categories</option>' + categories.map(category => `<option>${escapeHTML(category)}</option>`).join("");
  categoryFilter.value = previous;
  const formCategory = document.querySelector("#form-category");
  formCategory.innerHTML = categories.map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("");
  document.querySelector("#budget-category").innerHTML = categories.filter(category => category !== "Salary" && category !== "Freelance")
    .map(category => `<option value="${escapeHTML(category)}">${escapeHTML(category)}</option>`).join("");
}

function renderTrend() {
  const now = new Date();
  const monthNames = [];
  for (let offset = 5; offset >= 0; offset--) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    monthNames.push({ date, label: new Intl.DateTimeFormat("en", { month: "short" }).format(date) });
  }
  const monthly = monthNames.map(({ date, label }) => {
    const totals = getTotals(state.transactions.filter(tx => {
      const txDate = new Date(`${tx.date}T00:00:00`);
      return txDate.getFullYear() === date.getFullYear() && txDate.getMonth() === date.getMonth();
    }));
    return { label, income: totals.income, expense: totals.expense, current: date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear() };
  });
  const max = Math.max(80000, ...monthly.flatMap(item => [item.income, item.expense]));
  document.querySelector("#trend-chart").innerHTML = monthly.map(item => `
    <div class="bar-group ${item.current ? "current" : ""}" title="${item.label}: income ${formatMoney(item.income)}, expenses ${formatMoney(item.expense)}">
      <div class="bars-pair"><i style="height:${Math.max(2, item.income / max * 92)}px"></i><i style="height:${Math.max(2, item.expense / max * 92)}px"></i></div><span>${item.label}</span>
    </div>`).join("");
}

function render() {
  renderSummary();
  renderBudgets();
  renderTransactions();
  renderCategoryOptions();
  renderTrend();
}

function openTransactionDialog(transaction = null) {
  editingId = transaction?.id || null;
  transactionForm.reset();
  renderCategoryOptions();
  document.querySelector("#dialog-title").textContent = transaction ? "Edit transaction" : "Add transaction";
  document.querySelector("#save-transaction").innerHTML = transaction ? "Save changes <span>→</span>" : "Save transaction <span>→</span>";
  document.querySelector("#amount-input").value = transaction?.amount ?? "";
  transactionForm.elements.date.value = transaction?.date || today();
  transactionForm.elements.note.value = transaction?.note || "";
  transactionForm.elements.account.value = transaction?.account || "Everyday account";
  document.querySelector("#form-category").value = transaction?.category || (activeType === "income" ? "Salary" : "Food");
  setType(transaction?.type || "expense");
  transactionDialog.showModal();
  document.querySelector("#amount-input").focus();
}

function setType(type) {
  activeType = type;
  document.querySelectorAll(".type-option").forEach(button => button.classList.toggle("selected", button.dataset.type === type));
  const categorySelect = document.querySelector("#form-category");
  if (type === "income" && !["Salary", "Freelance"].includes(categorySelect.value)) categorySelect.value = "Salary";
  if (type === "expense" && ["Salary", "Freelance"].includes(categorySelect.value)) categorySelect.value = "Food";
}

document.querySelectorAll("[data-open-dialog]").forEach(button => button.addEventListener("click", () => openTransactionDialog()));
document.querySelectorAll("[data-close-dialog]").forEach(button => button.addEventListener("click", () => {
  transactionDialog.close();
  budgetDialog.close();
}));
document.querySelectorAll(".type-option").forEach(button => button.addEventListener("click", () => setType(button.dataset.type)));
transactionForm.addEventListener("submit", event => {
  event.preventDefault();
  const data = new FormData(transactionForm);
  const amount = Number(data.get("amount"));
  if (!Number.isFinite(amount) || amount <= 0) {
    showToast("Enter an amount greater than zero.");
    return;
  }
  const category = String(data.get("category"));
  const beforeSpent = currentMonthTransactions().filter(tx => tx.id !== editingId && tx.type === "expense" && tx.category === category)
    .reduce((sum, tx) => sum + Number(tx.amount), 0);
  const transaction = {
    id: editingId || `tx-${Date.now()}`,
    name: String(data.get("note") || category),
    category,
    type: activeType,
    amount,
    date: String(data.get("date")),
    account: String(data.get("account")),
    note: String(data.get("note") || category)
  };
  if (editingId) {
    state.transactions = state.transactions.map(tx => tx.id === editingId ? transaction : tx);
  } else {
    state.transactions.push(transaction);
  }
  const saved = saveState();
  transactionDialog.close();
  render();
  if (!saved) return;
  const crossedBudget = activeType === "expense" && transaction.date.slice(0, 7) === today().slice(0, 7)
    ? state.budgets.find(budget => budget.category === category && beforeSpent < budget.limit * 0.8 && beforeSpent + amount >= budget.limit * 0.8)
    : null;
  if (crossedBudget && beforeSpent + amount >= crossedBudget.limit) {
    showToast(`Budget alert: ${category} is over its limit.`);
  } else if (crossedBudget) {
    showToast(`Budget alert: ${category} has reached 80% of its budget.`);
  } else {
    showToast(editingId ? "Transaction updated." : "Transaction added.");
  }
});

document.querySelector("#transaction-rows").addEventListener("click", event => {
  const editButton = event.target.closest("[data-edit]");
  const deleteButton = event.target.closest("[data-delete]");
  if (editButton) {
    const transaction = state.transactions.find(tx => tx.id === editButton.dataset.edit);
    if (transaction) openTransactionDialog(transaction);
  }
  if (deleteButton) {
    state.transactions = state.transactions.filter(tx => tx.id !== deleteButton.dataset.delete);
    const saved = saveState();
    render();
    if (saved) showToast("Transaction deleted.");
  }
});
document.querySelector("#transaction-search").addEventListener("input", renderTransactions);
document.querySelector("#category-filter").addEventListener("change", renderTransactions);
document.querySelector("#view-all-button").addEventListener("click", event => {
  const expanded = event.currentTarget.dataset.expanded === "true";
  event.currentTarget.dataset.expanded = String(!expanded);
  if (!expanded) {
    const rows = document.querySelector("#transaction-rows");
    const search = document.querySelector("#transaction-search").value.trim().toLowerCase();
    const category = document.querySelector("#category-filter").value;
    const filtered = state.transactions.filter(tx => (!search || [tx.name, tx.note, tx.category, tx.account].some(value => String(value || "").toLowerCase().includes(search))) && (!category || tx.category === category)).sort((a, b) => b.date.localeCompare(a.date));
    rows.innerHTML = filtered.map(tx => {
      const amountPrefix = tx.type === "income" ? "+" : "−";
      return `<tr><td><div class="transaction-name"><span class="transaction-icon">${categoryIcon(tx.category)}</span><span><strong>${escapeHTML(tx.name)}</strong><small>${escapeHTML(tx.note)}</small></span></div></td><td><span class="category-chip"><i style="background:${categoryMeta[tx.category]?.color || "#a9b0aa"}"></i>${escapeHTML(tx.category)}</span></td><td>${formatDate(tx.date)}</td><td>${escapeHTML(tx.account)}</td><td class="amount-cell ${tx.type}">${amountPrefix}${formatMoney(Number(tx.amount)).replace(/^−/, "")}</td><td><div class="row-actions"><button class="row-action" type="button" data-edit="${escapeHTML(tx.id)}" aria-label="Edit ${escapeHTML(tx.name)}">✎</button><button class="row-action" type="button" data-delete="${escapeHTML(tx.id)}" aria-label="Delete ${escapeHTML(tx.name)}">×</button></div></td></tr>`;
    }).join("");
    event.currentTarget.innerHTML = "Show less <span>↑</span>";
    document.querySelector("#transaction-count").textContent = `Showing ${filtered.length} transactions`;
  } else {
    renderTransactions();
    event.currentTarget.innerHTML = "View all <span>→</span>";
    event.currentTarget.dataset.expanded = "false";
  }
});

document.querySelector("#add-budget-button").addEventListener("click", () => {
  budgetForm.reset();
  renderCategoryOptions();
  const available = [...document.querySelector("#budget-category").options].find(option => !state.budgets.some(budget => budget.category === option.value));
  if (!available) {
    showToast("All available categories already have a budget.");
    return;
  }
  document.querySelector("#budget-category").value = available.value;
  budgetDialog.showModal();
});
document.querySelector("#edit-budget-button").addEventListener("click", () => {
  if (state.budgets.length) {
    const budget = state.budgets[0];
    document.querySelector("#budget-category").value = budget.category;
    budgetForm.elements.limit.value = budget.limit;
    budgetDialog.showModal();
  } else {
    document.querySelector("#add-budget-button").click();
  }
});
budgetForm.addEventListener("submit", event => {
  event.preventDefault();
  const category = document.querySelector("#budget-category").value;
  const limit = Number(budgetForm.elements.limit.value);
  if (!category || !Number.isFinite(limit) || limit <= 0) {
    showToast("Choose a category and enter a valid limit.");
    return;
  }
  const existing = state.budgets.find(budget => budget.category === category);
  if (existing) existing.limit = limit;
  else state.budgets.push({ category, limit });
  const saved = saveState();
  budgetDialog.close();
  render();
  if (!saved) return;
  showToast("Budget saved.");
});

function toCSV(transactions) {
  const fields = ["date", "type", "amount", "category", "account", "note"];
  const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  return [fields.join(","), ...transactions.map(tx => fields.map(field => quote(tx[field])).join(","))].join("\r\n");
}

document.querySelector("#export-button").addEventListener("click", () => {
  const blob = new Blob([toCSV(state.transactions)], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `penny-transactions-${today()}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
  showToast("Your CSV export is ready.");
});
document.querySelector("#import-button").addEventListener("click", () => document.querySelector("#csv-input").click());
document.querySelector("#csv-input").addEventListener("change", async event => {
  const file = event.target.files[0];
  if (!file) return;
  try {
    const text = await file.text();
    const rows = parseCSV(text);
    if (rows.length < 2) throw new Error("The CSV must include a header and at least one transaction.");
    const headers = rows[0].map(header => header.trim().toLowerCase());
    const indexOf = names => headers.findIndex(header => names.includes(header));
    const dateIndex = indexOf(["date", "transaction date"]);
    const amountIndex = indexOf(["amount", "value"]);
    const noteIndex = indexOf(["note", "description", "merchant", "name"]);
    const categoryIndex = indexOf(["category"]);
    const typeIndex = indexOf(["type"]);
    const accountIndex = indexOf(["account"]);
    if (dateIndex < 0 || amountIndex < 0) throw new Error("Include columns named Date and Amount to import.");
    const imported = rows.slice(1).filter(row => row.length > 1).map((row, index) => {
      const amount = Math.abs(Number(String(row[amountIndex] || "").replace(/[₹,\s]/g, "")));
      const parsedDate = new Date(row[dateIndex]);
      if (!Number.isFinite(amount) || amount <= 0 || Number.isNaN(parsedDate.getTime())) return null;
      const note = (noteIndex >= 0 && row[noteIndex] ? row[noteIndex] : "Imported transaction").trim();
      const category = categoryIndex >= 0 && row[categoryIndex] ? row[categoryIndex].trim() : "Other";
      const type = typeIndex >= 0 && /income|credit/i.test(row[typeIndex]) ? "income" : "expense";
      const date = /^\d{4}-\d{2}-\d{2}$/.test(row[dateIndex]) ? row[dateIndex] : localDateString(parsedDate);
      const duplicate = state.transactions.some(tx => tx.date === date && Number(tx.amount) === amount && String(tx.note || "").toLowerCase() === note.toLowerCase());
      return { id: `import-${Date.now()}-${index}`, name: note, note, category, type, amount, date, account: accountIndex >= 0 && row[accountIndex] ? row[accountIndex] : "Everyday account", duplicate };
    }).filter(Boolean);
    const accepted = imported.filter(tx => !tx.duplicate);
    state.transactions.push(...accepted.map(({ duplicate, ...tx }) => tx));
    const saved = saveState();
    render();
    if (!saved) return;
    showToast(`${accepted.length} imported${imported.length > accepted.length ? `, ${imported.length - accepted.length} duplicate(s) skipped` : ""}.`);
    if (!accepted.length) showToast("No new transactions to import.");
  } catch (error) {
    console.error("CSV import failed.", error);
    showToast(error.message || "Could not read this CSV file.");
  } finally {
    event.target.value = "";
  }
});

function parseCSV(text) {
  const rows = [];
  let row = [];
  let value = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (char === '"' && quoted && input[index + 1] === '"') {
      value += '"';
      index++;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(value);
      value = "";
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && input[index + 1] === "\n") index++;
      row.push(value);
      if (row.some(cell => cell.trim())) rows.push(row);
      row = [];
      value = "";
    } else {
      value += char;
    }
  }
  if (value.length || row.length) {
    row.push(value);
    if (row.some(cell => cell.trim())) rows.push(row);
  }
  return rows;
}

document.querySelectorAll(".nav-link").forEach(link => link.addEventListener("click", () => {
  document.querySelectorAll(".nav-link").forEach(item => item.classList.toggle("active", item === link));
}));
document.querySelector("#month-label").textContent = new Intl.DateTimeFormat("en", { month: "long", year: "numeric" }).format(new Date());
document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("en", { weekday: "long", month: "long", day: "numeric" }).format(new Date()).toUpperCase();
document.addEventListener("keydown", event => {
  if ((event.key.toLowerCase() === "n" && !event.ctrlKey && !event.metaKey && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName)) || (event.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement.tagName))) {
    event.preventDefault();
    openTransactionDialog();
  }
  if (event.key === "Escape") {
    transactionDialog.close();
    budgetDialog.close();
  }
});

render();
