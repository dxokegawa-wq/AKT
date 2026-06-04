// App State & Data Management
let appStores = [];
let appChecklist = [];
const ADMIN_PASSWORD = "admin";

const state = {
  date: '',
  edition: 'all',
  evaluator: '',
  routeIndex: 0,
  currentCategory: '',
  answers: {} // { storeName: { qId: { score: number, comment: string, photo: string, temperature: string, humidity: string, storeComment: string, staffName: string, staffPosition: string, staffReason: string } } }
};

// --- IndexedDB Wrapper for State ---
const DB_NAME = 'AKTScoringDB';
const STORE_NAME = 'appState';
const STATE_ID = 'mainState';

function initDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onerror = (e) => reject(e);
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
}

async function saveStateToIDB() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(state, STATE_ID);
  } catch(e) {
    console.error("IDB save error", e);
  }
}

async function loadStateFromIDB() {
  try {
    const db = await initDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const saved = await new Promise((resolve) => {
      const req = store.get(STATE_ID);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    });
    if (saved) {
      Object.assign(state, saved);
      return true;
    }
  } catch(e) {
    console.error("IDB load error", e);
  }
  return false;
}

// DOM Elements
const screens = {
  setup: document.getElementById('screen-setup'),
  scoring: document.getElementById('screen-scoring'),
  result: document.getElementById('screen-result'),
  admin: document.getElementById('screen-admin')
};

// Top Screen Elements
const dateSelect = document.getElementById('date-select');
const editionSelect = document.getElementById('edition-select');
const evaluatorInput = document.getElementById('evaluator-name');
const btnStart = document.getElementById('btn-start');
const routeCount = document.getElementById('route-count');
const routePreviewList = document.getElementById('route-preview-list');

// Header Elements
const currentStoreHeader = document.getElementById('current-store-header');
const headerScoreDiv = document.getElementById('header-score');
const totalScoreDisplay = document.getElementById('total-score-display');
const btnOpenAdmin = document.getElementById('btn-open-admin');

// Scoring Screen Elements
const storeProgressText = document.getElementById('store-progress-text');
const categoryTabs = document.getElementById('category-tabs');
const questionsContainer = document.getElementById('questions-container');
const btnNextStore = document.getElementById('btn-next-store');
const btnFinish = document.getElementById('btn-finish');

// Store Summary Elements
const storeCommentInput = document.getElementById('store-comment');
const staffNameInput = document.getElementById('staff-name');
const staffPositionInput = document.getElementById('staff-position');
const staffReasonInput = document.getElementById('staff-reason');
const staffSummarySection = document.getElementById('staff-summary-section');

// Result Screen Elements
const btnDownloadExcel = document.getElementById('btn-download-excel');
const btnBackToSetup = document.getElementById('btn-back-to-setup');

// Admin Elements
const passwordModal = document.getElementById('password-modal');
const adminPasswordInput = document.getElementById('admin-password-input');
const btnSubmitPassword = document.getElementById('btn-submit-password');
const btnCancelPassword = document.getElementById('btn-cancel-password');
const btnCloseAdmin = document.getElementById('btn-close-admin');

const tabAdminRoute = document.getElementById('tab-admin-route');
const tabAdminChecklist = document.getElementById('tab-admin-checklist');
const viewAdminRoute = document.getElementById('admin-route-view');
const viewAdminChecklist = document.getElementById('admin-checklist-view');

const adminRouteList = document.getElementById('admin-route-list');
const newStoreInput = document.getElementById('new-store-input');
const btnAddStore = document.getElementById('btn-add-store');

const adminCategoriesContainer = document.getElementById('admin-categories-container');
const btnAddCategory = document.getElementById('btn-add-category');
const btnSaveAdmin = document.getElementById('btn-save-admin');
const btnResetAdmin = document.getElementById('btn-reset-admin');

