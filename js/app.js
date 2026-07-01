// App State & Data Management
let appStores = [];
let appChecklist = [];
const ADMIN_PASSWORD = "admin";
const GAS_URL = "https://script.google.com/macros/s/AKfycbysoO004JB0xeGKoG6kdcVXMIMYxoE8gIykK0csI2_sX6pt4EepM9SWOGqKyX5snCy0Ag/exec";

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
const reviewerPasswordInput = document.getElementById('reviewer-password-input');
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
const btnPrevStore = document.getElementById('btn-prev-store');
const btnNextStore = document.getElementById('btn-next-store');
const btnFinish = document.getElementById('btn-finish');

// Store Summary Elements
const storeCommentInput = document.getElementById('store-comment');
const staffNameInput = document.getElementById('staff-name');
const staffPositionInput = document.getElementById('staff-position');
const staffReasonInput = document.getElementById('staff-reason');
const staffSummarySection = document.getElementById('staff-summary-section');

// Result Screen Elements
const btnSendData = document.getElementById('btn-send-data');
const btnBackToSetup = document.getElementById('btn-back-to-setup');

// HQ Elements
const btnFetchAndDownload = document.getElementById('btn-fetch-and-download');

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
const adminReviewerPasswordInput = document.getElementById('admin-reviewer-password-input');
const btnSaveReviewerPassword = document.getElementById('btn-save-reviewer-password');

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
  editionSelect.addEventListener('change', renderRoutePreview);

  // Events
  btnStart.addEventListener('click', async () => {
    if (!dateSelect.value) { alert('審査日を選択してください'); return; }
    if (!evaluatorInput.value) { alert('審査員名を入力してください'); return; }
    if (appStores.length === 0) { alert('巡回する店舗が設定されていません'); return; }
    
    const enteredPassword = reviewerPasswordInput.value.trim();
    if (!enteredPassword) { alert('事前に共有された「審査開始パスワード」を入力してください'); return; }

    btnStart.disabled = true;
    btnStart.textContent = 'パスワード確認中...';

    try {
      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ action: "load", onlyPassword: true })
      });
      const data = await res.json();
      
      if (data.status === "success" && data.password === enteredPassword) {
        state.date = dateSelect.value;
        state.edition = editionSelect.value;
        state.evaluator = evaluatorInput.value;
        state.routeIndex = 0;
        
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
      } else {
        alert("パスワードが間違っています。本部に最新のパスワードを確認してください。");
      }
    } catch (err) {
      console.error(err);
      alert("通信エラーが発生しました。インターネットの接続状況を確認してください。");
    } finally {
      btnStart.disabled = false;
      btnStart.textContent = '巡回審査を開始する';
    }
  });

  btnPrevStore.addEventListener('click', handleStorePrevious);
  btnNextStore.addEventListener('click', () => handleStoreCompletion(false));
  btnFinish.addEventListener('click', () => handleStoreCompletion(true));
  btnBackToSetup.addEventListener('click', resetApp);
  
  if (btnSendData) btnSendData.addEventListener('click', sendDataToCloud);
  if (btnFetchAndDownload) btnFetchAndDownload.addEventListener('click', fetchAndDownloadExcel);

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

  if (btnSaveReviewerPassword) {
    btnSaveReviewerPassword.addEventListener('click', async () => {
      const newPw = adminReviewerPasswordInput.value.trim();
      if (!newPw) { alert('新しいパスワードを入力してください'); return; }
      
      btnSaveReviewerPassword.disabled = true;
      btnSaveReviewerPassword.textContent = '保存中...';
      
      try {
        const res = await fetch(GAS_URL, {
          method: "POST",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify({ action: "setPassword", password: newPw })
        });
        const data = await res.json();
        if (data.status === "success") {
          alert("審査員パスワードをクラウドへ保存しました！全端末で即座に有効になります。");
          adminReviewerPasswordInput.value = '';
        } else {
          throw new Error("Invalid response");
        }
      } catch (err) {
        console.error(err);
        alert("通信エラーが発生しました。");
      } finally {
        btnSaveReviewerPassword.disabled = false;
        btnSaveReviewerPassword.textContent = 'クラウドへ保存';
      }
    });
  }
}

