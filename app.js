(() => {
  const $ = (id) => document.getElementById(id);
  const STORE = "meu-espaco-v1";
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
  };
  const makeId = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`);
  let data = { tasks: [], diary: [], transactions: [], pastoral: [], roles: [] };
  let editingEntry = null;
  let entryExistingImages = [];
  let taskExistingImages = [];
  let transactionExistingImages = [];

  // Reduz imagens antes de salvá-las no navegador, para evitar arquivos muito grandes.
  async function compressImage(file) {
    if (!file.type.startsWith("image/")) return null;
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const max = 1400;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name, data: canvas.toDataURL("image/jpeg", 0.78) });
      };
      img.onerror = () => resolve(null);
      img.src = source;
    });
  }
  async function selectedImages(inputId) {
    const files = [...$(inputId).files].slice(0, 5);
    const images = (await Promise.all(files.map(compressImage))).filter(Boolean);
    if ($(inputId).files.length > 5) toast("Foram selecionadas no máximo 5 imagens.");
    return images;
  }
  function renderImagePreview(containerId, images) {
    $(containerId).innerHTML = images.length ? images.map((img, i) =>
      `<div class="preview-thumb"><img src="${img.data}" alt="${escapeHTML(img.name || "Imagem anexada")}"><span>${i + 1}</span></div>`
    ).join("") : "";
  }
  function imageGallery(images) {
    if (!images || !images.length) return "";
    return `<div class="attached-images">${images.map((img, i) => `<a href="${img.data}" target="_blank" rel="noopener" aria-label="Abrir imagem ${i + 1}"><img src="${img.data}" alt="${escapeHTML(img.name || "Imagem anexada")}" loading="lazy"></a>`).join("")}</div>`;
  }
  function bindImagePicker(inputId, previewId, getExisting) {
    $(inputId).addEventListener("change", async () => {
      const newlySelected = await selectedImages(inputId);
      renderImagePreview(previewId, [...getExisting(), ...newlySelected]);
      if (newlySelected.length) toast(`${newlySelected.length} imagem(ns) pronta(s) para anexar.`);
    });
  }
  try {
    const saved = JSON.parse(localStorage.getItem(STORE) || "null");
    if (saved && typeof saved === "object") data = {...data, ...saved};
  } catch (e) { console.warn("Não foi possível ler os dados salvos.", e); }
  const save = () => {
    try { localStorage.setItem(STORE, JSON.stringify(data)); }
    catch (e) { toast("Não foi possível salvar. Verifique o espaço disponível no navegador."); }
    renderAll();
  };
  const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const money = value => Number(value || 0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
  const dateLabel = value => {
    if (!value) return "Sem data";
    const [y,m,d] = value.split("-").map(Number);
    return new Date(y,m-1,d).toLocaleDateString("pt-BR",{day:"2-digit",month:"short",year:"numeric"});
  };
  const monthKey = value => (value || "").slice(0,7);
  function toast(message) {
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 2500);
  }
  function openView(view) {
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
    document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.view === view || (el.dataset.view === "pastorais" && ["pascom","juventude","nucleo","acolito"].includes(view))));
    const titles = {inicio:"Bom ter você aqui.",calendario:"Calendário geral",roles:"Rolês",datas:"Tarefas",diario:"Diário pessoal",financeiro:"Finanças",pastorais:"Pastorais",mais:"Mais",liturgia:"Bíblia e orações",pascom:"PASCOM",juventude:"Juventude Sagrada Face",nucleo:"Núcleo",acolito:"Acólitos"};
    $("page-title").textContent = titles[view] || titles.inicio;
    if (view === "diario") $("entry-title").focus({preventScroll:true});
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => openView(btn.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => openView(btn.dataset.go)));
  $("today-label").textContent = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();

  const taskDialog = $("task-dialog"), financeDialog = $("finance-dialog");
  const pastoralDialog = $("pastoral-dialog");
  const pastoralNames = {pascom:"PASCOM",juventude:"Juventude",nucleo:"Núcleo JSF",acolito:"Acólito"};
  function openPastoralDialog(area) {
    $("pastoral-form").reset(); $("pastoral-image-preview").innerHTML = ""; $("pastoral-images").value = "";
    $("pastoral-area").value = area;
    $("pastoral-date").value = today();
    $("pastoral-dialog-title").textContent = ({pascom:"Novo evento da PASCOM",juventude:"Novo evento da Juventude",nucleo:"Nova responsabilidade",acolito:"Registrar missa"}[area]);
    $("pastoral-dialog-eyebrow").textContent = pastoralNames[area].toUpperCase();
    $("pastoral-category-wrap").classList.toggle("hidden", area==="nucleo" || area==="acolito");
    $("pastoral-status-wrap").classList.toggle("hidden", area!=="nucleo");
    $("pastoral-location-wrap").classList.toggle("hidden", area==="nucleo");
    $("pastoral-title").placeholder = area==="acolito" ? "Ex.: Missa das 18h" : area==="nucleo" ? "Ex.: preparar pauta da reunião" : "Nome do evento ou atividade";
    $("pastoral-category").innerHTML = (area==="pascom" ? ["Evento","Reunião","Cobertura","Publicação","Formação","Outro"] : area==="juventude" ? ["Encontro","Reunião","Retiro","Formação","Ação social","Evento","Outro"] : ["Missa","Celebração","Outro"]).map(x=>`<option>${x}</option>`).join("");
    pastoralDialog.showModal();
    $("pastoral-title").focus();
  }
  document.querySelectorAll("[data-add-pastoral]").forEach(btn => btn.addEventListener("click", () => openPastoralDialog(btn.dataset.addPastoral)));
  document.querySelectorAll(".month-filter").forEach(input => input.addEventListener("change", renderPastoral));
  $("filter-nucleo").addEventListener("change", renderPastoral);
  $("pastoral-form").addEventListener("submit", async e => {
    e.preventDefault();
    const area = $("pastoral-area").value;
    const images = await selectedImages("pastoral-images");
    data.pastoral.push({
      id: makeId(), area, title: $("pastoral-title").value.trim(),
      date: $("pastoral-date").value, time: $("pastoral-time").value,
      category: area==="nucleo" ? "Responsabilidade" : $("pastoral-category").value,
      status: area==="nucleo" ? $("pastoral-status").value : "pending",
      location: $("pastoral-location").value.trim(), notes: $("pastoral-notes").value.trim(), images,
      createdAt: Date.now()
    });
    pastoralDialog.close(); save(); toast("Registro pastoral salvo!");
  });
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).close()));
  function openTaskDialog() {
    $("task-form").reset(); $("task-image-preview").innerHTML = ""; $("task-date").value = today(); taskDialog.showModal(); $("task-title").focus();
  }
  function openFinanceDialog() {
    $("finance-form").reset(); $("transaction-image-preview").innerHTML = ""; $("transaction-date").value = today(); financeDialog.showModal(); $("transaction-title").focus();
  }
  $("quick-add").addEventListener("click", () => {
    const choice = prompt("O que você quer adicionar?\n1 — Data ou tarefa\n2 — Entrada no diário\n3 — Lançamento financeiro");
    if (choice === "1") { openView("datas"); openTaskDialog(); }
    else if (choice === "2") { openView("diario"); $("entry-title").focus(); }
    else if (choice === "3") { openView("financeiro"); openFinanceDialog(); }
  });
  $("add-task").addEventListener("click", openTaskDialog);
  $("add-entry").addEventListener("click", () => { editingEntry = null; entryExistingImages = []; $("diary-form").reset(); $("entry-image-preview").innerHTML = ""; $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden"); $("entry-title").focus(); });
  $("add-transaction").addEventListener("click", openFinanceDialog);
  bindImagePicker("entry-images", "entry-image-preview", () => editingEntry ? (data.diary.find(x=>x.id===editingEntry)?.images || []) : []);
  bindImagePicker("task-images", "task-image-preview", () => []);
  bindImagePicker("transaction-images", "transaction-image-preview", () => []);
  bindImagePicker("pastoral-images", "pastoral-image-preview", () => []);

  $("add-role").addEventListener("click", () => { $("role-form").reset(); $("role-images").value=""; $("role-image-preview").innerHTML=""; $("role-date").value=today(); $("role-dialog").showModal(); $("role-title").focus(); });
  bindImagePicker("role-images", "role-image-preview", () => []);
  $("role-form").addEventListener("submit", async e => {
    e.preventDefault();
    const images = await selectedImages("role-images");
    data.roles = data.roles || [];
    data.roles.unshift({id:makeId(),title:$("role-title").value.trim(),date:$("role-date").value,time:$("role-time").value,location:$("role-location").value.trim(),people:$("role-people").value.trim(),notes:$("role-notes").value.trim(),images,createdAt:Date.now()});
    $("role-dialog").close(); save(); toast("Rolê salvo!");
  });

  $("task-form").addEventListener("submit", async e => {
    e.preventDefault();
    const images = await selectedImages("task-images");
    data.tasks.push({id:makeId(),title:$("task-title").value.trim(),date:$("task-date").value,time:$("task-time").value,category:$("task-category").value,notes:$("task-notes").value.trim(),images,done:false,createdAt:Date.now()});
    taskDialog.close(); save(); toast("Data salva com sucesso!");
  });
  $("diary-form").addEventListener("submit", async e => {
    e.preventDefault();
    const newImages = await selectedImages("entry-images");
    const existing = editingEntry ? (data.diary.find(x=>x.id===editingEntry)?.images || []) : [];
    const entry = {id:editingEntry || makeId(),title:$("entry-title").value.trim(),mood:$("entry-mood").value,body:$("entry-body").value.trim(),images:[...existing,...newImages].slice(0,5),date:editingEntry ? (data.diary.find(x=>x.id===editingEntry)?.date || today()) : today(),updatedAt:Date.now()};
    if (editingEntry) data.diary = data.diary.map(x => x.id === editingEntry ? entry : x);
    else data.diary.unshift(entry);
    editingEntry = null; $("diary-form").reset(); $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden");
    save(); toast("Entrada do diário salva!");
  });
  $("cancel-entry").addEventListener("click", () => { editingEntry = null; entryExistingImages = []; $("diary-form").reset(); $("entry-image-preview").innerHTML = ""; $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden"); });
  $("finance-form").addEventListener("submit", async e => {
    e.preventDefault();
    const images = await selectedImages("transaction-images");
    data.transactions.unshift({id:makeId(),type:$("transaction-type").value,title:$("transaction-title").value.trim(),amount:Number($("transaction-amount").value),date:$("transaction-date").value,category:$("transaction-category").value,images});
    financeDialog.close(); save(); toast("Lançamento registrado!");
  });

  function taskMarkup(t, compact=false) {
    return `<div class="item-row ${t.done?"done":""}"><button class="check-button" data-task-toggle="${t.id}" aria-label="${t.done?"Marcar pendente":"Concluir tarefa"}">${t.done?"✓":""}</button><div class="item-main"><div class="item-title">${escapeHTML(t.title)}</div><div class="item-meta">${dateLabel(t.date)}${t.time?` · ${escapeHTML(t.time)}`:""} · ${escapeHTML(t.category)}</div>${t.notes&&!compact?`<div class="item-note">${escapeHTML(t.notes)}</div>`:""}${!compact?imageGallery(t.images):""}</div>${compact?"":`<div class="item-actions"><button class="mini-button" data-task-delete="${t.id}">Excluir</button></div>`}</div>`;
  }
  function renderTasks() {
    const q = $("task-search").value.trim().toLowerCase(), filter = $("task-filter").value;
    const tasks = [...data.tasks].sort((a,b)=>(a.date||"").localeCompare(b.date||"") || (a.time||"").localeCompare(b.time||""));
    const filtered = tasks.filter(t => (!q || `${t.title} ${t.category} ${t.notes}`.toLowerCase().includes(q)) && (filter==="all" || (filter==="done"?t.done:!t.done)));
    $("task-list").innerHTML = filtered.length ? filtered.map(t=>taskMarkup(t)).join("") : `<div class="empty-inline">${data.tasks.length?"Nenhuma tarefa corresponde a esse filtro.":"Nenhuma data cadastrada ainda. Adicione sua primeira tarefa!"}</div>`;
    $("home-tasks").innerHTML = tasks.filter(t=>!t.done && t.date>=today()).slice(0,4).map(t=>taskMarkup(t,true)).join("") || `<div class="empty-state">Tudo começa com um pequeno registro.<br>Adicione uma data ou tarefa.</div>`;
  }
  $("task-search").addEventListener("input", renderTasks); $("task-filter").addEventListener("change", renderTasks);
  document.addEventListener("click", e => {
    const toggle = e.target.closest("[data-task-toggle]");
    const del = e.target.closest("[data-task-delete]");
    const entryEdit = e.target.closest("[data-entry-edit]");
    const entryDelete = e.target.closest("[data-entry-delete]");
    const txDelete = e.target.closest("[data-tx-delete]");
    const pastoralDelete = e.target.closest("[data-pastoral-delete]");
    const pastoralToggle = e.target.closest("[data-pastoral-toggle]");
    if (pastoralDelete) {
      if (confirm("Excluir este registro pastoral?")) {
        data.pastoral = data.pastoral.filter(x => x.id !== pastoralDelete.dataset.pastoralDelete);
        save(); toast("Registro excluído.");
      }
    }
    if (pastoralToggle) {
      data.pastoral = data.pastoral.map(x => x.id === pastoralToggle.dataset.pastoralToggle ? {...x, status: x.status === "done" ? "pending" : "done"} : x);
      save();
    }
    if (toggle) { data.tasks = data.tasks.map(t=>t.id===toggle.dataset.taskToggle?{...t,done:!t.done}:t); save(); }
    if (del) { if(confirm("Excluir esta data ou tarefa?")) { data.tasks=data.tasks.filter(t=>t.id!==del.dataset.taskDelete); save(); toast("Tarefa excluída."); } }
    if (entryEdit) {
      const entry=data.diary.find(x=>x.id===entryEdit.dataset.entryEdit); if(!entry)return;
      editingEntry=entry.id; entryExistingImages=entry.images||[]; $("entry-images").value=""; renderImagePreview("entry-image-preview",entryExistingImages); $("entry-title").value=entry.title; $("entry-mood").value=entry.mood; $("entry-body").value=entry.body; $("diary-form-title").textContent="Editar entrada"; $("cancel-entry").classList.remove("hidden"); $("entry-title").focus(); window.scrollTo({top:0,behavior:"smooth"});
    }
    if (entryDelete) { if(confirm("Excluir esta entrada do diário?")) {data.diary=data.diary.filter(x=>x.id!==entryDelete.dataset.entryDelete);save();toast("Entrada excluída.");} }
    if (txDelete) { if(confirm("Excluir este lançamento financeiro?")) {data.transactions=data.transactions.filter(x=>x.id!==txDelete.dataset.txDelete);save();toast("Lançamento excluído.");} }
  });

  function renderDiary() {
    const entries=[...data.diary].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    $("diary-list").innerHTML=entries.length?entries.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)} · ${escapeHTML(x.mood)}</div><div class="item-note">${escapeHTML(x.body.length>220?x.body.slice(0,220)+"…":x.body)}</div>${imageGallery(x.images)}<div class="item-actions" style="margin-top:9px"><button class="mini-button" data-entry-edit="${x.id}">Editar</button><button class="mini-button" data-entry-delete="${x.id}">Excluir</button></div></div></div>`).join(""):`<div class="empty-inline">Seu diário está esperando a primeira história.</div>`;
    const latest=entries.slice(0,2);
    $("home-diary").innerHTML=latest.length?latest.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)} · ${escapeHTML(x.mood)}</div><div class="item-note">${escapeHTML(x.body.slice(0,110))}${x.body.length>110?"…":""}</div>${imageGallery(x.images)}</div></div>`).join(""):`<div class="empty-state">Guarde aqui pensamentos, ideias e lembranças.</div>`;
  }
  function ensureMonthOptions() {
    const select=$("finance-month"), current=monthKey(today());
    const months=new Set([current,...data.transactions.map(t=>monthKey(t.date))]);
    const sorted=[...months].filter(Boolean).sort().reverse();
    const old=select.value;
    select.innerHTML=sorted.map(m=>{const [y,mo]=m.split("-");const label=new Date(Number(y),Number(mo)-1,1).toLocaleDateString("pt-BR",{month:"long",year:"numeric"});return `<option value="${m}">${label}</option>`}).join("");
    select.value=sorted.includes(old)?old:current;
  }
  function renderFinance() {
    ensureMonthOptions();
    const month=$("finance-month").value||monthKey(today());
    const txs=data.transactions.filter(t=>monthKey(t.date)===month).sort((a,b)=>b.date.localeCompare(a.date));
    const income=txs.filter(t=>t.type==="income").reduce((s,t)=>s+t.amount,0);
    const expense=txs.filter(t=>t.type==="expense").reduce((s,t)=>s+t.amount,0);
    $("month-income").textContent=money(income); $("month-expense").textContent=money(expense); $("month-net").textContent=money(income-expense);
    $("stat-balance").textContent=money(income-expense);
    $("transaction-list").innerHTML=txs.length?txs.map(t=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(t.title)}</div><div class="item-meta">${dateLabel(t.date)} · ${escapeHTML(t.category)}</div>${imageGallery(t.images)}</div><div class="item-actions"><span class="amount ${t.type}">${t.type==="income"?"+":"−"} ${money(t.amount)}</span><button class="mini-button" data-tx-delete="${t.id}">Excluir</button></div></div>`).join(""):`<div class="empty-inline">Nenhum lançamento neste mês. Registre uma receita ou despesa.</div>`;
  }
  $("finance-month").addEventListener("change",renderFinance);
  function pastoralMarkup(item) {
    const nucleus = item.area === "nucleo";
    const status = nucleus ? `<button class="check-button" data-pastoral-toggle="${item.id}" aria-label="Alternar status">${item.status==="done"?"✓":""}</button>` : "";
    return `<div class="item-row ${item.status==="done"?"done":""}">${status}<div class="item-main"><div class="item-title">${escapeHTML(item.title)}</div><div class="item-meta">${dateLabel(item.date)}${item.time?` · ${escapeHTML(item.time)}`:""}${item.category?` · ${escapeHTML(item.category)}`:""}</div>${item.location?`<div class="item-meta">⌖ ${escapeHTML(item.location)}</div>`:""}${item.notes?`<div class="item-note">${escapeHTML(item.notes)}</div>`:""}${imageGallery(item.images)}${nucleus?`<span class="tag">${item.status==="done"?"Concluída":"Pendente"}</span>`:""}</div><div class="item-actions"><button class="mini-button" data-pastoral-delete="${item.id}">Excluir</button></div></div>`;
  }
  function renderPastoral() {
    const areas = ["pascom","juventude","nucleo","acolito"];
    for (const area of areas) {
      const all = (data.pastoral || []).filter(x=>x.area===area).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||""));
      let items = all;
      if (area==="nucleo") {
        const filter=$("filter-nucleo").value;
        if (filter==="pending") items=all.filter(x=>x.status!=="done");
        if (filter==="done") items=all.filter(x=>x.status==="done");
        $("count-nucleo").textContent=all.length;
        $("pending-nucleo").textContent=all.filter(x=>x.status!=="done").length;
      } else {
        const month=$(`filter-${area}`).value;
        if (month) items=all.filter(x=>(x.date||"").startsWith(month));
        $(`count-${area}`).textContent=all.length;
        const next=all.find(x=>x.date>=today() && (area!=="nucleo" || x.status!=="done"));
        $(`next-${area}`).textContent=next?dateLabel(next.date):"—";
      }
      $(`list-${area}`).innerHTML=items.length?items.map(pastoralMarkup).join(""):`<div class="empty-inline">${({pascom:"Nenhum evento da PASCOM cadastrado neste período.",juventude:"Nenhum evento da Juventude cadastrado neste período.",nucleo:"Nenhuma responsabilidade cadastrada ainda.",acolito:"Nenhuma missa registrada neste período."})[area]}</div>`;
    }
  }
  let calendarCursor = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  let calendarSelected = today();
  const calendarEvents = () => {
    const events = [];
    (data.tasks||[]).forEach(x=>events.push({date:x.date,title:x.title,time:x.time,area:"Tarefa",icon:"✓",notes:x.notes,images:x.images,done:x.done}));
    (data.pastoral||[]).forEach(x=>events.push({date:x.date,title:x.title,time:x.time,area:({pascom:"PASCOM",juventude:"Juventude",nucleo:"Núcleo JSF",acolito:"Acólito"})[x.area]||"Pastoral",icon:({pascom:"📣",juventude:"🎉",nucleo:"◎",acolito:"✝️"})[x.area]||"✦",notes:x.notes,images:x.images,location:x.location}));
    (data.roles||[]).forEach(x=>events.push({date:x.date,title:x.title,time:x.time,area:"Rolê",icon:"🎉",notes:[x.location,x.people,x.notes].filter(Boolean).join(" · "),images:x.images}));
    (data.transactions||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:x.type==="income"?"Receita":"Despesa",icon:x.type==="income"?"＋":"−",notes:money(x.amount),images:x.images}));
    (data.diary||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:"Diário",icon:"✎",notes:x.mood,images:x.images}));
    return events.filter(x=>x.date);
  };
  function renderCalendar() {
    const year=calendarCursor.getFullYear(), month=calendarCursor.getMonth();
    $("calendar-month-title").textContent=calendarCursor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});
    const firstDay=new Date(year,month,1), offset=(firstDay.getDay()+6)%7, days=new Date(year,month+1,0).getDate();
    const all=calendarEvents(); let cells=[];
    for(let i=0;i<offset;i++) cells.push('<div class="calendar-cell blank"></div>');
    for(let day=1;day<=days;day++){
      const key=`${year}-${String(month+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
      const count=all.filter(x=>x.date===key).length;
      cells.push(`<button class="calendar-cell ${key===calendarSelected?"selected":""} ${key===today()?"is-today":""}" data-calendar-date="${key}"><span>${day}</span>${count?`<small>${count} ${count===1?"item":"itens"}</small>`:""}</button>`);
    }
    $("calendar-grid").innerHTML=cells.join("");
    const selectedEvents=all.filter(x=>x.date===calendarSelected).sort((a,b)=>(a.time||"").localeCompare(b.time||""));
    $("calendar-selected-title").textContent=new Date(...calendarSelected.split("-").map((v,i)=>i===1?Number(v)-1:Number(v))).toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"});
    $("calendar-day-list").innerHTML=selectedEvents.length?selectedEvents.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${x.icon} ${escapeHTML(x.title)}</div><div class="item-meta">${x.time?escapeHTML(x.time)+" · ":""}${escapeHTML(x.area)}</div>${x.notes?`<div class="item-note">${escapeHTML(x.notes)}</div>`:""}${imageGallery(x.images)}</div></div>`).join(""):'<div class="empty-inline">Nenhum compromisso registrado neste dia.</div>';
  }
  $("calendar-prev").addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()-1,1);renderCalendar();});
  $("calendar-next").addEventListener("click",()=>{calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth()+1,1);renderCalendar();});
  $("calendar-today").addEventListener("click",()=>{calendarCursor=new Date();calendarCursor=new Date(calendarCursor.getFullYear(),calendarCursor.getMonth(),1);calendarSelected=today();renderCalendar();});
  $("calendar-grid").addEventListener("click",e=>{const btn=e.target.closest("[data-calendar-date]");if(btn){calendarSelected=btn.dataset.calendarDate;renderCalendar();}});
  $("roles-month").addEventListener("change",renderRoles);
  function renderRoles(){
    const month=$("roles-month").value, items=(data.roles||[]).filter(x=>!month||(x.date||"").startsWith(month)).sort((a,b)=>(a.date||"").localeCompare(b.date||"")||(a.time||"").localeCompare(b.time||""));
    $("roles-list").innerHTML=items.length?items.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">🎉 ${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)}${x.time?" · "+escapeHTML(x.time):""}</div>${x.location?`<div class="item-meta">⌖ ${escapeHTML(x.location)}</div>`:""}${x.people?`<div class="item-meta">Com: ${escapeHTML(x.people)}</div>`:""}${x.notes?`<div class="item-note">${escapeHTML(x.notes)}</div>`:""}${imageGallery(x.images)}</div><div class="item-actions"><button class="mini-button" data-role-delete="${x.id}">Excluir</button></div></div>`).join(""):'<div class="empty-inline">Nenhum rolê cadastrado neste período. Planeje um momento com seus amigos!</div>';
  }
  document.addEventListener("click",e=>{const del=e.target.closest("[data-role-delete]");if(del&&confirm("Excluir este rolê?")){data.roles=(data.roles||[]).filter(x=>x.id!==del.dataset.roleDelete);save();toast("Rolê excluído.");}});
  function renderAll() {
    $("stat-tasks").textContent=data.tasks.filter(t=>!t.done).length;
    $("stat-diary").textContent=data.diary.length;
    renderTasks(); renderDiary(); renderFinance(); renderPastoral(); renderRoles(); renderCalendar();
  }
  renderAll();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();