// Initialize
async function init() {
  loadData();
  
  const hasSavedState = await loadStateFromIDB();
  
  if (hasSavedState && state.date) {
    dateSelect.value = state.date;
    editionSelect.value = state.edition;
    evaluatorInput.value = state.evaluator;
    
    if (state.routeIndex < appStores.length) {
      loadStoreScoring();
      switchScreen('scoring');
    } else {
      switchScreen('result');
    }
  } else {
    const now = new Date();
    dateSelect.value = now.toISOString().split('T')[0];
    switchScreen('setup');
  }

  renderRoutePreview();

  // Events
  btnStart.addEventListener('click', startScoringSequence);
  btnNextStore.addEventListener('click', () => handleStoreCompletion(false));
  btnFinish.addEventListener('click', () => handleStoreCompletion(true));
  btnBackToSetup.addEventListener('click', resetApp);
  btnDownloadExcel.addEventListener('click', exportToExcelAll);

  // Admin Events
  btnOpenAdmin.addEventListener('click', () => { passwordModal.classList.remove('hidden'); adminPasswordInput.value = ''; });
  btnCancelPassword.addEventListener('click', () => passwordModal.classList.add('hidden'));
  btnSubmitPassword.addEventListener('click', verifyPassword);
  btnCloseAdmin.addEventListener('click', () => switchScreen('setup'));
  
  tabAdminRoute.addEventListener('click', () => switchAdminTab('route'));
  tabAdminChecklist.addEventListener('click', () => switchAdminTab('checklist'));

  btnAddStore.addEventListener('click', adminAddStore);
  btnAddCategory.addEventListener('click', adminAddCategory);
  btnSaveAdmin.addEventListener('click', saveAdminData);
  btnResetAdmin.addEventListener('click', resetAdminData);
}

// Data Management
function loadData() {
  const savedStores = localStorage.getItem('akt_stores');
  const savedChecklist = localStorage.getItem('akt_checklist');
  
  if (savedStores) {
    appStores = JSON.parse(savedStores);
  } else {
    appStores = JSON.parse(JSON.stringify(typeof stores !== 'undefined' ? stores : []));
  }

  if (savedChecklist) {
    appChecklist = JSON.parse(savedChecklist);
  } else {
    appChecklist = JSON.parse(JSON.stringify(typeof checklistData !== 'undefined' ? checklistData : []));
  }
}

function saveDataToLocal() {
  localStorage.setItem('akt_stores', JSON.stringify(appStores));
  localStorage.setItem('akt_checklist', JSON.stringify(appChecklist));
}

// UI Helpers
function switchScreen(screenName) {
  Object.values(screens).forEach(s => s.classList.remove('active'));
  screens[screenName].classList.add('active');
  
  if (screenName === 'scoring') {
    headerScoreDiv.classList.remove('hidden');
    currentStoreHeader.classList.remove('hidden');
  } else {
    headerScoreDiv.classList.add('hidden');
    currentStoreHeader.classList.add('hidden');
  }
}

// Route Preview
function renderRoutePreview() {
  routeCount.textContent = appStores.length;
  routePreviewList.innerHTML = '';
  appStores.forEach(s => {
    const li = document.createElement('li');
    li.textContent = s;
    routePreviewList.appendChild(li);
  });
}

// Core Scoring Logic
async function startScoringSequence() {
  if (appStores.length === 0) {
    alert("巡回する店舗が設定されていません。管理者設定から店舗を追加してください。");
    return;
  }
  if (!dateSelect.value) {
    alert("審査日を選択してください。");
    return;
  }
  if (!evaluatorInput.value.trim()) {
    alert("審査員名を入力してください。");
    return;
  }

  state.date = dateSelect.value;
  state.edition = editionSelect.value;
  state.evaluator = evaluatorInput.value.trim();
  state.routeIndex = 0;
  state.answers = {};
  
  appStores.forEach(s => { 
    state.answers[s] = {
      storeComment: '',
      staffName: '',
      staffPosition: '',
      staffReason: ''
    }; 
  });
  
  await saveStateToIDB();

  loadStoreScoring();
  switchScreen('scoring');
}

