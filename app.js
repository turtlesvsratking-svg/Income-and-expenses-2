// カテゴリー体系定義
const INCOME_CATEGORIES = ['Googleアドセンス', 'アフィリエイト', 'Udemy', 'グッズ', 'その他'];
const EXPENSE_CATEGORIES = ['経費'];

// Chart.js カラーセット
const CHART_COLORS = ['#2e7d32', '#42a5f5', '#ab47bc', '#ffa726', '#8d6e63'];

// 状態管理変数
let transactions = JSON.parse(localStorage.getItem('kame_transactions')) || [];
let gasUrl = localStorage.getItem('kame_gas_url') || '';
let incomeChart = null;

// DOM要素参照
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
const gasUrlInput = document.getElementById('gas-url');

// 初期化処理
function init() {
  if (gasUrl) {
    gasUrlInput.value = gasUrl;
  }
  updateCategoryOptions();
  initChart();
  render();
}

// GAS URL保持処理
gasUrlInput.addEventListener('change', (e) => {
  gasUrl = e.target.value.trim();
  localStorage.setItem('kame_gas_url', gasUrl);
});

typeSelect.addEventListener('change', updateCategoryOptions);

function updateCategoryOptions() {
  const type = typeSelect.value;
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  
  categorySelect.innerHTML = categories
    .map(cat => `<option value="${cat}">${cat}</option>`)
    .join('');
}

// 新規データの追加登録
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

  // GASバックアップ呼び出し
  if (gasUrl) {
    syncToGas({ action: 'add', data: newTransaction });
  }

  document.getElementById('amount').value = '';
  document.getElementById('memo').value = '';
});

// データの削除
window.deleteTransaction = function(id) {
  const target = transactions.find(t => t.id === id);
  transactions = transactions.filter(t => t.id !== id);
  saveAndRender();

  if (gasUrl && target) {
    syncToGas({ action: 'delete', id: target.id });
  }
};

function saveAndRender() {
  localStorage.setItem('kame_transactions', JSON.stringify(transactions));
  render();
}

// Chart.js 初期化
function initChart() {
  const ctx = document.getElementById('income-chart').getContext('2d');
  incomeChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: INCOME_CATEGORIES,
      datasets: [{
        data: [0, 0, 0, 0, 0],
        backgroundColor: CHART_COLORS,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      }
    }
  });
}

// UI再描画ロジック
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

  totalIncomeEl.textContent = `¥${totalIncome.toLocaleString()}`;
  totalExpenseEl.textContent = `¥${totalExpense.toLocaleString()}`;
  netBalanceEl.textContent = `¥${netBalance.toLocaleString()}`;

  // グラフデータ更新
  if (incomeChart) {
    incomeChart.data.datasets[0].data = INCOME_CATEGORIES.map(cat => categoryTotals[cat]);
    incomeChart.update();
  }

  // カテゴリー別サマリー更新
  categoryBreakdownEl.innerHTML = INCOME_CATEGORIES.map((cat, index) => `
    <div class="category-item" style="border-top: 3px solid ${CHART_COLORS[index]}">
      <span class="cat-name">${cat}</span>
      <span class="cat-amount">¥${categoryTotals[cat].toLocaleString()}</span>
    </div>
  `).join('');

  // 履歴リスト更新
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
        <button class="delete-btn" onclick="deleteTransaction(${t.id})" aria-label="削除">✕</button>
      </div>
    </li>
  `).join('');
}

// GASへの非同期データ送信
async function syncToGas(payload) {
  try {
    await fetch(gasUrl, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    console.error('GAS同期エラー:', err);
  }
}

// JSON出力
exportBtn.addEventListener('click', () => {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(transactions, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute("href", dataStr);
  downloadAnchor.setAttribute("download", `kame_balance_${new Date().toISOString().slice(0,10)}.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
});

// JSON復元
importFileInput.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(event) {
    try {
      const importedData = JSON.parse(event.target.result);
      if (Array.isArray(importedData)) {
        if (confirm('既存のデータを上書きして復元しますか？')) {
          transactions = importedData;
          saveAndRender();
          if (gasUrl) syncToGas({ action: 'bulk', data: transactions });
          alert('データの復元が完了しました。');
        }
      } else {
        alert('不正なファイル形式です。');
      }
    } catch (err) {
      alert('ファイルの読み込みに失敗しました。');
    }
  };
  reader.readAsText(file);
});

// データ全消去
clearBtn.addEventListener('click', () => {
  if (confirm('すべての履歴を消去しますか？この操作は取り消せません。')) {
    transactions = [];
    saveAndRender();
    if (gasUrl) syncToGas({ action: 'clear' });
  }
});

// 初期化実行
init();
