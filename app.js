// カテゴリーの定義
const INCOME_CATEGORIES = ['Googleアドセンス', 'アフィリエイト', 'Udemy', 'グッズ', 'その他'];
const EXPENSE_CATEGORY = 'ブログ経費';
const STORAGE_KEY = 'kamesan_blog_transactions_v4';

let transactions = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];

// DOM要素の取得
const form = document.getElementById('transaction-form');
const typeRadios = document.getElementsByName('type');
const categorySelect = document.getElementById('category');
const amountInput = document.getElementById('amount');
const memoInput = document.getElementById('memo');
const historyList = document.getElementById('history-list');

// 初期化処理
document.addEventListener('DOMContentLoaded', () => {
    updateCategoryOptions('income');
    render();
});

// 区分ラジオボタン変更時のイベント
typeRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
        updateCategoryOptions(e.target.value);
    });
});

// カテゴリー選択肢を動的に生成（「オプションなし」を絶対に防ぐロジック）
function updateCategoryOptions(type = 'income') {
    if (!categorySelect) return;
    
    categorySelect.innerHTML = ''; // 既存選択肢をリセット

    if (type === 'income') {
        INCOME_CATEGORIES.forEach(cat => {
            const opt = document.createElement('option');
            opt.value = cat;
            opt.textContent = cat;
            categorySelect.appendChild(opt);
        });
    } else {
        const opt = document.createElement('option');
        opt.value = EXPENSE_CATEGORY;
        opt.textContent = EXPENSE_CATEGORY;
        categorySelect.appendChild(opt);
    }
}

// データ保存
form.addEventListener('submit', (e) => {
    e.preventDefault();
    const type = Array.from(typeRadios).find(r => r.checked).value;
    
    const newTransaction = {
        id: Date.now(),
        date: new Date().toLocaleDateString('ja-JP'),
        type: type,
        category: categorySelect.value,
        amount: parseInt(amountInput.value, 10),
        memo: memoInput.value
    };

    transactions.unshift(newTransaction);
    saveAndRender();
    
    amountInput.value = '';
    memoInput.value = '';
});

function deleteTransaction(id) {
    if (confirm('この記録を削除しますか？')) {
        transactions = transactions.filter(item => item.id !== id);
        saveAndRender();
    }
}

function saveAndRender() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
    render();
}

function render() {
    let totalIncome = 0;
    let totalExpense = 0;
    const incomeByCategory = {};

    INCOME_CATEGORIES.forEach(cat => incomeByCategory[cat] = 0);

    transactions.forEach(item => {
        if (item.type === 'income') {
            totalIncome += item.amount;
            if (incomeByCategory[item.category] !== undefined) {
                incomeByCategory[item.category] += item.amount;
            }
        } else {
            totalExpense += item.amount;
        }
    });

    const totalBalance = totalIncome - totalExpense;

    document.getElementById('total-balance').textContent = `¥${totalBalance.toLocaleString()}`;
    document.getElementById('total-income').textContent = `¥${totalIncome.toLocaleString()}`;
    document.getElementById('total-expense').textContent = `¥${totalExpense.toLocaleString()}`;

    const categorySummaryEl = document.getElementById('category-summary');
    categorySummaryEl.innerHTML = '';
    INCOME_CATEGORIES.forEach(cat => {
        const itemEl = document.createElement('div');
        itemEl.className = 'category-item';
        itemEl.innerHTML = `
            <div class="name">${cat}</div>
            <div class="amount">¥${incomeByCategory[cat].toLocaleString()}</div>
        `;
        categorySummaryEl.appendChild(itemEl);
    });

    historyList.innerHTML = '';
    if (transactions.length === 0) {
        historyList.innerHTML = `<tr><td colspan="6" style="text-align: center; color: var(--text-muted); padding: 24px;">まだ記録がありません</td></tr>`;
        return;
    }

    transactions.forEach(item => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${item.date}</td>
            <td class="${item.type === 'income' ? 'badge-income' : 'badge-expense'}">
                ${item.type === 'income' ? '収入' : '経費'}
            </td>
            <td>${item.category}</td>
            <td style="font-weight: 700;">¥${item.amount.toLocaleString()}</td>
            <td>${escapeHtml(item.memo)}</td>
            <td><button class="delete-btn" onclick="deleteTransaction(${item.id})">削除</button></td>
        `;
        historyList.appendChild(tr);
    });
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/[&<>"']/g, (m) => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[m]);
}

// CSVエクスポート
document.getElementById('export-btn').addEventListener('click', () => {
    if (transactions.length === 0) {
        alert('保存するデータがありません。');
        return;
    }
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFFid,date,type,category,amount,memo\n';
    transactions.forEach(t => {
        csvContent += `${t.id},${t.date},${t.type},${t.category},${t.amount},"${t.memo}"\n`;
    });
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `blog_balance_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});

// CSVインポート
document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(evt) {
        try {
            const lines = evt.target.result.split('\n');
            const newTransactions = [];
            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const cols = lines[i].split(',');
                newTransactions.push({
                    id: Number(cols[0]),
                    date: cols[1],
                    type: cols[2],
                    category: cols[3],
                    amount: Number(cols[4]),
                    memo: cols[5] ? cols[5].replace(/"/g, '') : ''
                });
            }
            if (confirm('現在のデータを上書きして復元しますか？')) {
                transactions = newTransactions;
                saveAndRender();
                alert('復元が完了しました。');
            }
        } catch (err) {
            alert('CSVの読み込みに失敗しました。');
        }
    };
    reader.readAsText(file);
});