function getFilteredChecklist() {
  const storeName = appStores[state.routeIndex];
  
  if (storeName === '本部') {
    if (state.edition === 'hall') return [];
    return appChecklist.filter(cat => cat.edition === 'hq');
  }

  if (state.edition === 'all') {
    return appChecklist.filter(cat => cat.edition !== 'hq');
  }
  
  return appChecklist.filter(cat => (cat.edition === 'both' || cat.edition === state.edition || !cat.edition) && cat.edition !== 'hq');
}

function loadStoreScoring() {
  const storeName = appStores[state.routeIndex];
  
  currentStoreHeader.textContent = `現在: ${storeName}`;
  storeProgressText.textContent = `${storeName} の審査 (${state.routeIndex + 1} / ${appStores.length} 店舗)`;
  
  if (state.routeIndex < appStores.length - 1) {
    btnNextStore.classList.remove('hidden');
    btnFinish.classList.add('hidden');
  } else {
    btnNextStore.classList.add('hidden');
    btnFinish.classList.remove('hidden');
  }

  let storeAnswers = state.answers[storeName];
  if (!storeAnswers) {
    storeAnswers = { storeComment: '', staffName: '', staffPosition: '', staffReason: '' };
    state.answers[storeName] = storeAnswers;
  }
  storeCommentInput.value = storeAnswers.storeComment || '';
  staffNameInput.value = storeAnswers.staffName || '';
  staffPositionInput.value = storeAnswers.staffPosition || '';
  staffReasonInput.value = storeAnswers.staffReason || '';

  if (state.edition === 'backyard') {
    staffSummarySection.classList.add('hidden');
  } else {
    staffSummarySection.classList.remove('hidden');
  }

  renderCategories();
  const filteredChecklist = getFilteredChecklist();
  if (filteredChecklist.length > 0) {
    selectCategory(filteredChecklist[0].category);
  } else {
    questionsContainer.innerHTML = '<p class="text-secondary text-center">この編に該当する設問がありません。</p>';
  }
  updateTotalScore();
}

async function handleStoreCompletion(isFinal) {
  const storeName = appStores[state.routeIndex];
  const storeAnswers = state.answers[storeName];
  
  storeAnswers.storeComment = storeCommentInput.value;
  storeAnswers.staffName = staffNameInput.value;
  storeAnswers.staffPosition = staffPositionInput.value;
  storeAnswers.staffReason = staffReasonInput.value;

  const filteredChecklist = getFilteredChecklist();
  
  let totalItems = 0;
  let answeredItems = 0;
  filteredChecklist.forEach(cat => {
    cat.items.forEach(item => {
      totalItems++;
      if (storeAnswers[item.id] && storeAnswers[item.id].score !== undefined) {
        answeredItems++;
      }
    });
  });

  if (answeredItems < totalItems) {
    const confirmProceed = confirm(`未回答の項目が ${totalItems - answeredItems} 個あります。このまま進みますか？`);
    if (!confirmProceed) return;
  }
  
  await saveStateToIDB();

  if (isFinal) {
    switchScreen('result');
  } else {
    state.routeIndex++;
    await saveStateToIDB();
    loadStoreScoring();
    window.scrollTo(0,0);
  }
}

function renderCategories() {
  categoryTabs.innerHTML = '';
  const filteredChecklist = getFilteredChecklist();
  filteredChecklist.forEach(cat => {
    const btn = document.createElement('button');
    btn.className = 'tab-btn';
    btn.textContent = cat.category;
    btn.addEventListener('click', () => selectCategory(cat.category));
    categoryTabs.appendChild(btn);
  });
}

function selectCategory(categoryName) {
  state.currentCategory = categoryName;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.textContent === categoryName) {
      btn.classList.add('active');
      btn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    } else {
      btn.classList.remove('active');
    }
  });
  renderQuestions(categoryName);
}

function compressImage(file, callback) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const img = new Image();
    img.onload = function() {
      const canvas = document.createElement('canvas');
      const MAX_WIDTH = 800;
      const MAX_HEIGHT = 800;
      let width = img.width;
      let height = img.height;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height *= MAX_WIDTH / width;
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width *= MAX_HEIGHT / height;
          height = MAX_HEIGHT;
        }
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      
      const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
      callback(dataUrl);
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}