// Data Management
function loadData() {
  const savedStores = localStorage.getItem('akt_stores_v2');
  const savedChecklist = localStorage.getItem('akt_checklist_v2');
  
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
  localStorage.setItem('akt_stores_v2', JSON.stringify(appStores));
  localStorage.setItem('akt_checklist_v2', JSON.stringify(appChecklist));
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

  // 結果画面に来るたびに「送信」ボタンの状態を必ず初期化する
  // （前回の送信成功後にボタンが無効化されたまま残るのを防ぐ）
  if (screenName === 'result' && btnSendData) {
    btnSendData.disabled = false;
    btnSendData.textContent = '採点データを本部へ送信';
  }
}

// Route Preview
function getRouteStores() {
  if (state.edition === 'hall') {
    return appStores.filter(s => !(s === '本部' || s.includes('本部')));
  }
  return appStores;
}

function renderRoutePreview() {
  const edition = editionSelect.value;
  let previewStores = appStores;
  if (edition === 'hall') {
    previewStores = appStores.filter(s => !(s === '本部' || s.includes('本部')));
  }
  routeCount.textContent = previewStores.length;
  routePreviewList.innerHTML = '';
  previewStores.forEach(s => {
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
  const routeStores = getRouteStores();
  const storeName = routeStores[state.routeIndex];
  
  if (storeName === '本部' || storeName.includes('本部')) {
    if (state.edition === 'hall') return [];
    return appChecklist.filter(cat => cat.edition === 'hq');
  }

  if (state.edition === 'all') {
    return appChecklist.filter(cat => cat.edition !== 'hq');
  }
  
  return appChecklist.filter(cat => (cat.edition === 'both' || cat.edition === state.edition || !cat.edition) && cat.edition !== 'hq');
}

function loadStoreScoring() {
  const routeStores = getRouteStores();
  const storeName = routeStores[state.routeIndex];
  
  currentStoreHeader.textContent = `現在: ${storeName}`;
  storeProgressText.textContent = `${storeName} の審査 (${state.routeIndex + 1} / ${routeStores.length} 店舗)`;
  
  if (state.routeIndex < routeStores.length - 1) {
    btnNextStore.classList.remove('hidden');
    btnFinish.classList.add('hidden');
  } else {
    btnNextStore.classList.add('hidden');
    btnFinish.classList.remove('hidden');
  }

  if (state.routeIndex > 0) {
    btnPrevStore.classList.remove('hidden');
  } else {
    btnPrevStore.classList.add('hidden');
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

  if (state.edition === 'hall') {
    staffSummarySection.classList.remove('hidden');
  } else {
    staffSummarySection.classList.add('hidden');
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

async function handleStorePrevious() {
  if (state.routeIndex > 0) {
    // 戻る前に現在の入力内容を保存する
    const routeStores = getRouteStores();
    const storeName = routeStores[state.routeIndex];
    const storeAnswers = state.answers[storeName];
    
    storeAnswers.storeComment = storeCommentInput.value;
    storeAnswers.staffName = staffNameInput.value;
    storeAnswers.staffPosition = staffPositionInput.value;
    storeAnswers.staffReason = staffReasonInput.value;
    
    await saveStateToIDB();

    state.routeIndex--;
    loadStoreScoring();
    window.scrollTo(0, 0); // 一番上に戻す
  }
}

async function handleStoreCompletion(isFinal) {
  const routeStores = getRouteStores();
  const storeName = routeStores[state.routeIndex];
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

  const routeStores = getRouteStores();
  const storeName = routeStores[state.routeIndex];
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
  const routeStores = getRouteStores();
  const storeName = routeStores[state.routeIndex];
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

async function sendDataToCloud() {
  btnSendData.disabled = true;
  btnSendData.textContent = '送信中...';
  
  try {
    let sentCount = 0;
    for (const storeName of appStores) {
      const storeAnswers = state.answers[storeName];
      if (!storeAnswers) continue;
      
      // 点数が入力されているかチェック
      let hasScore = Object.keys(storeAnswers).some(key => storeAnswers[key] && typeof storeAnswers[key] === 'object' && storeAnswers[key].score !== undefined);
      if (!hasScore && !storeAnswers.storeComment && !storeAnswers.staffName) continue;
      
      const payload = {
        action: "save",
        date: state.date,
        edition: state.edition,
        evaluator: state.evaluator,
        storeName: storeName,
        answers: storeAnswers
      };

      console.log(`[送信] ${storeName} へ送信するデータ:`, payload);

      const res = await fetch(GAS_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify(payload)
      });
      const resJson = await res.json().catch(() => null);
      console.log(`[送信] ${storeName} のGASレスポンス:`, resJson);
      sentCount++;
    }
    
    if (sentCount === 0) {
      alert("送信する採点データがありませんでした。");
      btnSendData.textContent = '採点データを本部へ送信';
    } else {
      alert(`${sentCount}店舗のデータを本部へ送信しました！`);
      btnSendData.textContent = '再送信する';
    }
  } catch (err) {
    console.error(err);
    alert("送信に失敗しました。電波の良いところで再度お試しください。\n\nエラー: " + err.message);
    btnSendData.textContent = '採点データを本部へ送信';
  } finally {
    // 成功・失敗・例外 どのパスを通っても必ずボタンを有効化する
    btnSendData.disabled = false;
  }
}

async function fetchAndDownloadExcel() {
  if (appStores.length === 0) {
    alert("巡回する店舗が設定されていません。管理者設定から店舗を追加してください。");
    return;
  }
  if (!dateSelect.value) {
    alert("取得したい審査日を選択してください。");
    return;
  }
  
  btnFetchAndDownload.disabled = true;
  btnFetchAndDownload.textContent = 'クラウドからデータ取得中...';
  
  try {
    const payload = {
      action: "load",
      date: dateSelect.value
    };
    
    const res = await fetch(GAS_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload)
    });
    
    const data = await res.json();
    console.log("[クラウド取得結果] raw data:", data);

    if (data.status === "success" && data.answers) {
      // 取得したデータを現在の state にマージする
      state.date = dateSelect.value;

      // デバッグ用：店舗ごとに「クラウドから何件の回答（点数）が返ってきたか」を可視化する
      const debugLines = [];
      for (const storeName of appStores) {
        const cloudAns = data.answers[storeName];
        if (!cloudAns) {
          debugLines.push(`${storeName}: クラウドにデータ無し`);
          continue;
        }
        const scoredCount = Object.keys(cloudAns).filter(
          k => cloudAns[k] && typeof cloudAns[k] === 'object' && cloudAns[k].score !== undefined
        ).length;
        debugLines.push(`${storeName}: クラウドから${scoredCount}件の点数を取得`);
      }
      console.log("[クラウド取得結果] 店舗別件数:\n" + debugLines.join('\n'));

      const totalScored = debugLines.filter(l => !l.includes('0件') && !l.includes('データ無し')).length;
      if (totalScored === 0) {
        alert(
          "⚠️ クラウドから採点データが1件も取得できませんでした。\n\n" +
          "【考えられる原因】\n" +
          "・選んだ審査日が、審査員が送信した日付と違う\n" +
          "・審査員が「採点データを本部へ送信」をまだ押していない\n" +
          "・GAS（Googleスプレッドジート）側の保存に問題がある\n\n" +
          "【店舗別の取得状況】\n" + debugLines.join('\n')
        );
      }

      for (const store in data.answers) {
        if (!state.answers[store]) state.answers[store] = {};
        Object.assign(state.answers[store], data.answers[store]);
      }
      
      // 合体したデータでExcel出力
      btnFetchAndDownload.textContent = 'Excel作成中...';
      await exportToExcelAll(btnFetchAndDownload);
      btnFetchAndDownload.textContent = '出力完了！';
      btnFetchAndDownload.disabled = false;
    } else {
      throw new Error("Invalid response");
    }
  } catch (err) {
    console.error(err);
    alert("データの取得に失敗しました。");
    btnFetchAndDownload.textContent = 'クラウドデータを合体してExcel出力';
    btnFetchAndDownload.disabled = false;
  }
}

async function exportToExcelAll(btnElement) {
  if (!btnElement) btnElement = { textContent: '', disabled: false }; // ダミー
  
  if (appStores.length === 0) {
    alert("出力する店舗データがありません。");
    return;
  }
  
  btnElement.textContent = '出力中...';
  btnElement.disabled = true;

  try {
    const zip = new JSZip();
    const dateStr = state.date || new Date().toISOString().split('T')[0];
    const storeMatchCounts = []; // 全店舗のマッチ状況と書き込み列を保存

    // テンプレートファイルの読み込み
    let templateBuffer;
    try {
      const response = await fetch('./template.xlsx');
      if (!response.ok) throw new Error('Template not found');
      templateBuffer = await response.arrayBuffer();
    } catch(e) {
      alert('「template.xlsx」が見つかりません。アプリのフォルダに template.xlsx を配置しているか確認してください。');
      btnElement.textContent = 'Excel形式で一括出力';
      btnElement.disabled = false;
      return;
    }

    for (const storeName of appStores) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(templateBuffer);

      // Excelが開いたとき、N70（5S得点集計）などの数式セルを
      // 強制的に再計算させる（これがないと書き込んだスコアが数式結果に反映されない）
      workbook.calcProperties = { fullCalcOnLoad: true };
      
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
      const isHQStore = (storeName === '本部' || storeName.includes('本部'));
      // 本部用シートは本部編(hq)の項目のみ、店舗シートはhq以外の項目のみを対象にする
      // （「地域清掃活動は月1回～」のように、編をまたいで似た文言の設問が存在し、
      //   誤って違う編の項目とマッチしてしまうのを防ぐため）
      const targetChecklist = isHQStore
        ? appChecklist.filter(cat => cat.edition === 'hq')
        : appChecklist.filter(cat => cat.edition !== 'hq');

      // 日付を「○月○日（○）」「○○○○年○月○日（○）」形式に変換するヘルパー
      const formatDateJp = (dateStr, withYear) => {
        if (!dateStr) return '';
        const d = new Date(dateStr + 'T00:00:00');
        if (isNaN(d.getTime())) return dateStr;
        const week = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
        return withYear
          ? `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${week}）`
          : `${d.getMonth() + 1}月${d.getDate()}日（${week}）`;
      };

      if (!isHQStore) {
        // ヘッダー：審査日／調査店舗／参加者
        ws.getCell('C3').value = formatDateJp(state.date, false);
        // 店舗名は「岩槻本」(I3:J3結合)＋「店」(K3)の2セルに分かれているため、
        // I3に店舗名そのものを入れ、K3の固定文字「店」は消しておく
        ws.getCell('I3').value = storeName;
        ws.getCell('K3').value = '';
        ws.getCell('N3').value = state.evaluator || '';
      } else {
        // 本部用シート：点検日／担当者
        ws.getCell('K1').value = `　点検日：${formatDateJp(state.date, true)}`;
        ws.getCell('C3').value = state.evaluator || '';
      }

      let matchCount = 0; // マッチ件数カウント用
      const matchedRows = []; // 2パス書き込み用の配列

      // デフォルト（ヘッダーが見つからない場合の保険）
      const DEFAULT_SCORE_COL = 14;   // N列
      const DEFAULT_COMMENT_COL = 15; // O列

      // 記号や空白をすべて無視して純粋な文字だけで比較するための関数
      const normalize = (str) => {
        if (!str) return '';
        // Unicode正規化(NFKC)で全角英数字記号⇔半角、半角カナ⇔全角カナなどの
        // 表記ゆれをまとめて吸収する（例：％→%、ﾁｪｯｸ→チェック、１→1）
        let s = str.normalize('NFKC');
        s = s.replace(/[〜～]/g, '~');
        return s.replace(/[\s\n\r\t　・、。(),（）「」]/g, '').toLowerCase();
      };

      // テンプレートには「ホール編」「バックヤード編」「本部編」でスコア列・コメント列の
      // 実際の位置が異なる（特にコメント欄の位置が編によってズレている）ため、
      // 固定の列番号ではなく、シート内の「点数」「コメント欄」というラベルセルを
      // 実際にスキャンして、その時点で有効な列番号を行ごとに割り当てる。
      const rowScoreCol = {};
      const rowCommentCol = {};
      let lastScoreCol = DEFAULT_SCORE_COL;
      let lastCommentCol = DEFAULT_COMMENT_COL;

      ws.eachRow((row, rowNumber) => {
        row.eachCell((cell, colNumber) => {
          let cellText = '';
          if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
            cellText = cell.value.richText.map(rt => rt.text).join('');
          } else if (typeof cell.value === 'string') {
            cellText = cell.value;
          }
          if (!cellText) return;

          // 結合セルの場合は左上(マスター)の列番号を採用する
          const masterCol = (cell.isMerged && cell.master) ? cell.master.col : colNumber;

          if (cellText.includes('点数')) {
            lastScoreCol = masterCol;
          }
          // 「コメント欄」という単独のラベルのみを対象とする
          // （「担当者総評コメント欄」のような別目的のラベルは除外）
          const strippedExact = cellText.trim().replace(/[（）()]/g, '');
          if (strippedExact === 'コメント欄') {
            lastCommentCol = masterCol;
          }
          // バックヤード編はヘッダーに「コメント欄」と明記されておらず、
          // 「理由を必ず明記して下さい」という注記がコメント欄の目印になっている
          if (cellText.includes('理由を必ず明記') || cellText.includes('コメント記入')) {
            lastCommentCol = masterCol;
          }
        });
        rowScoreCol[rowNumber] = lastScoreCol;
        rowCommentCol[rowNumber] = lastCommentCol;
      });

      // テンプレート内の各行を走査し、質問項目を探す
      ws.eachRow((row, rowNumber) => {
        let matchedItem = null;

        // 行内のセルをスキャンして質問文を探す
        // ※A〜C列はアイコン・カテゴリ名・No.が入っており、データ側の項目文に
        //   付いている【カテゴリ名】等の接頭辞と誤って部分一致することがあるため、
        //   実際の設問文が入っているD列以降だけを対象にする
        row.eachCell((cell, colNumber) => {
          if (matchedItem) return;
          if (colNumber < 4) return;

          let cellText = '';
          if (cell.value && typeof cell.value === 'object' && cell.value.richText) {
            cellText = cell.value.richText.map(rt => rt.text).join('');
          } else if (typeof cell.value === 'string') {
            cellText = cell.value;
          }

          if (cellText) {
            const normCellText = normalize(cellText);
            if (normCellText.length > 5) { 
              for (const cat of targetChecklist) {
                const found = cat.items.find(i => {
                  const normItemText = normalize(i.text);
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
          matchCount++;
          matchedRows.push({
            row: row,
            rowNumber: rowNumber,
            matchedItem: matchedItem,
            scoreCol: rowScoreCol[rowNumber] || DEFAULT_SCORE_COL,
            commentCol: rowCommentCol[rowNumber] || DEFAULT_COMMENT_COL
          });
        }
      });

      // デバッグ用：マッチ件数を保持
      storeMatchCounts.push(`${storeName}: ${matchCount}件マッチ`);

      // 2パス目：行ごとに確定した列に点数とコメントを書き込む
      matchedRows.forEach(m => {
        const ans = storeAnswers[m.matchedItem.id] || {};
        if (ans.score !== undefined) {
          m.row.getCell(m.scoreCol).value = ans.score;
          // q_special（改善の取組み）はN70に集計セル（数式）があるため、
          // そこにも直接値を書き込んでおく（Excelの数式再計算を待たずに結果資料が参照できるよう）
          if (m.matchedItem.id === 'q_special') {
            ws.getRow(m.rowNumber + 1).getCell(m.scoreCol).value = ans.score;
          }
        } else {
          m.row.getCell(m.scoreCol).value = "未入力";
        }
        if (ans.comment) {
          m.row.getCell(m.commentCol).value = ans.comment;
        }

        // 温度・湿度（空調項目）はスコア列の1つ右のセルに書き込む
        if (m.matchedItem.hasTempHumidity && (ans.temperature || ans.humidity)) {
          const tempCell = m.row.getCell(m.scoreCol + 1);
          const t = ans.temperature ? `${ans.temperature}℃` : '';
          const h = ans.humidity ? `${ans.humidity}%` : '';
          tempCell.value = `メイン温度：${t}　、　湿度：${h}`;
        }
      });

      // === 担当者総評コメント・輝いていたスタッフの書き込み ===
      if (!isHQStore) {
        const comment = storeAnswers.storeComment || '';
        const staffName = storeAnswers.staffName || '';
        const staffPosition = storeAnswers.staffPosition || '';
        const staffReason = storeAnswers.staffReason || '';

        // テンプレートのサンプル文を先にクリア
        ws.getCell('E38').value = '';
        ws.getCell('G79').value = '';

        if (comment) ws.getCell('F36').value = comment;
        if (comment) ws.getCell('E78').value = comment;
        if (staffName) ws.getCell('N37').value = staffName;
        if (staffPosition) ws.getCell('Q37').value = staffPosition;
        if (staffReason) ws.getCell('N38').value = staffReason;

        // === 集計表（R84〜R92）の数式セルに直接値を書き込む ===
        // Excelの Protected View（保護されたビュー）では数式が再計算されないため、
        // JavaScript側で計算した値を静的な数値として直接セルに書き込むことで
        // 「編集を有効にする」を押さなくても正しい数字が表示されるようにする

        const hallCats    = appChecklist.filter(c => c.edition === 'hall');
        const backCats    = appChecklist.filter(c => c.edition === 'backyard' && c.category !== '改善の取組み');
        const specialItem = appChecklist.flatMap(c => c.items).find(i => i.id === 'q_special');

        // 各項目の最大点を合算
        const hallMax    = hallCats.flatMap(c => c.items).reduce((s, i) => s + i.points[0], 0);
        const backMax    = backCats.flatMap(c => c.items).reduce((s, i) => s + i.points[0], 0);
        const specialMax = specialItem ? specialItem.points[0] : 10;

        // 実際に入力されたスコアを合算（未入力は0扱い）
        const hallScore = hallCats.flatMap(c => c.items).reduce((s, i) => {
          const a = storeAnswers[i.id];
          return s + (a && a.score !== undefined ? a.score : 0);
        }, 0);
        const backScore = backCats.flatMap(c => c.items).reduce((s, i) => {
          const a = storeAnswers[i.id];
          return s + (a && a.score !== undefined ? a.score : 0);
        }, 0);
        const specialScore = (storeAnswers['q_special'] && storeAnswers['q_special'].score !== undefined)
          ? storeAnswers['q_special'].score : 0;

        const backTotalMax   = backMax + specialMax;
        const backTotalScore = backScore + specialScore;

        // ホール・バックヤードの合計セル（数式 SUM(N7:N33) 等を値で上書き）
        ws.getCell('N34').value = hallScore;
        ws.getCell('N67').value = backScore;
        ws.getCell('N70').value = specialScore;

        // 集計表 I列（最大得点）
        ws.getCell('I87').value = hallMax;
        ws.getCell('I91').value = backMax;
        ws.getCell('I92').value = specialMax;

        // J列（除外）= 0
        ws.getCell('J87').value = 0;
        ws.getCell('J91').value = 0;
        ws.getCell('J92').value = 0;

        // K列（基準点 = 最大得点 - 除外）
        ws.getCell('K87').value = hallMax;
        ws.getCell('K91').value = backMax;
        ws.getCell('K92').value = specialMax;
        ws.getCell('K90').value = backTotalMax;

        // L列（実得点）
        ws.getCell('L87').value = hallScore;
        ws.getCell('L91').value = backScore;
        ws.getCell('L92').value = specialScore;
        ws.getCell('L90').value = backTotalScore;

        // I90列（バックヤード合算得点）
        ws.getCell('I90').value = backTotalMax;
        ws.getCell('J90').value = 0;

        // N列（得点率）※ 0除算防止
        ws.getCell('N87').value = hallMax    > 0 ? hallScore    / hallMax    : 0;
        ws.getCell('N91').value = backMax    > 0 ? backScore    / backMax    : 0;
        ws.getCell('N92').value = specialMax > 0 ? specialScore / specialMax : 0;
        ws.getCell('N90').value = backTotalMax > 0 ? backTotalScore / backTotalMax : 0;

        // O列（合計点 ＝ 100点満点換算、青マス）
        const hallPoints = hallMax    > 0 ? Math.round(hallScore    / hallMax    * 100) : 0;
        const backPoints = backTotalMax > 0 ? Math.round(backTotalScore / backTotalMax * 100) : 0;
        ws.getCell('O87').value = hallPoints;
        ws.getCell('O90').value = backPoints;
        ws.getCell('O85').value = hallPoints + backPoints; // 総合評価合計点（黄マス）
      }

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
    alert(`出力が完了しました！\n\n【テンプレートへの反映状況】\n${storeMatchCounts.join('\n')}\n\n※0件マッチの場合は項目名違いです。`);
    
  } catch(e) {
    console.error(e);
    alert("Excel出力中にエラーが発生しました。");
  } finally {
    btnElement.textContent = 'Excel形式で一括出力';
    btnElement.disabled = false;
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