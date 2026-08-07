// カテゴリーの設定
const INCOME_CATEGORIES = ['Googleアドセンス', 'アフィリエイト', 'Udemy', 'グッズ', 'その他'];
const EXPENSE_CATEGORIES = ['経費'];

// データ状態の管理
let transactions = JSON.parse(localStorage.getItem('kame_transactions')) || [];

// DOM要素の取得
const typeSelect = document.getElementById('type');
const categorySelect = document.getElementById('category');
const form = document.getElementById('transaction-form');
const totalIncomeEl = document.getElementById('total-income');
const totalExpenseEl = document.getElementById('total-expense');
const netBalanceEl = document.getElementById('net-balance');
const categoryBreakdownEl = document.getElementById('category-breakdown');
const historyListEl = document.getElementById('history-list');
const exportBtn = document.getElementById('export-btn');
const importFileInput = document.getElementById('import-file');
const clearBtn = document.getElementById('clear-btn');

// アプリの初期化
function init() {
  updateCategoryOptions();
  render();
}

typeSelect.addEventListener('change', updateCategoryOptions);

// 種別に応じたカテゴリーの切替
function updateCategoryOptions() {
  const type = typeSelect.value;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  categorySelect.innerHTML = categories
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

// データの追加処理
form.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const type = typeSelect.value;
  const category = categorySelect.value;
  const amount = parseInt(document.getElementById('amount').value, 10);
  const memo = document.getElementById('memo').value.trim();

  if (isNaN(amount) || amount <= 0) return;

  const newTransaction = {
    id: Date.now(),
    type,
    category,
    amount,
    memo,
    date: new Date().toLocaleDateString('ja-JP')
  };

  transactions.unshift(newTransaction);
  saveAndRender();
  
  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
});

// 個別データの削除
function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();
}

// 永続化と画面更新
function saveAndRender() {
  localStorage.setItem('kame_transactions', JSON.stringify(transactions));
  render();
}

// 再描画（計算・内訳・履歴）
function render() {
  let totalIncome = 0;
  let totalExpense = 0;

  const categoryTotals = {};
  INCOME_CATEGORIES.forEach(cat => categoryTotals[cat] = 0);

  transactions.forEach(t => {
    if (t.type === 'income') {
      totalIncome += t.amount;
      if (categoryTotals[t.category] !== undefined) {
        categoryTotals[t.category] += t.amount;
      }
    } else {
      totalExpense += t.amount;
    }
  });

  const netBalance = totalIncome - totalExpense;

  // 各金額の表示更新
  totalIncomeEl.textContent = `¥${totalIncome.toLocaleString()}`;
  totalExpenseEl.textContent = `¥${totalExpense.toLocaleString()}`;
  netBalanceEl.textContent = `¥${netBalance.toLocaleString()}`;

  // 内訳の更新
  categoryBreakdownEl.innerHTML = INCOME_CATEGORIES.map(cat => `
    <div class="category-item">
      <span class="cat-name">${cat}</span>
      <span class="cat-amount">¥${categoryTotals[cat].toLocaleString()}</span>
    </div>
  `).join('');

  // 履歴の更新
  historyListEl.innerHTML = transactions.map(t => `
    <li class="history-item">
      <div class="history-info">
        <span class="date">${t.date}</span>
        <span class="tag">${t.category}</span>
        <span>${t.memo ? t.memo : ''}</span>
      </div>
      <div>
        <strong style="color: ${t.type === 'income' ? 'var(--income-color)' : 'var(--expense-color)'}">
          ${t.type === 'income' ? '+' : '-'}¥${t.amount.toLocaleString()}
        </strong>
        <button class="delete-btn" onclick="deleteTransaction(${t.id})">✕</button>
      </div>
    </li>
  `).join('');
}

// バックアップファイル（JSON）のダウンロード
exportBtn.addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `kame_balance_backup_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// JSONファイルからの復元
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        if (confirm('現在のデータを上書きして復元しますか？')) {
          transactions = importedData;
          saveAndRender();
          alert('データの復元が完了しました。');
        }
      } else {
        alert('無効なファイル形式です。');
      }
    } catch (err) {
      alert('ファイルの読み込みに失敗しました。');
    }
  };
  reader.readAsText(file);
});

// 全データのクリア
clearBtn.addEventListener('click', () => {
  if (confirm('すべての履歴を消去しますか？この操作は取り消せません。')) {
    transactions = [];
    saveAndRender();
  }
});

// アプリの起動
init();