function renderQuestions(categoryName) {
  questionsContainer.innerHTML = '';
  const categoryData = appChecklist.find(c => c.category === categoryName);
  if (!categoryData) return;

  const storeName = appStores[state.routeIndex];
  const storeAnswers = state.answers[storeName];

  categoryData.items.forEach((item, index) => {
    const qDiv = document.createElement('div');
    qDiv.className = 'question-card';
    if (storeAnswers[item.id] && storeAnswers[item.id].score !== undefined) qDiv.classList.add('answered');
    if (item.isPriority) qDiv.classList.add('priority-item');

    // Title
    const qTitle = document.createElement('div');
    qTitle.className = 'question-text';
    const priorityBadge = item.isPriority ? '<span class="priority-badge">強化項目</span> ' : '';
    qTitle.innerHTML = `${priorityBadge}${index + 1}. ${item.text}`;
    qDiv.appendChild(qTitle);

    // Score Buttons
    const btnContainer = document.createElement('div');
    btnContainer.className = 'score-buttons';
    
    const getLabel = (pts) => {
      if(item.points.length === 2 && item.points.includes(1) && item.points.includes(0)) {
        if(pts === 1) return "出来ている(1)";
        if(pts === 0) return "出来ていない(0)";
      }
      if(pts === 10) return "◎(10)";
      if(pts === 8) return "〇(8)";
      if(pts === 5) return "良好(5)";
      if(pts === 4) return "△(4)";
      if(pts === 3) return "良好(3)";
      if(pts === 1) return "一部(1)";
      if(pts === 0) return "未実施(0)";
      return `${pts}点`;
    };

    item.points.forEach((pts, btnIndex) => {
      const btn = document.createElement('button');
      btn.className = 'score-btn';
      
      if (btnIndex === 0) btn.classList.add('score-high');
      else if (btnIndex === item.points.length - 1) btn.classList.add('score-zero');
      else btn.classList.add('score-mid');

      btn.dataset.value = pts;
      btn.textContent = getLabel(pts);
      
      if (storeAnswers[item.id] && storeAnswers[item.id].score === pts) {
        btn.classList.add('selected');
      }

      btn.addEventListener('click', async () => {
        Array.from(btnContainer.children).forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        
        if (!storeAnswers[item.id]) storeAnswers[item.id] = {};
        storeAnswers[item.id].score = pts;
        
        qDiv.classList.add('answered');
        updateTotalScore();
        await saveStateToIDB();
      });

      btnContainer.appendChild(btn);
    });
    qDiv.appendChild(btnContainer);

    // Comment Input
    const commentInput = document.createElement('textarea');
    commentInput.className = 'comment-input';
    commentInput.placeholder = '改善点・コメント等...';
    if (storeAnswers[item.id] && storeAnswers[item.id].comment) {
      commentInput.value = storeAnswers[item.id].comment;
    }
    commentInput.addEventListener('change', async (e) => {
      if (!storeAnswers[item.id]) storeAnswers[item.id] = {};
      storeAnswers[item.id].comment = e.target.value;
      await saveStateToIDB();
    });
    qDiv.appendChild(commentInput);

    // Photo Upload UI
    const photoContainer = document.createElement('div');
    photoContainer.className = 'photo-upload-container';
    
    const photoLabel = document.createElement('label');
    photoLabel.innerHTML = '📷 写真を追加';
    photoLabel.className = 'btn btn-secondary btn-small';
    photoLabel.style = 'cursor: pointer; display: inline-block;';
    
    const photoBtn = document.createElement('input');
    photoBtn.type = 'file';
    photoBtn.accept = 'image/*';
    photoBtn.capture = 'environment';
    photoBtn.style.display = 'none';
    photoLabel.appendChild(photoBtn);
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'photo-preview';

    const renderPreview = (base64Str) => {
      previewDiv.innerHTML = '';
      if (!base64Str) return;
      const img = document.createElement('img');
      img.src = base64Str;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'photo-remove-btn';
      removeBtn.innerHTML = '×';
      removeBtn.onclick = async () => {
        storeAnswers[item.id].photo = null;
        renderPreview(null);
        await saveStateToIDB();
      };
      
      previewDiv.appendChild(img);
      previewDiv.appendChild(removeBtn);
    };

    if (storeAnswers[item.id] && storeAnswers[item.id].photo) {
      renderPreview(storeAnswers[item.id].photo);
    }

    photoBtn.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        photoLabel.innerHTML = '処理中...';
        compressImage(file, async (base64) => {
          if (!storeAnswers[item.id]) storeAnswers[item.id] = {};
          storeAnswers[item.id].photo = base64;
          renderPreview(base64);
          await saveStateToIDB();
          photoLabel.innerHTML = '📷 写真を変更';
          photoLabel.appendChild(photoBtn);
        });
      }
    });

    photoContainer.appendChild(photoLabel);
    photoContainer.appendChild(previewDiv);
    qDiv.appendChild(photoContainer);

    // Temp/Humidity Inputs (if flagged)
    if (item.hasTempHumidity) {
      const metricDiv = document.createElement('div');
      metricDiv.style = "display: flex; gap: 12px; margin-top: 10px;";
      
      const tInput = document.createElement('input');
      tInput.type = 'number';
      tInput.placeholder = '温度(℃)';
      tInput.style = "padding: 8px; flex: 1; font-size: 0.9rem;";
      if (storeAnswers[item.id] && storeAnswers[item.id].temperature) tInput.value = storeAnswers[item.id].temperature;
      tInput.addEventListener('change', async (e) => {
        if (!storeAnswers[item.id]) storeAnswers[item.id] = {};
        storeAnswers[item.id].temperature = e.target.value;
        await saveStateToIDB();
      });

      const hInput = document.createElement('input');
      hInput.type = 'number';
      hInput.placeholder = '湿度(%)';
      hInput.style = "padding: 8px; flex: 1; font-size: 0.9rem;";
      if (storeAnswers[item.id] && storeAnswers[item.id].humidity) hInput.value = storeAnswers[item.id].humidity;
      hInput.addEventListener('change', async (e) => {
        if (!storeAnswers[item.id]) storeAnswers[item.id] = {};
        storeAnswers[item.id].humidity = e.target.value;
        await saveStateToIDB();
      });

      metricDiv.appendChild(tInput);
      metricDiv.appendChild(hInput);
      qDiv.appendChild(metricDiv);
    }

    questionsContainer.appendChild(qDiv);
  });
}

function updateTotalScore() {
  const storeName = appStores[state.routeIndex];
  const storeAnswers = state.answers[storeName] || {};
  let total = 0;
  for (const qId in storeAnswers) {
    if (storeAnswers[qId] && storeAnswers[qId].score !== undefined) {
      total += storeAnswers[qId].score;
    }
  }
  totalScoreDisplay.textContent = total;
  return total;
}

async function resetApp() {
  const confirmReset = confirm("現在の入力データはすべて失われます。トップに戻りますか？");
  if (!confirmReset) return;
  state.answers = {};
  state.routeIndex = 0;
  await saveStateToIDB();
  switchScreen('setup');
}

async function exportToExcelAll() {
  if (appStores.length === 0) {
    alert("出力する店舗データがありません。");
    return;
  }
  
  btnDownloadExcel.textContent = '出力中...';
  btnDownloadExcel.disabled = true;

  try {
    const zip = new JSZip();
    const dateStr = state.date || new Date().toISOString().split('T')[0];
    const storeMatchCounts = []; // 全店舗のマッチ状況を保存

    // テンプレートファイルの読み込み
    let templateBuffer;
    try {
      const response = await fetch('./template.xlsx');
      if (!response.ok) throw new Error('Template not found');
      templateBuffer = await response.arrayBuffer();
    } catch(e) {
      alert('「template.xlsx」が見つかりません。アプリのフォルダ内に template.xlsx が配置されているか確認してください。');
      btnDownloadExcel.textContent = 'Excel形式で一括出力';
      btnDownloadExcel.disabled = false;
      return;
    }

    for (const storeName of appStores) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);
      
      // シート名が店舗名を含むものがあればそれを使用、無ければ最初のシートを使用
      let targetWs = null;
      workbook.eachSheet((sheet) => {
        if (sheet.name.includes(storeName) || storeName.includes(sheet.name)) {
          targetWs = sheet;
        }
      });
      if (!targetWs) {
        targetWs = workbook.worksheets[0]; 
      }

      // 該当店舗以外の不要なシートをすべて削除する
      const sheetIdsToRemove = [];
      workbook.eachSheet((sheet) => {
        if (sheet.id !== targetWs.id) {
          sheetIdsToRemove.push(sheet.id);
        }
      });
      sheetIdsToRemove.forEach(id => workbook.removeWorksheet(id));

      let ws = targetWs;
      ws.name = storeName.substring(0, 31); // 残ったシートの名前を現在の店舗名にする


      const storeAnswers = state.answers[storeName] || {};
      let matchCount = 0; // マッチ件数カウント用
      
      // テンプレート内の各行を走査し、質問項目を探す
      ws.eachRow((row, rowNumber) => {
        // 店舗名の自動置換（セルの中に「岩槻本店」があれば現在の店舗名に書き換え）
        row.eachCell((cell, colNumber) => {
          if (typeof cell.value === 'string' && cell.value.includes('岩槻本店')) {
             cell.value = cell.value.replace('岩槻本店', storeName);
          }
        });

        // 記号や空白をすべて無視して純粋な文字だけで比較するための関数
        const normalize = (str) => {
          if (!str) return '';
          return str.replace(/[\s\n\r\t　・、。(),（）「」]/g, '');
        };

        let matchedItem = null;

        // 行内のすべてのセルをスキャンして質問文を探す（列がC列以外にズレていても見つけるため）
        row.eachCell((cell, colNumber) => {
          if (matchedItem) return; // すでに見つかっていればスキップ

          let cellText = '';
          if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
            cellText = cell.value.richText.map(rt => rt.text).join('');
          } else if (typeof cell.value === 'string') {
            cellText = cell.value;
          }

          if (cellText) {
            const normCellText = normalize(cellText);
            if (normCellText.length > 5) { // 短すぎる文字での誤検知を防ぐ
              for (const cat of appChecklist) {
                const found = cat.items.find(i => {
                  const normItemText = normalize(i.text);
                  // テンプレート側に「1.」などの番号が振られていてもマッチするように、部分一致を許容
                  return normCellText.includes(normItemText) || normItemText.includes(normCellText);
                });
                if (found) {
                  matchedItem = found;
                  break;
                }
              }
            }
          }
        });
        
        if (matchedItem) {
          matchCount++; // マッチした件数をカウント
          const ans = storeAnswers[matchedItem.id] || {};
          // D列(4)に点数
          if (ans.score !== undefined) {
            row.getCell(4).value = ans.score;
          }
          // E列(5)にコメント
          if (ans.comment) {
            row.getCell(5).value = ans.comment;
          }
        }
      });
      
      // デバッグ用：マッチした件数を保持
      storeMatchCounts.push(`${storeName}: ${matchCount}件マッチ`);

      // === 写真シート ===
      const storePhotos = [];
      for (const qId in storeAnswers) {
        if (storeAnswers[qId] && storeAnswers[qId].photo) {
          const itemText = appChecklist.flatMap(c => c.items).find(i => i.id === qId)?.text || qId;
          storePhotos.push({ text: itemText, base64: storeAnswers[qId].photo });
        }
      }

      if (storePhotos.length > 0) {
        const photoWs = workbook.addWorksheet('写真');
        photoWs.getColumn(1).width = 50;
        photoWs.getColumn(2).width = 60;
        photoWs.addRow(['項目名', '写真']);

        let pRowIndex = 2;
        storePhotos.forEach(p => {
          photoWs.addRow([p.text, '']);
          const base64Data = p.base64.replace(/^data:image\/\w+;base64,/, "");
          const imageId = workbook.addImage({ base64: base64Data, extension: 'jpeg' });
          photoWs.getRow(pRowIndex).height = 200;
          photoWs.addImage(imageId, {
            tl: { col: 1, row: pRowIndex - 1 },
            ext: { width: 300, height: 260 } 
          });
          pRowIndex++;
        });
      }

      // 1店舗分のエクセルデータをバッファ化してZIPに追加
      const buffer = await workbook.xlsx.writeBuffer();
      zip.file(`${storeName}店_AKT活動審査表.xlsx`, buffer);
    }

    // ZIP生成とダウンロード
    const zipBlob = await zip.generateAsync({ type: "blob" });
    saveAs(zipBlob, `AKT活動審査表_${dateStr}.zip`);
    
    // マッチング結果をユーザーにお知らせする（デバッグ用）
    alert(`出力が完了しました！\n\n【テンプレートへの反映状況】\n${storeMatchCounts.join('\n')}\n\n※もし0件マッチになっている場合は、エクセルの項目名とアプリの項目名が違うため点数が入りません。`);
    
  } catch(e) {
    console.error(e);
    alert("エクセル出力中にエラーが発生しました。");
  } finally {
    btnDownloadExcel.textContent = 'Excel形式で一括出力';
    btnDownloadExcel.disabled = false;
  }
}

// ----- ADMIN LOGIC -----
function verifyPassword() {
  if (adminPasswordInput.value === ADMIN_PASSWORD) {
    passwordModal.classList.add('hidden');
    openAdminPanel();
  } else {
    alert("パスワードが違います");
  }
}

function openAdminPanel() {
  switchScreen('admin');
  switchAdminTab('route');
}

function switchAdminTab(tab) {
  if (tab === 'route') {
    tabAdminRoute.classList.add('active');
    tabAdminChecklist.classList.remove('active');
    viewAdminRoute.classList.remove('hidden');
    viewAdminChecklist.classList.add('hidden');
    renderAdminRoute();
  } else {
    tabAdminRoute.classList.remove('active');
    tabAdminChecklist.classList.add('active');
    viewAdminRoute.classList.add('hidden');
    viewAdminChecklist.classList.remove('hidden');
    renderAdminChecklist();
  }
}

function renderAdminRoute() {
  adminRouteList.innerHTML = '';
  appStores.forEach((store, idx) => {
    const li = document.createElement('li');
    li.innerHTML = `
      <span>${store}</span>
      <div class="actions">
        <button class="btn btn-secondary btn-small" onclick="moveStore(${idx}, -1)">↑</button>
        <button class="btn btn-secondary btn-small" onclick="moveStore(${idx}, 1)">↓</button>
        <button class="btn btn-danger btn-small" onclick="deleteStore(${idx})">🗑️</button>
      </div>
    `;
    adminRouteList.appendChild(li);
  });
}

function adminAddStore() {
  const name = newStoreInput.value.trim();
  if (name) {
    appStores.push(name);
    newStoreInput.value = '';
    renderAdminRoute();
  }
}

window.moveStore = (idx, dir) => {
  if (idx + dir >= 0 && idx + dir < appStores.length) {
    const temp = appStores[idx];
    appStores[idx] = appStores[idx + dir];
    appStores[idx + dir] = temp;
    renderAdminRoute();
  }
};

window.deleteStore = (idx) => {
  if (confirm(`${appStores[idx]} を削除しますか？`)) {
    appStores.splice(idx, 1);
    renderAdminRoute();
  }
};

function renderAdminChecklist() {
  adminCategoriesContainer.innerHTML = '';
  appChecklist.forEach((cat, cIdx) => {
    const catCard = document.createElement('div');
    catCard.className = 'admin-category-card';
    
    const cHeader = document.createElement('div');
    cHeader.style = "display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;";
    
    const editionSelectHTML = `
      <select onchange="updateCatEdition(${cIdx}, this.value)" style="width: auto; padding: 4px;">
        <option value="both" ${cat.edition === 'both' ? 'selected' : ''}>共通</option>
        <option value="hall" ${cat.edition === 'hall' ? 'selected' : ''}>ホール編</option>
        <option value="backyard" ${cat.edition === 'backyard' ? 'selected' : ''}>バックヤード編</option>
        <option value="hq" ${cat.edition === 'hq' ? 'selected' : ''}>本部編</option>
      </select>
    `;

    cHeader.innerHTML = `
      <div style="display:flex; gap:10px; flex:1;">
        <input type="text" value="${cat.category}" onchange="updateCatName(${cIdx}, this.value)" style="font-weight:bold; flex:1;">
        ${editionSelectHTML}
      </div>
      <button class="btn btn-danger btn-small" onclick="deleteCategory(${cIdx})" style="margin-left:10px;">カテゴリ削除</button>
    `;
    catCard.appendChild(cHeader);

    const itemsContainer = document.createElement('div');
    cat.items.forEach((item, iIdx) => {
      const row = document.createElement('div');
      row.className = 'admin-item-row';
      const ptsStr = item.points.join(',');
      const isPri = item.isPriority ? 'checked' : '';
      
      row.innerHTML = `
        <div style="display:flex; gap:8px;">
          <input type="text" value="${item.text}" onchange="updateItemText(${cIdx}, ${iIdx}, this.value)" style="flex:1;">
          <button class="btn btn-danger btn-small" onclick="deleteItem(${cIdx}, ${iIdx})">🗑️</button>
        </div>
        <div style="display:flex; gap:16px; align-items:center;">
          <input type="text" value="${ptsStr}" onchange="updateItemPoints(${cIdx}, ${iIdx}, this.value)" placeholder="配点(例:5,1,0)" style="width:120px;">
          <label class="toggle-label">
            <input type="checkbox" ${isPri} onchange="updateItemPriority(${cIdx}, ${iIdx}, this.checked)">
            強化項目にする
          </label>
        </div>
      `;
      itemsContainer.appendChild(row);
    });
    catCard.appendChild(itemsContainer);

    const btnAddItem = document.createElement('button');
    btnAddItem.className = 'btn btn-secondary btn-small';
    btnAddItem.textContent = '+ 設問を追加';
    btnAddItem.onclick = () => addItem(cIdx);
    catCard.appendChild(btnAddItem);

    adminCategoriesContainer.appendChild(catCard);
  });
}

window.updateCatName = (cIdx, val) => { appChecklist[cIdx].category = val; };
window.updateCatEdition = (cIdx, val) => { appChecklist[cIdx].edition = val; };
window.deleteCategory = (cIdx) => { if(confirm('カテゴリを削除しますか？')) { appChecklist.splice(cIdx, 1); renderAdminChecklist(); } };

window.updateItemText = (cIdx, iIdx, val) => { appChecklist[cIdx].items[iIdx].text = val; };
window.updateItemPoints = (cIdx, iIdx, val) => { 
  const arr = val.split(',').map(n => parseInt(n.trim())).filter(n => !isNaN(n));
  if (arr.length > 0) appChecklist[cIdx].items[iIdx].points = arr; 
};
window.updateItemPriority = (cIdx, iIdx, checked) => { appChecklist[cIdx].items[iIdx].isPriority = checked; };
window.deleteItem = (cIdx, iIdx) => { if(confirm('設問を削除しますか？')) { appChecklist[cIdx].items.splice(iIdx, 1); renderAdminChecklist(); } };
window.addItem = (cIdx) => {
  appChecklist[cIdx].items.push({ id: `q_${Date.now()}`, text: '新しい設問', points: [3,1,0], isPriority: false });
  renderAdminChecklist();
};
function adminAddCategory() {
  appChecklist.push({ category: '新しいカテゴリ', items: [] });
  renderAdminChecklist();
}

function saveAdminData() {
  saveDataToLocal();
  alert("設定を保存しました！");
  renderRoutePreview();
  switchScreen('setup');
}

function resetAdminData() {
  if(confirm('設定を完全にリセットし、初期データ（data.jsの内容）に戻しますか？')) {
    localStorage.removeItem('akt_stores');
    localStorage.removeItem('akt_checklist');
    loadData();
    alert('初期データにリセットしました。');
    renderAdminRoute();
    renderAdminChecklist();
  }
}

// Start
init();