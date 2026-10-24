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
  let editingTask = null;
  let editingTransaction = null;
  let editingPastoral = null;
  let editingRole = null;
  let editingPrayer = null;
  let editingMember = null;
  let editingGoal = null;
  let editingNote = null;
  let editingBibleNote = null;
  let entryExistingImages = [];
  let taskExistingImages = [];
  let transactionExistingImages = [];
  let pastoralExistingImages = [];
  let roleExistingImages = [];
  let profilePhotoData = null;
  let activePrayerCategory = "nossa-senhora";
  let prayerFilter = "all";
  let activeVaultKey = null;
  let activeVaultNote = "";
  let galleryUploadBusy = false;
  let saveFailurePending = false;

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
        const max = 1200;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(img.width * scale));
        canvas.height = Math.max(1, Math.round(img.height * scale));
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve({ name: file.name, data: canvas.toDataURL("image/jpeg", 0.70) });
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
  data = { tasks: [], diary: [], transactions: [], pastoral: [], roles: [], gallery: [], prayers: [], members: [], improvements: [], intentions: [], gratitude: [], goals: [], bibleNotes: [], profile: {}, confessionVault: null, ...data };
  for (const key of ["tasks","diary","transactions","pastoral","roles","gallery","prayers","members","improvements","intentions","gratitude","goals","bibleNotes"]) if (!Array.isArray(data[key])) data[key] = [];
  const save = () => {
    try {
      localStorage.setItem(STORE, JSON.stringify(data));
      saveFailurePending = false;
      renderAll();
      return true;
    } catch (e) {
      saveFailurePending = true;
      console.error("Falha ao salvar os dados locais do Magnificat.", e);
      toast("Não foi possível salvar neste navegador. Exporte um backup e reduza as fotos anexadas para liberar espaço.");
      setTimeout(() => { saveFailurePending = false; }, 4000);
      return false;
    }
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
    const soundsLikeSuccess = /(salv[oa]s?|registrad[oa]s?|atualizad[oa]s?|adicionad[oa]s?|excluíd[oa]s?|concluíd[oa]s?|restaurad[oa]s?|criad[oa]s?|meta salva|perfil atualizado|oração salva|membro salvo|foto atualizada|status atualizado)/i.test(message);
    if (saveFailurePending && soundsLikeSuccess) {
      message = "Os dados não foram salvos neste navegador. Exporte um backup e remova anexos grandes para liberar espaço.";
      saveFailurePending = false;
    }
    const el = $("toast"); el.textContent = message; el.classList.add("show");
    clearTimeout(toast.timer); toast.timer = setTimeout(() => el.classList.remove("show"), 3500);
  }
  function openView(view) {
    document.querySelectorAll(".view").forEach(el => el.classList.toggle("active", el.id === `view-${view}`));
    document.querySelectorAll(".nav-link").forEach(el => el.classList.toggle("active", el.dataset.view === view || (el.dataset.view === "pastorais" && ["pascom","juventude","nucleo","acolito"].includes(view))));
    const titles = {inicio:"Bom ter você aqui.",calendario:"Calendário geral",roles:"Rolês",datas:"Tarefas",diario:"Diário pessoal",financeiro:"Finanças",pastorais:"Pastorais",mais:"Mais",liturgia:"Liturgia diária",oracoes:"Orações","prayer-detail":"Orações",biblia:"Bíblia",galeria:"Galeria",perfil:"Perfil pessoal",intencoes:"Intenções",gratidao:"Gratidão",ajuda:"Central de melhorias",configuracoes:"Configurações e backup",pascom:"PASCOM",juventude:"Juventude Sagrada Face",nucleo:"Núcleo",acolito:"Acólitos"};
    $("page-title").textContent = titles[view] || titles.inicio;
    if (view === "diario" && $("entry-title")) $("entry-title").focus({preventScroll:true});
    if (view === "oracoes") renderPrayerCategories();
    if (view === "galeria") renderGallery();
    if (view === "perfil") renderProfile();
    if (view === "intencoes") renderNotes("intention");
    if (view === "gratidao") renderNotes("gratitude");
    if (view === "ajuda") renderImprovements();
    if (view === "biblia") renderBibleNotes();
    window.scrollTo({top:0,behavior:"smooth"});
  }
  document.querySelectorAll("[data-view]").forEach(btn => btn.addEventListener("click", () => openView(btn.dataset.view)));
  document.querySelectorAll("[data-go]").forEach(btn => btn.addEventListener("click", () => openView(btn.dataset.go)));
  $("today-label").textContent = new Date().toLocaleDateString("pt-BR",{weekday:"long",day:"numeric",month:"long"}).toUpperCase();

  const taskDialog = $("task-dialog"), financeDialog = $("finance-dialog");
  const pastoralDialog = $("pastoral-dialog");
  const pastoralNames = {pascom:"PASCOM",juventude:"Juventude",nucleo:"Núcleo JSF",acolito:"Acólito"};
  function openPastoralDialog(area, id = null) {
    editingPastoral = id;
    const existing = id ? data.pastoral.find(x => x.id === id) : null;
    $("pastoral-form").reset(); $("pastoral-image-preview").innerHTML = ""; $("pastoral-images").value = "";
    pastoralExistingImages = existing?.images || [];
    $("pastoral-area").value = area;
    $("pastoral-date").value = today();
    $("pastoral-dialog-title").textContent = existing ? "Editar registro" : ({pascom:"Novo evento da PASCOM",juventude:"Novo evento da Juventude",nucleo:"Nova responsabilidade",acolito:"Registrar missa"}[area]);
    $("pastoral-dialog-eyebrow").textContent = pastoralNames[area].toUpperCase();
    $("pastoral-category-wrap").classList.toggle("hidden", area==="nucleo" || area==="acolito");
    $("pastoral-status-wrap").classList.toggle("hidden", area!=="nucleo");
    $("pastoral-location-wrap").classList.toggle("hidden", area==="nucleo");
    $("pastoral-title").placeholder = area==="acolito" ? "Ex.: Missa das 18h" : area==="nucleo" ? "Ex.: preparar pauta da reunião" : "Nome do evento ou atividade";
    $("pastoral-category").innerHTML = (area==="pascom" ? ["Evento","Reunião","Cobertura","Publicação","Formação","Outro"] : area==="juventude" ? ["Encontro","Reunião","Retiro","Formação","Ação social","Evento","Outro"] : ["Missa","Celebração","Outro"]).map(x=>`<option>${x}</option>`).join("");
    if (existing) {
      $("pastoral-title").value = existing.title || ""; $("pastoral-date").value = existing.date || today(); $("pastoral-time").value = existing.time || "";
      $("pastoral-category").value = existing.category || $("pastoral-category").value; $("pastoral-status").value = existing.status || "pending";
      $("pastoral-location").value = existing.location || ""; $("pastoral-notes").value = existing.notes || "";
      renderImagePreview("pastoral-image-preview", pastoralExistingImages);
    }
    pastoralDialog.showModal();
    $("pastoral-title").focus();
  }
  document.querySelectorAll("[data-add-pastoral]").forEach(btn => btn.addEventListener("click", () => openPastoralDialog(btn.dataset.addPastoral)));
  document.querySelectorAll(".month-filter").forEach(input => input.addEventListener("change", renderPastoral));
  $("filter-nucleo").addEventListener("change", renderPastoral);
  $("pastoral-form").addEventListener("submit", async e => {
    e.preventDefault();
    const area = $("pastoral-area").value;
    const newImages = await selectedImages("pastoral-images");
    const images = [...pastoralExistingImages, ...newImages].slice(0,5);
    const old = data.pastoral.find(x=>x.id===editingPastoral);
    const record = {
      id: editingPastoral || makeId(), area, title: $("pastoral-title").value.trim(),
      date: $("pastoral-date").value, time: $("pastoral-time").value,
      category: area==="nucleo" ? "Responsabilidade" : $("pastoral-category").value,
      status: area==="nucleo" ? $("pastoral-status").value : (old?.status || "pending"),
      location: $("pastoral-location").value.trim(), notes: $("pastoral-notes").value.trim(), images,
      createdAt: old?.createdAt || Date.now(), updatedAt: Date.now()
    };
    if (editingPastoral) data.pastoral = data.pastoral.map(x => x.id===editingPastoral ? record : x); else data.pastoral.push(record);
    editingPastoral = null; pastoralExistingImages = [];
    pastoralDialog.close(); save(); toast("Registro pastoral salvo!");
  });
  document.querySelectorAll("[data-close]").forEach(btn => btn.addEventListener("click", () => $(btn.dataset.close).close()));
  function openTaskDialog(id = null) {
    editingTask = id;
    const existing = id ? data.tasks.find(x => x.id === id) : null;
    $("task-form").reset(); $("task-image-preview").innerHTML = ""; $("task-images").value = ""; taskExistingImages = existing?.images || [];
    $("task-date").value = today();
    if (existing) {
      $("task-title").value=existing.title||""; $("task-date").value=existing.date||today(); $("task-time").value=existing.time||"";
      $("task-category").value=existing.category||"Pessoal"; $("task-priority").value=existing.priority||"normal"; $("task-recurrence").value=existing.recurrence||"none"; $("task-notes").value=existing.notes||"";
      renderImagePreview("task-image-preview",taskExistingImages);
    }
    taskDialog.querySelector("h2").textContent=existing?"Editar tarefa ou data":"Nova data ou tarefa";
    taskDialog.querySelector('button[type="submit"]').textContent=existing?"Salvar alterações":"Salvar data";
    taskDialog.showModal(); $("task-title").focus();
  }
  function openFinanceDialog(id = null) {
    editingTransaction = id;
    const existing = id ? data.transactions.find(x => x.id === id) : null;
    $("finance-form").reset(); $("transaction-image-preview").innerHTML = ""; $("transaction-images").value=""; transactionExistingImages = existing?.images || [];
    $("transaction-date").value = today(); $("transaction-installments").value="1";
    if (existing) {
      $("transaction-type").value=existing.type||"expense"; $("transaction-title").value=existing.title||""; $("transaction-amount").value=existing.amount||"";
      $("transaction-date").value=existing.date||today(); $("transaction-category").value=existing.category||"Outros"; $("transaction-card").value=existing.card||"";
      renderImagePreview("transaction-image-preview",transactionExistingImages);
    }
    financeDialog.querySelector("h2").textContent=existing?"Editar lançamento":"Novo lançamento";
    financeDialog.querySelector('button[type="submit"]').textContent=existing?"Salvar alterações":"Salvar lançamento";
    $("transaction-installments").disabled=!!existing; financeDialog.showModal(); $("transaction-title").focus();
  }
  $("quick-add").addEventListener("click", () => {
    const choice = prompt("O que você quer adicionar?\n1 — Data ou tarefa\n2 — Entrada no diário\n3 — Lançamento financeiro");
    if (choice === "1") { openView("datas"); openTaskDialog(); }
    else if (choice === "2") { openView("diario"); $("entry-title").focus(); }
    else if (choice === "3") { openView("financeiro"); openFinanceDialog(); }
  });
  $("add-task").addEventListener("click", () => openTaskDialog());
  $("add-entry").addEventListener("click", () => { editingEntry = null; entryExistingImages = []; $("diary-form").reset(); $("entry-date").value=today(); $("entry-images").value=""; $("entry-image-preview").innerHTML = ""; $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden"); $("entry-title").focus(); });
  $("add-transaction").addEventListener("click", () => openFinanceDialog());
  bindImagePicker("entry-images", "entry-image-preview", () => editingEntry ? (data.diary.find(x=>x.id===editingEntry)?.images || []) : []);
  bindImagePicker("task-images", "task-image-preview", () => []);
  bindImagePicker("transaction-images", "transaction-image-preview", () => []);
  bindImagePicker("pastoral-images", "pastoral-image-preview", () => []);

  function openRoleDialog(id=null) {
    editingRole=id; const existing=id?data.roles.find(x=>x.id===id):null; roleExistingImages=existing?.images||[];
    $("role-form").reset(); $("role-images").value=""; $("role-image-preview").innerHTML=""; $("role-date").value=today();
    if(existing){$("role-title").value=existing.title||"";$("role-date").value=existing.date||today();$("role-time").value=existing.time||"";$("role-location").value=existing.location||"";$("role-people").value=existing.people||"";$("role-notes").value=existing.notes||"";$("role-cost").value=existing.cost||"";$("role-expenses").value=existing.expenses||"";renderImagePreview("role-image-preview",roleExistingImages);}
    $("role-dialog").querySelector("h2").textContent=existing?"Editar rolê":"Novo rolê"; $("role-dialog").querySelector('button[type="submit"]').textContent=existing?"Salvar alterações":"Salvar rolê"; $("role-dialog").showModal(); $("role-title").focus();
  }
  $("add-role").addEventListener("click", () => openRoleDialog());
  bindImagePicker("role-images", "role-image-preview", () => []);
  $("role-form").addEventListener("submit", async e => {
    e.preventDefault();
    const selected = await selectedImages("role-images");
    data.roles = data.roles || [];
    const old=data.roles.find(x=>x.id===editingRole);
    const record={id:editingRole||makeId(),title:$("role-title").value.trim(),date:$("role-date").value,time:$("role-time").value,location:$("role-location").value.trim(),people:$("role-people").value.trim(),notes:$("role-notes").value.trim(),cost:Number($("role-cost").value||0),expenses:Number($("role-expenses").value||0),images:[...roleExistingImages,...selected].slice(0,5),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
    if(editingRole) data.roles=data.roles.map(x=>x.id===editingRole?record:x); else data.roles.unshift(record);
    editingRole=null; roleExistingImages=[]; $("role-dialog").close(); save(); toast("Rolê salvo!");
  });

  $("task-form").addEventListener("submit", async e => {
    e.preventDefault();
    const selected = await selectedImages("task-images");
    const old=data.tasks.find(x=>x.id===editingTask);
    const record={id:editingTask||makeId(),title:$("task-title").value.trim(),date:$("task-date").value,time:$("task-time").value,category:$("task-category").value,priority:$("task-priority").value,recurrence:$("task-recurrence").value,notes:$("task-notes").value.trim(),images:[...taskExistingImages,...selected].slice(0,5),done:old?.done||false,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};
    if(editingTask) data.tasks=data.tasks.map(x=>x.id===editingTask?record:x); else data.tasks.push(record);
    editingTask=null; taskExistingImages=[]; taskDialog.close(); save(); toast("Data salva com sucesso!");
  });
  $("diary-form").addEventListener("submit", async e => {
    e.preventDefault();
    const newImages = await selectedImages("entry-images");
    const existing = editingEntry ? (data.diary.find(x=>x.id===editingEntry)?.images || []) : [];
    const entry = {id:editingEntry || makeId(),title:$("entry-title").value.trim(),mood:$("entry-mood").value,body:$("entry-body").value.trim(),images:[...existing,...newImages].slice(0,5),date:$("entry-date").value||today(),updatedAt:Date.now(),createdAt:data.diary.find(x=>x.id===editingEntry)?.createdAt||Date.now()};
    if (editingEntry) data.diary = data.diary.map(x => x.id === editingEntry ? entry : x);
    else data.diary.unshift(entry);
    editingEntry = null; entryExistingImages=[]; $("diary-form").reset(); $("entry-images").value=""; $("entry-image-preview").innerHTML=""; $("entry-date").value=today(); $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden");
    save(); toast("Entrada do diário salva!");
  });
  $("cancel-entry").addEventListener("click", () => { editingEntry = null; entryExistingImages = []; $("diary-form").reset(); $("entry-image-preview").innerHTML = ""; $("diary-form-title").textContent = "Registrar um momento"; $("cancel-entry").classList.add("hidden"); });
  $("finance-form").addEventListener("submit", async e => {
    e.preventDefault();
    const selected = await selectedImages("transaction-images");
    const type=$("transaction-type").value, title=$("transaction-title").value.trim(), amount=Number($("transaction-amount").value), date=$("transaction-date").value, category=$("transaction-category").value, card=$("transaction-card").value.trim();
    const wasEditing=!!editingTransaction;
    if(editingTransaction){
      const old=data.transactions.find(x=>x.id===editingTransaction);
      const record={...old,type,title,amount,date,category,card,images:[...transactionExistingImages,...selected].slice(0,5),updatedAt:Date.now()};
      data.transactions=data.transactions.map(x=>x.id===editingTransaction?record:x); editingTransaction=null;
    } else {
      const count=type==="expense"?Math.max(1,Math.min(60,Number($("transaction-installments").value||1))):1;
      const purchaseId=count>1?makeId():null;
      const installmentBase=Math.floor((amount/count)*100)/100;
      for(let i=0;i<count;i++){
        const installmentAmount=i===count-1?Math.round((amount-installmentBase*(count-1))*100)/100:installmentBase;
        const [startYear,startMonth,startDay]=date.split("-").map(Number);
        const targetMonthIndex=(startMonth-1)+i;
        const targetYear=startYear+Math.floor(targetMonthIndex/12);
        const targetMonth=((targetMonthIndex%12)+12)%12;
        const targetLastDay=new Date(targetYear,targetMonth+1,0).getDate();
        const d=new Date(targetYear,targetMonth,Math.min(startDay,targetLastDay),12);
        const installmentDate=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
        data.transactions.unshift({id:makeId(),type,title:count>1?`${title} (parcela ${i+1}/${count})`:title,amount:installmentAmount,date:installmentDate,category,card,images:i===0?selected:[],purchaseId,installmentNumber:count>1?i+1:1,installmentCount:count,totalPurchase:count>1?amount:amount,createdAt:Date.now()});
      }
    }
    transactionExistingImages=[]; $("transaction-installments").disabled=false; financeDialog.close(); save(); toast(wasEditing?"Lançamento atualizado!":"Lançamento registrado!");
  });

  function taskMarkup(t, compact=false) {
    return `<div class="item-row ${t.done?"done":""}"><button class="check-button" data-task-toggle="${t.id}" aria-label="${t.done?"Marcar pendente":"Concluir tarefa"}">${t.done?"✓":""}</button><div class="item-main"><div class="item-title">${escapeHTML(t.title)}</div><div class="item-meta">${dateLabel(t.date)}${t.time?` · ${escapeHTML(t.time)}`:""} · ${escapeHTML(t.category)}${t.priority&&t.priority!=="normal"?` · Prioridade ${t.priority==="high"?"alta":"baixa"}`:""}${t.recurrence&&t.recurrence!=="none"?` · ${({weekly:"semanal",monthly:"mensal",yearly:"anual"})[t.recurrence]||"recorrente"}`:""}</div>${t.notes&&!compact?`<div class="item-note">${escapeHTML(t.notes)}</div>`:""}${!compact?imageGallery(t.images):""}</div>${compact?"":`<div class="item-actions"><button class="mini-button" data-task-edit="${t.id}">Editar</button><button class="mini-button" data-task-delete="${t.id}">Excluir</button></div>`}</div>`;
  }
  function renderTasks() {
    const q = $("task-search").value.trim().toLowerCase(), filter = $("task-filter").value, priority = $("task-priority-filter")?.value || "all";
    const tasks = [...data.tasks].sort((a,b)=>(a.date||"").localeCompare(b.date||"") || (a.time||"").localeCompare(b.time||""));
    const filtered = tasks.filter(t => (!q || `${t.title} ${t.category} ${t.notes}`.toLowerCase().includes(q)) && (filter==="all" || (filter==="done"?t.done:!t.done)) && (priority==="all"||(t.priority||"normal")===priority));
    $("task-list").innerHTML = filtered.length ? filtered.map(t=>taskMarkup(t)).join("") : `<div class="empty-inline">${data.tasks.length?"Nenhuma tarefa corresponde a esse filtro.":"Nenhuma data cadastrada ainda. Adicione sua primeira tarefa!"}</div>`;
    $("home-tasks").innerHTML = tasks.filter(t=>!t.done && t.date>=today()).slice(0,4).map(t=>taskMarkup(t,true)).join("") || `<div class="empty-state">Tudo começa com um pequeno registro.<br>Adicione uma data ou tarefa.</div>`;
  }
  $("task-search").addEventListener("input", renderTasks); $("task-filter").addEventListener("change", renderTasks); $("task-priority-filter")?.addEventListener("change",renderTasks);
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
      editingEntry=entry.id; entryExistingImages=entry.images||[]; $("entry-images").value=""; $("entry-date").value=entry.date||today(); renderImagePreview("entry-image-preview",entryExistingImages); $("entry-title").value=entry.title; $("entry-mood").value=entry.mood; $("entry-body").value=entry.body; $("diary-form-title").textContent="Editar entrada"; $("cancel-entry").classList.remove("hidden"); $("entry-title").focus(); window.scrollTo({top:0,behavior:"smooth"});
    }
    if (entryDelete) { if(confirm("Excluir esta entrada do diário?")) {data.diary=data.diary.filter(x=>x.id!==entryDelete.dataset.entryDelete);save();toast("Entrada excluída.");} }
    if (txDelete) { if(confirm("Excluir este lançamento financeiro?")) {data.transactions=data.transactions.filter(x=>x.id!==txDelete.dataset.txDelete);save();toast("Lançamento excluído.");} }
  });

  function renderDiary() {
    const q=($("diary-search")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const all=[...data.diary].sort((a,b)=>(b.updatedAt||0)-(a.updatedAt||0));
    const entries=all.filter(x=>!q||`${x.title} ${x.body} ${x.mood} ${x.date}`.toLocaleLowerCase("pt-BR").includes(q));
    $("diary-list").innerHTML=entries.length?entries.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)} · ${escapeHTML(x.mood)}</div><div class="item-note">${escapeHTML(x.body.length>220?x.body.slice(0,220)+"…":x.body)}</div>${imageGallery(x.images)}<div class="item-actions" style="margin-top:9px"><button class="mini-button" data-entry-edit="${x.id}">Editar</button><button class="mini-button" data-entry-delete="${x.id}">Excluir</button></div></div></div>`).join(""):`<div class="empty-inline">Seu diário está esperando a primeira história.</div>`;
    const latest=all.slice(0,2);
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
    $("transaction-list").innerHTML=txs.length?txs.map(t=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(t.title)}</div><div class="item-meta">${dateLabel(t.date)} · ${escapeHTML(t.category)}</div>${imageGallery(t.images)}</div><div class="item-actions"><span class="amount ${t.type}">${t.type==="income"?"+":"−"} ${money(t.amount)}</span><button class="mini-button" data-tx-edit="${t.id}">Editar</button><button class="mini-button" data-tx-delete="${t.id}">Excluir</button></div></div>`).join(""):`<div class="empty-inline">Nenhum lançamento neste mês. Registre uma receita ou despesa.</div>`;
  }
  $("finance-month").addEventListener("change",()=>{renderFinance();if(typeof renderFinanceReport==="function")renderFinanceReport();});
  function pastoralMarkup(item) {
    const nucleus = item.area === "nucleo";
    const status = nucleus ? `<button class="check-button" data-pastoral-toggle="${item.id}" aria-label="Alternar status">${item.status==="done"?"✓":""}</button>` : "";
    return `<div class="item-row ${item.status==="done"?"done":""}">${status}<div class="item-main"><div class="item-title">${escapeHTML(item.title)}</div><div class="item-meta">${dateLabel(item.date)}${item.time?` · ${escapeHTML(item.time)}`:""}${item.category?` · ${escapeHTML(item.category)}`:""}</div>${item.location?`<div class="item-meta">⌖ ${escapeHTML(item.location)}</div>`:""}${item.notes?`<div class="item-note">${escapeHTML(item.notes)}</div>`:""}${imageGallery(item.images)}${nucleus?`<span class="tag">${item.status==="done"?"Concluída":"Pendente"}</span>`:""}</div><div class="item-actions"><button class="mini-button" data-pastoral-edit="${item.id}" data-area="${item.area}">Editar</button><button class="mini-button" data-pastoral-delete="${item.id}">Excluir</button></div></div>`;
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
  let calendarEvents = () => {
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
    $("roles-list").innerHTML=items.length?items.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">🎉 ${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)}${x.time?" · "+escapeHTML(x.time):""}</div>${x.location?`<div class="item-meta">⌖ ${escapeHTML(x.location)}</div>`:""}${x.people?`<div class="item-meta">Com: ${escapeHTML(x.people)}</div>`:""}${x.notes?`<div class="item-note">${escapeHTML(x.notes)}</div>`:""}${x.cost?`<div class="item-meta">Custo previsto: ${money(x.cost)}</div>`:""}${x.expenses?`<div class="item-meta">Despesas já pagas: ${money(x.expenses)}</div>`:""}${imageGallery(x.images)}</div><div class="item-actions"><button class="mini-button" data-role-edit="${x.id}">Editar</button><button class="mini-button" data-role-delete="${x.id}">Excluir</button></div></div>`).join(""):'<div class="empty-inline">Nenhum rolê cadastrado neste período. Planeje um momento com seus amigos!</div>';
  }
  document.addEventListener("click",e=>{const del=e.target.closest("[data-role-delete]");if(del&&confirm("Excluir este rolê?")){data.roles=(data.roles||[]).filter(x=>x.id!==del.dataset.roleDelete);save();toast("Rolê excluído.");}});
  // --- Funcionalidades adicionais do Magnificat: orações, Bíblia, galeria, perfil, backup e central de melhorias ---
  const PRAYER_CATEGORIES = [
    {id:"nossa-senhora", title:"Nossa Senhora", cover:"assets/prayer-covers/nossa-senhora.jpg", description:"Orações e devoções marianas."},
    {id:"sao-jose", title:"São José", cover:"assets/prayer-covers/sao-jose.jpg", description:"Orações e devoções a São José."},
    {id:"santos", title:"Santos", cover:"assets/prayer-covers/santos.jpg", description:"Novenas e devoções aos santos e testemunhas da fé."},
    {id:"vida-de-oracao", title:"Vida de oração", cover:"assets/prayer-covers/vida-de-oracao.jpg", description:"Orações básicas para o dia a dia."},
    {id:"santa-missa", title:"Santa Missa", cover:"assets/prayer-covers/santa-missa.jpg", description:"Orações para preparar e aprofundar a participação na Eucaristia."},
    {id:"confissao", title:"Confissão", cover:"assets/prayer-covers/confissao.jpg", description:"Preparação para o sacramento da Reconciliação e bloco privado."},
    {id:"adoracao-santissimo", title:"Adoração ao Santíssimo", cover:"assets/prayer-covers/adoracao-santissimo.jpg", description:"Orações diante de Jesus Eucarístico."}
  ];
  const prayerSources = {
    vaticanRosary: "https://www.vatican.va/special/rosary/documents/misteri_po.html",
    vaticanRosaryJohnPaul: "https://www.vatican.va/content/john-paul-ii/pt/apost_letters/2002/documents/hf_jp-ii_apl_20021016_rosarium-virginis-mariae.html",
    vaticanJoseph: "https://www.vatican.va/content/francesco/pt/apost_letters/documents/papa-francesco-lettera-ap_20201208_patris-corde.html",
    vaticanJohnPaulPrayers: "https://www.vatican.va/content/john-paul-ii/pt/prayers.html",
    vaticanTherese: "https://www.vatican.va/content/john-paul-ii/pt/speeches/1997/october/documents/hf_jp-ii_spe_19971020_teresa-lisieux.html",
    carloOfficialPrayer: "https://www.carloacutis.com/pt/association/preghiera-ufficiale",
    guidoNovena: "https://guidoschaffer.com.br/reze.html",
    francisPrayer: "https://www.vatican.va/content/john-paul-ii/pt/prayers.html",
    cantNovena: "https://formacao.cancaonova.com/espiritualidade/oracao/oracoes-para-fazer-diante-de-jesus-eucaristico/",
    padreBiblia: "https://padrepauloricardo.org/biblia",
    cnLiturgia: "https://liturgia.cancaonova.com/pb/liturgia/",
    cnbbMissal: "https://www.cnbb.org.br/traducao-missal-romano-aprovada-santa-se-confirma/",
    aparecida: "https://www.a12.com/reze-no-santuario/consagracao"
  };
  const seedPrayers = [
    {id:"rosario-como-rezar",category:"nossa-senhora",title:"Santo Terço — como rezar",body:"Sinal da Cruz e oferecimento; Credo; Pai-Nosso; três Ave-Marias e Glória ao Pai. Em cada dezena, anunciar o mistério, rezar um Pai-Nosso, dez Ave-Marias e um Glória ao Pai, meditando a passagem de Cristo. Ao final, rezar a Salve-Rainha. Os quatro grupos de mistérios estão separados nesta categoria.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"misterios-gozosos",category:"nossa-senhora",title:"Mistérios Gozosos",body:"1. A Anunciação do Anjo a Maria (Lc 1,26-38).\n2. A Visitação de Maria a Isabel (Lc 1,39-56).\n3. O Nascimento de Jesus em Belém (Lc 2,1-20).\n4. A Apresentação do Menino Jesus no Templo (Lc 2,22-40).\n5. O Encontro do Menino Jesus no Templo (Lc 2,41-52).\n\nEm cada dezena: Pai-Nosso, dez Ave-Marias e Glória ao Pai, meditando o mistério.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"misterios-luminosos",category:"nossa-senhora",title:"Mistérios Luminosos",body:"1. O Batismo de Jesus no Jordão (Mt 3,13-17).\n2. A autorrevelação de Jesus nas Bodas de Caná (Jo 2,1-12).\n3. O Anúncio do Reino de Deus e o convite à conversão (Mc 1,14-15).\n4. A Transfiguração de Jesus (Lc 9,28-36).\n5. A Instituição da Eucaristia (Mt 26,26-29).\n\nEm cada dezena: Pai-Nosso, dez Ave-Marias e Glória ao Pai, meditando o mistério.",sourceUrl:prayerSources.vaticanRosaryJohnPaul,sourceLabel:"São João Paulo II — Rosarium Virginis Mariae"},
    {id:"misterios-dolorosos",category:"nossa-senhora",title:"Mistérios Dolorosos",body:"1. A Agonia de Jesus no Horto (Mt 26,36-39).\n2. A Flagelação de Jesus (Mt 27,26).\n3. A Coroação de espinhos (Mt 27,27-31).\n4. Jesus carrega a Cruz (Jo 19,16-17).\n5. A Crucifixão e Morte de Jesus (Jo 19,18-30).\n\nEm cada dezena: Pai-Nosso, dez Ave-Marias e Glória ao Pai, meditando o mistério.",sourceUrl:"https://www.vatican.va/special/rosary/documents/misteri_dolorosi_po.html",sourceLabel:"Vaticano — Mistérios Dolorosos"},
    {id:"misterios-gloriosos",category:"nossa-senhora",title:"Mistérios Gloriosos",body:"1. A Ressurreição de Jesus (Mc 16,1-8).\n2. A Ascensão de Jesus ao Céu (At 1,6-11).\n3. A Descida do Espírito Santo (At 2,1-13).\n4. A Assunção de Maria ao Céu.\n5. A Coroação de Maria como Rainha do Céu e da Terra.\n\nEm cada dezena: Pai-Nosso, dez Ave-Marias e Glória ao Pai, meditando o mistério.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"ave-maria-maria",category:"nossa-senhora",title:"Ave-Maria",body:"Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"salve-rainha",category:"nossa-senhora",title:"Salve-Rainha",body:"Salve, Rainha, Mãe de misericórdia, vida, doçura e esperança nossa, salve! A vós bradamos, os degredados filhos de Eva. A vós suspiramos, gemendo e chorando neste vale de lágrimas. Eia, pois, advogada nossa, esses vossos olhos misericordiosos a nós volvei. E, depois deste desterro, mostrai-nos Jesus, bendito fruto do vosso ventre. Ó clemente, ó piedosa, ó doce sempre Virgem Maria. Rogai por nós, Santa Mãe de Deus, para que sejamos dignos das promessas de Cristo. Amém.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"magnificat",category:"nossa-senhora",title:"Magnificat — Cântico de Maria",body:"A minha alma engrandece o Senhor, e o meu espírito exulta em Deus, meu Salvador, porque olhou para a humildade de sua serva. Doravante todas as gerações me chamarão bem-aventurada, porque o Poderoso fez por mim grandes coisas. Santo é o seu nome. Sua misericórdia se estende de geração em geração sobre os que o temem. Manifestou o poder de seu braço, dispersou os soberbos de coração. Derrubou do trono os poderosos e exaltou os humildes. Encheu de bens os famintos e despediu os ricos de mãos vazias. Socorreu Israel, seu servo, lembrando-se de sua misericórdia, conforme prometera a nossos pais, em favor de Abraão e de sua descendência para sempre. Amém.\n\nReferência bíblica: Lucas 1,46-55. A redação portuguesa pode variar conforme a tradução bíblica.",sourceUrl:prayerSources.padreBiblia,sourceLabel:"Bíblia Sagrada — Padre Paulo Ricardo"},
    {id:"consagracao-aparecida",category:"nossa-senhora",title:"Consagração a Nossa Senhora Aparecida",body:"Use esta página para consultar a oração de consagração publicada pelo Santuário Nacional. O texto pode variar entre fórmulas devocionais; por isso, a referência fica identificada para conferência.",sourceUrl:prayerSources.aparecida,sourceLabel:"Santuário Nacional de Aparecida — Orações"},
    {id:"oracao-sao-jose",category:"sao-jose",title:"Oração a São José",body:"Salve, guardião do Redentor e esposo da Virgem Maria! A vós, Deus confiou o seu Filho; em vós, Maria depositou a sua confiança; convosco, Cristo tornou-Se homem. Ó Bem-aventurado José, mostrai-vos pai também para nós e guiai-nos no caminho da vida. Alcançai-nos graça, misericórdia e coragem, e defendei-nos de todo o mal. Amém.",sourceUrl:prayerSources.vaticanJoseph,sourceLabel:"Papa Francisco — Patris corde, oração final a São José"},
    {id:"terco-sao-jose",category:"sao-jose",title:"Terço de São José",body:"Existem formas devocionais diferentes para o Terço de São José. Antes de fixar uma fórmula como oficial, confira a versão escolhida. Você pode adicionar ou substituir esta orientação pelo texto de sua comunidade ou por uma imagem enviada para transcrição.",sourceUrl:prayerSources.vaticanJoseph,sourceLabel:"Vaticano — Patris corde (reflexão sobre São José)"},
    {id:"novena-santos",category:"santos",title:"Novenas dos santos",body:"As novenas têm fórmulas e fontes diferentes para cada devoção. Esta ficha oferece acesso a uma coleção católica de orações e novenas; cada texto deve permanecer identificado com sua fonte. Use “Nova oração” para cadastrar uma versão conferida.",sourceUrl:"https://www.a12.com/redacaoa12/oracoes",sourceLabel:"A12 — Orações e novenas católicas"},
    {id:"carlo-acutis",category:"santos",title:"São Carlo Acutis — oração e devoção",body:"Área reservada à oração de intercessão e às devoções a São Carlo Acutis. O texto de uma oração específica deve ser conferido em fonte eclesial ou inserido a partir das artes que você enviar.",sourceUrl:prayerSources.carloOfficialPrayer,sourceLabel:"Associação Carlo Acutis — Oração oficial"},
    {id:"joao-paulo-ii",category:"santos",title:"São João Paulo II — oração e devoção",body:"Consulte a seleção de orações publicadas no portal oficial da Santa Sé, incluindo orações compostas por São João Paulo II.",sourceUrl:prayerSources.vaticanJohnPaulPrayers,sourceLabel:"Vaticano — Orações de São João Paulo II"},
    {id:"teresinha",category:"santos",title:"Santa Teresinha do Menino Jesus",body:"Consulte o documento oficial do Papa Francisco sobre Santa Teresinha e sua confiança no amor misericordioso de Deus. Para uma novena específica, mantenha a redação e a fonte da versão escolhida.",sourceUrl:"https://www.vatican.va/content/francesco/pt/apost_exhortations/documents/20231015-santateresa-delbambinogesu.html",sourceLabel:"Vaticano — C’est la confiance"},
    {id:"guido-schaffer",category:"santos",title:"Venerável Guido Schäffer — novena e oração",body:"Consulte a novena e as orações publicadas pela Associação do Venerável Guido Schäffer. A Igreja o reconheceu como Venerável; esta ficha não o apresenta como santo canonizado.",sourceUrl:prayerSources.guidoNovena,sourceLabel:"Associação do Venerável Guido Schäffer — Reze com o Guido"},
    {id:"francisco-assis",category:"santos",title:"São Francisco de Assis — oração e devoção",body:"Área reservada às orações de São Francisco de Assis, com a fonte indicada para cada texto. A conhecida oração pela paz tem versões diferentes; mantenha a redação escolhida identificada.",sourceUrl:prayerSources.francisPrayer,sourceLabel:"Vaticano — Orações de São João Paulo II, incluindo oração a São Francisco"},
    {id:"sinal-cruz",category:"vida-de-oracao",title:"Sinal da Cruz",body:"Pelo sinal da Santa Cruz, livrai-nos, Deus, nosso Senhor, dos nossos inimigos. Em nome do Pai, do Filho e do Espírito Santo. Amém."},
    {id:"pai-nosso",category:"vida-de-oracao",title:"Pai-Nosso",body:"Pai nosso, que estais nos céus, santificado seja o vosso nome; venha a nós o vosso reino; seja feita a vossa vontade, assim na terra como no céu. O pão nosso de cada dia nos dai hoje; perdoai-nos as nossas ofensas, assim como nós perdoamos a quem nos tem ofendido; e não nos deixeis cair em tentação, mas livrai-nos do mal. Amém.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"ave-maria-basica",category:"vida-de-oracao",title:"Ave-Maria",body:"Ave Maria, cheia de graça, o Senhor é convosco; bendita sois vós entre as mulheres, e bendito é o fruto do vosso ventre, Jesus. Santa Maria, Mãe de Deus, rogai por nós, pecadores, agora e na hora da nossa morte. Amém.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"gloria",category:"vida-de-oracao",title:"Glória ao Pai",body:"Glória ao Pai, ao Filho e ao Espírito Santo. Como era no princípio, agora e sempre. Amém.",sourceUrl:prayerSources.vaticanRosary,sourceLabel:"Vaticano — Os Mistérios do Santo Rosário"},
    {id:"credo",category:"vida-de-oracao",title:"Creio — Credo dos Apóstolos",body:"Creio em Deus Pai todo-poderoso, criador do céu e da terra; e em Jesus Cristo, seu único Filho, nosso Senhor, que foi concebido pelo poder do Espírito Santo; nasceu da Virgem Maria; padeceu sob Pôncio Pilatos, foi crucificado, morto e sepultado; desceu à mansão dos mortos; ressuscitou ao terceiro dia; subiu aos céus; está sentado à direita de Deus Pai todo-poderoso, donde há de vir a julgar os vivos e os mortos. Creio no Espírito Santo, na santa Igreja Católica, na comunhão dos santos, na remissão dos pecados, na ressurreição da carne e na vida eterna. Amém."},
    {id:"vinde-espirito",category:"vida-de-oracao",title:"Vinde, Espírito Santo",body:"Vinde, Espírito Santo, enchei os corações dos vossos fiéis e acendei neles o fogo do vosso amor. Enviai o vosso Espírito e tudo será criado, e renovareis a face da terra. Oremos: Ó Deus, que instruístes os corações dos vossos fiéis com a luz do Espírito Santo, fazei que apreciemos retamente todas as coisas segundo o mesmo Espírito e gozemos sempre da sua consolação. Por Cristo, Senhor nosso. Amém."},
    {id:"santo-anjo",category:"vida-de-oracao",title:"Santo Anjo",body:"Santo Anjo do Senhor, meu zeloso guardador, se a ti me confiou a piedade divina, sempre me rege, guarda, governa e ilumina. Amém."},
    {id:"antes-missa",category:"santa-missa",title:"Oração antes da Missa",body:"Prepare-se em silêncio, ofereça a Deus suas intenções e peça a graça de participar da celebração com fé e atenção. Você pode registrar aqui a oração que costuma usar ou editar este conteúdo conforme a fórmula devocional escolhida.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — informações sobre o Missal Romano"},
    {id:"pos-missa",category:"santa-missa",title:"Oração após a Missa",body:"Reserve um momento de ação de graças após a Comunhão. Este espaço pode receber a fórmula devocional que você utiliza habitualmente; confira a fonte da versão escolhida e edite o texto quando necessário.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — informações sobre o Missal Romano"},
    {id:"anima-christi",category:"santa-missa",title:"Anima Christi — Alma de Cristo",body:"Alma de Cristo, santificai-me. Corpo de Cristo, salvai-me. Sangue de Cristo, inebriai-me. Água do lado de Cristo, lavai-me. Paixão de Cristo, confortai-me. Ó bom Jesus, ouvi-me. Dentro das vossas chagas, escondei-me. Não permitais que eu me separe de vós. Do espírito maligno, defendei-me. Na hora da morte, chamai-me e mandai-me ir para vós, para que com os vossos santos vos louve por todos os séculos dos séculos. Amém."},
    {id:"oracao-eucaristica-i",category:"santa-missa",title:"Oração Eucarística I — Cânon Romano",body:"Texto litúrgico próprio do Missal Romano. Por fidelidade à edição aprovada para o Brasil, consulte o Missal vigente; esta ficha não substitui o livro litúrgico nem apresenta um resumo como se fosse a oração oficial.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — Missal Romano no Brasil"},
    {id:"oracao-eucaristica-ii",category:"santa-missa",title:"Oração Eucarística II",body:"Texto litúrgico próprio do Missal Romano. Consulte a edição aprovada para o Brasil; a oração deve ser usada conforme as normas da celebração litúrgica.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — Missal Romano no Brasil"},
    {id:"oracao-eucaristica-iii",category:"santa-missa",title:"Oração Eucarística III",body:"Texto litúrgico próprio do Missal Romano. Consulte a edição aprovada para o Brasil; a oração deve ser usada conforme as normas da celebração litúrgica.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — Missal Romano no Brasil"},
    {id:"oracao-eucaristica-iv",category:"santa-missa",title:"Oração Eucarística IV",body:"Texto litúrgico próprio do Missal Romano, com prefácio próprio. Consulte a edição aprovada para o Brasil; esta ficha é apenas uma referência de acesso.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — Missal Romano no Brasil"},
    {id:"oracao-eucaristica-v",category:"santa-missa",title:"Oração Eucarística V",body:"Consulte o Missal Romano aprovado e as orientações litúrgicas vigentes no Brasil para confirmar a formulação e o uso apropriados. Não utilizar uma descrição resumida como texto litúrgico.",sourceUrl:prayerSources.cnbbMissal,sourceLabel:"CNBB — Missal Romano no Brasil"},
    {id:"exame-consciencia",category:"confissao",title:"Exame de consciência",body:"Reserve um momento de oração e examine sua vida à luz do Evangelho.\n\n• Tenho reservado tempo para Deus e para a oração?\n• Tenho tratado as pessoas com respeito e caridade?\n• Tenho sido honesto nas palavras e nas atitudes?\n• Tenho guardado ressentimentos ou deixado de perdoar?\n• Tenho cuidado das minhas responsabilidades e dos bens que me foram confiados?\n• Tenho praticado a justiça e ajudado quem precisa?\n• Tenho reconhecido meus erros e buscado reparar o mal que causei?\n\nEste roteiro é uma ajuda para a reflexão pessoal, não substitui a orientação do sacerdote nem um exame de consciência específico."},
    {id:"ato-contricao",category:"confissao",title:"Ato de contrição",body:"Meu Deus, porque sois infinitamente bom e vos amo de todo o meu coração, pesa-me de vos ter ofendido; e, com o auxílio da vossa divina graça, proponho firmemente emendar-me e nunca mais vos tornar a ofender. Peço e espero o perdão das minhas culpas pela vossa infinita misericórdia. Amém."},
    {id:"preparacao-confissao",category:"confissao",title:"Preparação para a Confissão",body:"Peça ao Espírito Santo luz para reconhecer seus pecados com sinceridade. Examine a consciência, arrependa-se, procure confessar com clareza e acolha a penitência e a absolvição. Em caso de dúvida, converse com o sacerdote. Use o bloco privado abaixo apenas para anotações pessoais."},
    {id:"adoracao-breve",category:"adoracao-santissimo",title:"Oração breve de adoração",body:"Senhor Jesus, eu creio que estais presente no Santíssimo Sacramento. Eu vos adoro, agradeço por vosso amor e vos peço que aumenteis em mim a fé, a esperança e a caridade. Ensinai-me a permanecer em vossa presença com reverência e coração aberto. Amém."},
    {id:"adoracao-cancao-nova",category:"adoracao-santissimo",title:"Orações diante de Jesus Eucarístico — Canção Nova",body:"A página reúne orações de adoração eucarística, incluindo uma oração a Jesus Sacramentado. Abra a fonte original para ler o conteúdo completo; o texto do artigo não é reproduzido integralmente aqui.",sourceUrl:prayerSources.cantNovena,sourceLabel:"Canção Nova — Formação"},
    {id:"coracao-eucaristico",category:"adoracao-santissimo",title:"Oração ao Coração de Jesus na Eucaristia",body:"Consulte a oração na fonte indicada e mantenha a versão completa conforme publicada. Este registro permite guardar uma versão pessoal, com a fonte identificada.",sourceUrl:prayerSources.cantNovena,sourceLabel:"Canção Nova — Formação"}
  ];
  if (!data.prayers.length) data.prayers = seedPrayers.map(x=>({...x,favorite:false,createdAt:Date.now(),updatedAt:Date.now()}));
  // Preserve new keys when opening data created by earlier app versions.
  if (!data.profile) data.profile = {};

  const categoryFor = id => PRAYER_CATEGORIES.find(x=>x.id===id) || {id,title:"Orações personalizadas",description:"Orações cadastradas por você."};
  function renderPrayerCategories() {
    const q=($("prayer-search")?.value||"").trim().toLocaleLowerCase("pt-BR");
    const allPrayers=data.prayers||[];
    const cats=PRAYER_CATEGORIES.filter(c=>{
      const catItems=allPrayers.filter(p=>p.category===c.id);
      const contains=catItems.some(p=>(`${p.title} ${p.body||""}`).toLocaleLowerCase("pt-BR").includes(q));
      return (!q || contains) && (prayerFilter!=="favorites" || catItems.some(p=>p.favorite));
    });
    $("prayer-category-grid").innerHTML=cats.map(c=>`<button class="prayer-cover-card" data-prayer-category="${c.id}" aria-label="Abrir categoria ${escapeHTML(c.title)}"><img src="${c.cover}" alt="Capa ${escapeHTML(c.title)}"><span class="sr-only">${escapeHTML(c.title)}</span><span class="prayer-cover-meta">${allPrayers.filter(p=>p.category===c.id).length} conteúdos</span></button>`).join("") || '<div class="empty-inline">Nenhuma categoria corresponde à pesquisa.</div>';
    if (q) {
      const matches=allPrayers.filter(p=>(`${p.title} ${p.body||""}`).toLocaleLowerCase("pt-BR").includes(q));
      if(matches.length) $("prayer-category-grid").insertAdjacentHTML("beforeend",`<div class="prayer-search-results panel"><h3>Resultados encontrados</h3>${matches.slice(0,20).map(p=>`<button class="search-result-row" data-prayer-open="${p.id}"><span>${escapeHTML(p.title)}</span><small>${escapeHTML(categoryFor(p.category).title)}</small></button>`).join("")}</div>`);
    }
  }
  function renderPrayerDetail() {
    const cat=categoryFor(activePrayerCategory); $("prayer-detail-title").textContent=cat.title; $("prayer-detail-desc").textContent=cat.description||"Orações organizadas para sua vida espiritual.";
    const q=($("prayer-detail-search").value||"").trim().toLocaleLowerCase("pt-BR");
    const items=(data.prayers||[]).filter(p=>p.category===activePrayerCategory && (!q||`${p.title} ${p.body||""}`.toLocaleLowerCase("pt-BR").includes(q))).sort((a,b)=>(a.order||0)-(b.order||0)||(a.title||"").localeCompare(b.title||"","pt-BR"));
    const cards=items.map(p=>`<article class="prayer-card" id="prayer-card-${p.id}"><div class="prayer-card-top"><div><h3>${escapeHTML(p.title)}</h3>${p.favorite?'<span class="tag">Favorita</span>':''}</div><div class="item-actions"><button class="mini-button" data-prayer-favorite="${p.id}" aria-label="${p.favorite?'Remover dos favoritos':'Adicionar aos favoritos'}">${p.favorite?'♥':'♡'}</button><button class="mini-button" data-prayer-edit="${p.id}">Editar</button><button class="mini-button" data-prayer-delete="${p.id}">Excluir</button></div></div>${p.body?`<div class="prayer-body">${escapeHTML(p.body).replace(/\n/g,"<br>")}</div>`:'<p class="muted-text">O texto completo ainda precisa ser inserido ou conferido. Você pode editar esta ficha ou abrir a fonte abaixo.</p>'}${p.sourceUrl?`<p class="prayer-source">Fonte: <a href="${escapeHTML(p.sourceUrl)}" target="_blank" rel="noopener noreferrer">${escapeHTML(p.sourceLabel||"Consultar fonte original")} ↗</a></p>`:''}</article>`).join("");
    const confessionExtra=activePrayerCategory==="confissao"?`<article class="prayer-card vault-card"><div class="prayer-card-top"><div><h3>Bloco de notas privado</h3><p class="muted-text">Anotações protegidas por senha e criptografadas neste dispositivo.</p></div></div><button class="primary-button" id="open-confession-vault">Abrir bloco protegido</button></article>`:"";
    $("prayer-list").innerHTML=(cards||'<div class="empty-inline">Nenhuma oração cadastrada nesta categoria.</div>')+confessionExtra;
  }
  function openPrayerCategory(category) { activePrayerCategory=category; $("prayer-detail-search").value=""; openView("prayer-detail"); renderPrayerDetail(); }
  $("prayer-search").addEventListener("input",renderPrayerCategories);
  $("prayer-detail-search").addEventListener("input",renderPrayerDetail);
  document.querySelectorAll("[data-prayer-filter]").forEach(btn=>btn.addEventListener("click",()=>{prayerFilter=btn.dataset.prayerFilter;document.querySelectorAll("[data-prayer-filter]").forEach(b=>b.classList.toggle("active",b===btn));renderPrayerCategories();}));
  $("back-to-prayers").addEventListener("click",()=>openView("oracoes"));
  function openPrayerDialog(id=null, category=activePrayerCategory) {
    editingPrayer=id; const p=id?data.prayers.find(x=>x.id===id):null;
    $("prayer-form").reset(); $("prayer-form-title").textContent=p?"Editar oração":"Nova oração";
    $("prayer-title").value=p?.title||""; $("prayer-category").value=p?.category||category; $("prayer-body").value=p?.body||""; $("prayer-source").value=p?.sourceUrl||""; $("prayer-favorite").checked=!!p?.favorite;
    $("prayer-dialog").showModal(); $("prayer-title").focus();
  }
  $("add-prayer-category").addEventListener("click",()=>openPrayerDialog(null,activePrayerCategory));
  $("add-prayer-global").addEventListener("click",()=>openPrayerDialog(null,"vida-de-oracao"));
  $("prayer-form").addEventListener("submit",e=>{e.preventDefault();const old=data.prayers.find(x=>x.id===editingPrayer);const p={id:editingPrayer||makeId(),title:$("prayer-title").value.trim(),category:$("prayer-category").value,body:$("prayer-body").value.trim(),sourceUrl:$("prayer-source").value.trim(),sourceLabel:old?.sourceLabel||( $("prayer-source").value.trim()?"Fonte indicada":""),favorite:$("prayer-favorite").checked,createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(editingPrayer)data.prayers=data.prayers.map(x=>x.id===editingPrayer?p:x);else data.prayers.unshift(p);editingPrayer=null;$("prayer-dialog").close();save();renderPrayerDetail();toast("Oração salva.");});

  // Perfil editável
  function renderProfile() {
    const p=data.profile||{}; $("profile-first-name").value=p.firstName||""; $("profile-last-name").value=p.lastName||""; $("profile-nickname").value=p.nickname||""; $("profile-birthdate").value=p.birthdate||""; $("profile-phrase").value=p.phrase||""; $("profile-verse").value=p.verse||""; $("profile-preferences").value=p.preferences||"";
    $("profile-photo-preview").src=p.photo||"assets/perfil.png"; profilePhotoData=p.photo||null;
  }
  $("profile-photo").addEventListener("change",async()=>{const files=[...$("profile-photo").files];if(!files.length)return;const img=await compressImage(files[0]);if(img){profilePhotoData=img.data;$("profile-photo-preview").src=img.data;}});
  $("profile-form").addEventListener("submit",e=>{e.preventDefault();data.profile={firstName:$("profile-first-name").value.trim(),lastName:$("profile-last-name").value.trim(),nickname:$("profile-nickname").value.trim(),birthdate:$("profile-birthdate").value,phrase:$("profile-phrase").value.trim(),verse:$("profile-verse").value.trim(),preferences:$("profile-preferences").value.trim(),photo:profilePhotoData};const name=data.profile.nickname||data.profile.firstName; if(name) $("page-title").textContent=`Bom ter você aqui, ${name}.`;save();toast("Perfil atualizado.");});

  // Galeria verdadeiramente independente, com metadados e fotos incluídas no backup.
  $("gallery-upload").addEventListener("change",async()=>{
    if(galleryUploadBusy)return;
    galleryUploadBusy=true;
    const allFiles=[...$("gallery-upload").files];
    const files=allFiles.slice(0,8);
    const album=$("gallery-album").value.trim()||"Geral";
    try {
      const ready=await Promise.all(files.map(compressImage));
      const good=ready.filter(Boolean);
      good.forEach(img=>data.gallery.unshift({id:makeId(),data:img.data,name:img.name,caption:img.name.replace(/\.[^.]+$/, ""),album,date:today(),createdAt:Date.now()}));
      if(good.length){const saved=save();renderGallery();toast(saved?`${good.length} foto(s) adicionada(s) à galeria.`:"Não foi possível guardar as fotos. Exporte um backup, reduza os anexos ou tente menos fotos de cada vez.");}
      if(allFiles.length>8)toast("Foram processadas as primeiras 8 fotos. Você pode adicionar o restante em outro lote.");
    } catch(err) {
      console.error("Falha ao carregar fotos da galeria.",err);
      toast("Não foi possível carregar essas imagens. Tente selecionar menos fotos ou outros arquivos.");
    } finally {
      $("gallery-upload").value="";
      galleryUploadBusy=false;
    }
  });
  function renderGallery() {
    const search=($("gallery-search").value||"").trim().toLocaleLowerCase("pt-BR"), filter=$("gallery-album-filter").value||"all";
    const albums=[...new Set((data.gallery||[]).map(x=>x.album||"Geral"))].sort((a,b)=>a.localeCompare(b,"pt-BR")); const old=filter;
    $("gallery-album-filter").innerHTML='<option value="all">Todos os álbuns</option>'+albums.map(a=>`<option value="${escapeHTML(a)}">${escapeHTML(a)}</option>`).join("");
    $("gallery-album-filter").value=albums.includes(old)?old:"all";
    const photos=(data.gallery||[]).filter(x=>(filter==="all"||(x.album||"Geral")===filter)&&(!search||`${x.caption||""} ${x.album||""} ${x.name||""}`.toLocaleLowerCase("pt-BR").includes(search))).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    $("gallery-grid").innerHTML=photos.length?photos.map(x=>`<article class="gallery-card"><button class="gallery-image-button" data-gallery-open="${x.id}" aria-label="Ampliar ${escapeHTML(x.caption||x.name||'foto')}">${x.data?`<img src="${x.data}" loading="lazy" alt="${escapeHTML(x.caption||x.name||"Foto da galeria")}">`:'<span class="gallery-image-missing">Imagem não incluída neste backup</span>'}</button><div class="gallery-card-info"><strong>${escapeHTML(x.caption||x.name||"Foto")}</strong><small>${escapeHTML(x.album||"Geral")} · ${dateLabel(x.date)}</small><div class="item-actions"><button class="mini-button" data-gallery-edit="${x.id}">Editar</button><button class="mini-button" data-gallery-delete="${x.id}">Excluir</button></div></div></article>`).join(""):'<div class="empty-inline">Sua galeria está vazia. Adicione suas primeiras fotos acima.</div>';
  }
  $("gallery-search").addEventListener("input",renderGallery); $("gallery-album-filter").addEventListener("change",renderGallery);
  $("gallery-edit-form").addEventListener("submit",e=>{e.preventDefault();const id=$("gallery-edit-id").value;data.gallery=data.gallery.map(x=>x.id===id?{...x,caption:$("gallery-edit-caption").value.trim(),album:$("gallery-edit-album").value.trim()||"Geral",updatedAt:Date.now()}:x);$("gallery-edit-dialog").close();save();toast("Foto atualizada.");});

  // Intenções e gratidão: registros independentes e editáveis.
  function openNoteDialog(kind,id=null){editingNote=id;const arr=kind==="gratitude"?data.gratitude:data.intentions;const old=id?arr.find(x=>x.id===id):null;$("note-form").reset();$("note-kind").value=kind;$("note-form-title").textContent=old?"Editar registro":(kind==="gratitude"?"Registrar gratidão":"Nova intenção");$("note-form-eyebrow").textContent=kind==="gratitude"?"GRATIDÃO":"INTENÇÃO DE ORAÇÃO";$("note-title").value=old?.title||"";$("note-date").value=old?.date||today();$("note-body").value=old?.body||"";$("note-dialog").showModal();}
  $("add-intention").addEventListener("click",()=>openNoteDialog("intention")); $("add-gratitude").addEventListener("click",()=>openNoteDialog("gratitude"));
  $("note-form").addEventListener("submit",e=>{e.preventDefault();const kind=$("note-kind").value,arr=kind==="gratitude"?data.gratitude:data.intentions;const old=arr.find(x=>x.id===editingNote);const rec={id:editingNote||makeId(),title:$("note-title").value.trim(),date:$("note-date").value||today(),body:$("note-body").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};data[kind==="gratitude"?"gratitude":"intentions"]=editingNote?arr.map(x=>x.id===editingNote?rec:x):[rec,...arr];editingNote=null;$("note-dialog").close();save();toast("Registro salvo.");});
  function renderNotes(kind){const arr=kind==="gratitude"?data.gratitude:data.intentions;const target=$(kind==="gratitude"?"gratitude-list":"intentions-list");target.innerHTML=arr.length?[...arr].sort((a,b)=>(b.date||"").localeCompare(a.date||"")).map(x=>`<article class="note-card"><div class="note-card-heading"><h3>${escapeHTML(x.title)}</h3><span class="tag">${dateLabel(x.date)}</span></div><p>${escapeHTML(x.body).replace(/\n/g,"<br>")}</p><div class="item-actions"><button class="mini-button" data-note-edit="${x.id}" data-note-kind="${kind}">Editar</button><button class="mini-button" data-note-delete="${x.id}" data-note-kind="${kind}">Excluir</button></div></article>`).join(""):'<div class="empty-inline">Nenhum registro ainda. Você pode começar quando quiser.</div>';}

  // Central de melhorias com cópia e exportação de arquivo .txt.
  function openImprovementDialog(id=null){editingGoal=null;const old=id?data.improvements.find(x=>x.id===id):null;editingNote=id;$("improvement-form").reset();$("improvement-form-title").textContent=old?"Editar melhoria":"Nova melhoria";$("improvement-title").value=old?.title||"";$("improvement-area").value=old?.area||"Outro";$("improvement-status").value=old?.status||"Pendente";$("improvement-description").value=old?.description||"";$("improvement-dialog").showModal();}
  $("add-improvement").addEventListener("click",()=>openImprovementDialog());
  $("improvement-form").addEventListener("submit",e=>{e.preventDefault();const old=data.improvements.find(x=>x.id===editingNote);const rec={id:editingNote||makeId(),title:$("improvement-title").value.trim(),area:$("improvement-area").value,status:$("improvement-status").value,description:$("improvement-description").value.trim(),date:old?.date||today(),updatedAt:Date.now(),createdAt:old?.createdAt||Date.now()};if(editingNote)data.improvements=data.improvements.map(x=>x.id===editingNote?rec:x);else data.improvements.unshift(rec);editingNote=null;$("improvement-dialog").close();save();toast("Melhoria salva.");});
  $("improvement-search").addEventListener("input",renderImprovements); $("improvement-status-filter").addEventListener("change",renderImprovements); $("improvement-area-filter").addEventListener("change",renderImprovements);
  function renderImprovements(){const q=$("improvement-search").value.trim().toLocaleLowerCase("pt-BR"),st=$("improvement-status-filter").value,ar=$("improvement-area-filter").value;const list=data.improvements.filter(x=>(!q||`${x.title} ${x.description} ${x.area}`.toLocaleLowerCase("pt-BR").includes(q))&&(st==="all"||x.status===st)&&(ar==="all"||x.area===ar));$("improvements-list").innerHTML=list.length?list.map(x=>`<article class="improvement-card"><div class="improvement-card-heading"><h3>${escapeHTML(x.title)}</h3><span class="status-pill status-${x.status==="Concluída"?"done":x.status==="Em desenvolvimento"?"progress":"pending"}">${escapeHTML(x.status)}</span></div><div class="item-meta">${escapeHTML(x.area)} · criado em ${dateLabel(x.date)}</div><p>${escapeHTML(x.description).replace(/\n/g,"<br>")}</p><label for="imp-status-${x.id}">Atualizar status</label><select id="imp-status-${x.id}" data-improvement-status="${x.id}"><option ${x.status==="Pendente"?"selected":""}>Pendente</option><option ${x.status==="Em desenvolvimento"?"selected":""}>Em desenvolvimento</option><option ${x.status==="Concluída"?"selected":""}>Concluída</option></select><div class="item-actions"><button class="mini-button" data-improvement-edit="${x.id}">Editar</button><button class="mini-button" data-improvement-copy="${x.id}">Copiar esta</button><button class="mini-button" data-improvement-delete="${x.id}">Excluir</button></div></article>`).join(""):'<div class="empty-inline">Nenhuma melhoria encontrada. Cadastre uma ideia para começar.</div>';}
  function improvementsText(list=data.improvements){return list.map((x,i)=>`${i+1}. ${x.title}\nÁrea: ${x.area}\nStatus: ${x.status}\nData: ${x.date||"—"}\nDescrição: ${x.description}\n`).join("\n------------------------------\n\n");}
  async function copyText(text){try{if(navigator.clipboard&&window.isSecureContext){await navigator.clipboard.writeText(text);toast("Texto copiado.");return;}const box=document.createElement("textarea");box.value=text;box.style.position="fixed";box.style.opacity="0";document.body.appendChild(box);box.select();const ok=document.execCommand("copy");box.remove();if(ok)toast("Texto copiado.");else throw new Error("Clipboard unavailable");}catch(e){downloadText(text,"magnificat-texto.txt");toast("Não foi possível copiar; baixei um arquivo de texto como alternativa.");}}
  function downloadText(text,name){const blob=new Blob([text],{type:"text/plain;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  $("copy-improvements").addEventListener("click",()=>{if(!data.improvements.length){toast("Você ainda não cadastrou melhorias.");return;}copyText("CENTRAL DE MELHORIAS — MAGNIFICAT\n\n"+improvementsText());});
  $("export-improvements").addEventListener("click",()=>downloadText("CENTRAL DE MELHORIAS — MAGNIFICAT\n\n"+improvementsText(),"magnificat-melhorias.txt"));

  // Equipes das pastorais: lista pessoal de membros, sem contas ou sincronização.
  function openMemberDialog(area,id=null){editingMember=id;const old=id?data.members.find(x=>x.id===id):null;$("member-form").reset();$("member-area").value=area;$("member-form-title").textContent=old?"Editar membro":"Novo membro";$("member-name").value=old?.name||"";$("member-role").value=old?.role||"";$("member-contact").value=old?.contact||"";$("member-notes").value=old?.notes||"";$("member-dialog").showModal();}
  document.querySelectorAll("[data-add-member]").forEach(btn=>btn.addEventListener("click",()=>openMemberDialog(btn.dataset.addMember)));
  $("member-form").addEventListener("submit",e=>{e.preventDefault();const old=data.members.find(x=>x.id===editingMember);const rec={id:editingMember||makeId(),area:$("member-area").value,name:$("member-name").value.trim(),role:$("member-role").value.trim(),contact:$("member-contact").value.trim(),notes:$("member-notes").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(editingMember)data.members=data.members.map(x=>x.id===editingMember?rec:x);else data.members.unshift(rec);editingMember=null;$("member-dialog").close();save();toast("Membro salvo.");});
  function renderMembers(){const areas=["pascom","juventude","nucleo","acolito"];for(const area of areas){const container=$("members-"+area);if(!container)continue;const members=data.members.filter(x=>x.area===area);container.innerHTML=members.length?members.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(x.name)}</div><div class="item-meta">${escapeHTML(x.role||"Membro")}${x.contact?` · ${escapeHTML(x.contact)}`:""}</div>${x.notes?`<div class="item-note">${escapeHTML(x.notes)}</div>`:""}</div><div class="item-actions"><button class="mini-button" data-member-edit="${x.id}">Editar</button><button class="mini-button" data-member-delete="${x.id}">Excluir</button></div></div>`).join(""):'<div class="empty-inline">Nenhum membro cadastrado nesta área.</div>';}}

  // Metas financeiras
  $("add-finance-goal").addEventListener("click",()=>{editingGoal=null;$("goal-form").reset();$("goal-current").value="0";$("goal-form-title").textContent="Nova meta";$("goal-dialog").showModal();});
  $("goal-form").addEventListener("submit",e=>{e.preventDefault();const old=data.goals.find(x=>x.id===editingGoal);const rec={id:editingGoal||makeId(),title:$("goal-title").value.trim(),target:Number($("goal-target").value),current:Number($("goal-current").value),deadline:$("goal-deadline").value,createdAt:old?.createdAt||Date.now()};if(editingGoal)data.goals=data.goals.map(x=>x.id===editingGoal?rec:x);else data.goals.unshift(rec);editingGoal=null;$("goal-dialog").close();save();toast("Meta salva.");});
  $("goal-progress-form").addEventListener("submit",e=>{e.preventDefault();const id=$("goal-progress-id").value;data.goals=data.goals.map(g=>g.id===id?{...g,current:Number($("goal-progress-amount").value)}:g);$("goal-progress-dialog").close();save();});
  function renderGoals(){const root=$("finance-goals-list");root.innerHTML=data.goals.length?data.goals.map(g=>{const pct=g.target>0?Math.min(100,Math.max(0,g.current/g.target*100)):0;return `<article class="goal-card"><div class="goal-heading"><h3>${escapeHTML(g.title)}</h3><strong>${money(g.current)} / ${money(g.target)}</strong></div><div class="goal-progress"><span style="width:${pct}%"></span></div><small>${pct.toFixed(0)}% alcançado${g.deadline?` · prazo ${dateLabel(g.deadline)}`:""}</small><div class="item-actions"><button class="mini-button" data-goal-progress="${g.id}">Atualizar progresso</button><button class="mini-button" data-goal-edit="${g.id}">Editar</button><button class="mini-button" data-goal-delete="${g.id}">Excluir</button></div></article>`}).join(""):'<div class="empty-inline">Cadastre uma meta financeira para acompanhar seu progresso.</div>';}

  // Anotações de leitura bíblica: a Bíblia em si é acessada na fonte externa.
  $("add-bible-note").addEventListener("click",()=>openBibleNote());
  function openBibleNote(id=null){editingBibleNote=id;const old=id?data.bibleNotes.find(x=>x.id===id):null;$("bible-note-form").reset();$("bible-note-id").value=id||"";$("bible-note-form-title").textContent=old?"Editar anotação":"Nova anotação bíblica";$("bible-note-reference").value=old?.reference||"";$("bible-note-text").value=old?.text||"";$("bible-note-dialog").showModal();}
  $("bible-note-form").addEventListener("submit",e=>{e.preventDefault();const old=data.bibleNotes.find(x=>x.id===editingBibleNote);const rec={id:editingBibleNote||makeId(),reference:$("bible-note-reference").value.trim(),text:$("bible-note-text").value.trim(),createdAt:old?.createdAt||Date.now(),updatedAt:Date.now()};if(editingBibleNote)data.bibleNotes=data.bibleNotes.map(x=>x.id===editingBibleNote?rec:x);else data.bibleNotes.unshift(rec);editingBibleNote=null;$("bible-note-dialog").close();save();toast("Anotação bíblica salva.");});
  function renderBibleNotes(){const root=$("bible-notes-list");root.innerHTML=data.bibleNotes.length?data.bibleNotes.map(x=>`<article class="note-card"><div class="note-card-heading"><h3>${escapeHTML(x.reference)}</h3></div><p>${escapeHTML(x.text).replace(/\n/g,"<br>")}</p><div class="item-actions"><button class="mini-button" data-bible-note-edit="${x.id}">Editar</button><button class="mini-button" data-bible-note-delete="${x.id}">Excluir</button></div></article>`).join(""):'<div class="empty-inline">Você ainda não salvou anotações bíblicas.</div>';}

  // Backup completo em JSON (inclui data URLs das fotos); restauração validada e com confirmação.
  function exportBackup(includeImages=true){
    const snapshot=JSON.parse(JSON.stringify(data));
    if(!includeImages){
      snapshot.profile={...(snapshot.profile||{}),photo:null};
      snapshot.gallery=(snapshot.gallery||[]).map(x=>({...x,data:null,photoOmitted:true}));
      for(const key of ["diary","tasks","transactions","pastoral","roles"])snapshot[key]=(snapshot[key]||[]).map(x=>({...x,images:[]}));
    }
    return {format:"magnificat-backup",version:2,exportedAt:new Date().toISOString(),includesImages:includeImages,data:snapshot};
  }
  function downloadBackup(includeImages=true){const payload=exportBackup(includeImages);const blob=new Blob([JSON.stringify(payload,null,2)],{type:"application/json;charset=utf-8"});const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download=`magnificat-backup-${today()}${includeImages?"":"-sem-fotos"}.json`;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500);toast(includeImages?"Backup completo gerado.":"Backup sem anexos gerado.");}
  $("export-backup").addEventListener("click",()=>downloadBackup(true)); $("download-data-only").addEventListener("click",()=>downloadBackup(false));
  $("restore-backup").addEventListener("click",async()=>{const file=$("import-backup").files?.[0];if(!file){toast("Selecione primeiro um arquivo .json.");return;}try{const parsed=JSON.parse(await file.text());const incoming=parsed?.data||parsed;const containsPrayerLibrary=Array.isArray(incoming?.prayers);if(!incoming||typeof incoming!=="object"||!Array.isArray(incoming.tasks)||!Array.isArray(incoming.diary)||!Array.isArray(incoming.transactions))throw new Error("Formato inválido");if(!confirm("Restaurar este backup substituirá os dados atuais deste navegador. Faça um backup do estado atual se quiser preservá-lo. Deseja continuar?"))return;data={tasks:[],diary:[],transactions:[],pastoral:[],roles:[],gallery:[],prayers:[],members:[],improvements:[],intentions:[],gratitude:[],goals:[],bibleNotes:[],profile:{},confessionVault:null,...incoming};for(const key of ["tasks","diary","transactions","pastoral","roles","gallery","prayers","members","improvements","intentions","gratitude","goals","bibleNotes"])if(!Array.isArray(data[key]))data[key]=[];if(!containsPrayerLibrary)data.prayers=seedPrayers.map(x=>({...x,favorite:false,createdAt:Date.now(),updatedAt:Date.now()}));if(!save())throw new Error("Não foi possível salvar o backup no armazenamento local");$("import-backup").value="";toast("Backup restaurado. Confira os dados e as fotos.");}catch(err){console.error(err);toast("Não foi possível restaurar: arquivo inválido ou espaço insuficiente.");}});
  $("enable-notifications").addEventListener("click",async()=>{if(!("Notification" in window)){ $("notification-status").textContent="Este navegador não oferece notificações.";return;}try{const result=await Notification.requestPermission();$("notification-status").textContent=result==="granted"?"Notificações autorizadas. Enquanto o app estiver aberto, você poderá receber lembretes de tarefas com data para hoje.":"As notificações não foram autorizadas.";if(result==="granted")checkDueNotifications();}catch(e){$("notification-status").textContent="Não foi possível solicitar permissão neste navegador.";}});
  function checkDueNotifications(){if(!("Notification" in window)||Notification.permission!=="granted")return;const key=`magnificat-notified-${today()}`;if(sessionStorage.getItem(key))return;const due=data.tasks.filter(t=>!t.done&&t.date===today());if(due.length){new Notification("Magnificat — lembretes de hoje",{body:due.slice(0,3).map(x=>x.title).join(" · ")+(due.length>3?` e mais ${due.length-3}`:"")});sessionStorage.setItem(key,"1");}}
  document.addEventListener("visibilitychange",()=>{if(!document.hidden)checkDueNotifications();});

  // Bloco privado de confissão: AES-GCM com chave derivada de senha (nunca salva o texto em claro).
  const bytesToBase64=bytes=>{const arr=new Uint8Array(bytes);let binary="";for(let i=0;i<arr.length;i+=0x8000)binary+=String.fromCharCode(...arr.subarray(i,i+0x8000));return btoa(binary);};
  const base64ToBytes=str=>Uint8Array.from(atob(str),c=>c.charCodeAt(0));
  async function deriveVaultKey(password,salt){const material=await crypto.subtle.importKey("raw",new TextEncoder().encode(password),"PBKDF2",false,["deriveKey"]);return crypto.subtle.deriveKey({name:"PBKDF2",salt,iterations:310000,hash:"SHA-256"},material,{name:"AES-GCM",length:256},false,["encrypt","decrypt"]);}
  async function encryptVault(text,password,saltInput=null){if(!crypto?.subtle)throw new Error("Criptografia indisponível. Abra o aplicativo em HTTPS (GitHub Pages) ou em localhost.");const salt=saltInput||crypto.getRandomValues(new Uint8Array(16));const iv=crypto.getRandomValues(new Uint8Array(12));const key=await deriveVaultKey(password,salt);const cipher=await crypto.subtle.encrypt({name:"AES-GCM",iv},key,new TextEncoder().encode(text));return {version:1,salt:bytesToBase64(salt),iv:bytesToBase64(iv),ciphertext:bytesToBase64(cipher),updatedAt:Date.now()};}
  async function decryptVault(payload,password){const salt=base64ToBytes(payload.salt),iv=base64ToBytes(payload.iv),cipher=base64ToBytes(payload.ciphertext);const key=await deriveVaultKey(password,salt);const raw=await crypto.subtle.decrypt({name:"AES-GCM",iv},key,cipher);return {key,text:new TextDecoder().decode(raw)};}
  function openConfessionVault(){activeVaultKey=null;activeVaultNote="";$("vault-unlock-form").classList.remove("hidden");$("vault-note-form").classList.add("hidden");$("vault-password").value="";$("vault-confirm-password").value="";const exists=!!data.confessionVault;$("vault-confirm-wrap").classList.toggle("hidden",exists);$("vault-confirm-password").required=!exists;$("vault-instructions").textContent=exists?"Digite a senha que você definiu para descriptografar suas anotações.":"Primeiro acesso: crie uma senha de pelo menos 8 caracteres. Se esquecê-la, o conteúdo criptografado não poderá ser recuperado.";$("vault-unlock-button").textContent=exists?"Desbloquear":"Criar senha";$("vault-dialog").showModal();}
  $("vault-unlock-form").addEventListener("submit",async e=>{e.preventDefault();const password=$("vault-password").value;try{if(data.confessionVault){const unlocked=await decryptVault(data.confessionVault,password);activeVaultKey=unlocked.key;activeVaultNote=unlocked.text;}else{if(password!==$("vault-confirm-password").value){toast("As senhas não coincidem.");return;}if(password.length<8){toast("Use uma senha com pelo menos 8 caracteres.");return;}activeVaultNote="";data.confessionVault=await encryptVault("",password);save();}$("vault-note").value=activeVaultNote;$("vault-unlock-form").classList.add("hidden");$("vault-note-form").classList.remove("hidden");}catch(err){console.warn(err);toast(data.confessionVault?"Senha incorreta ou backup criptografado inválido.":"Não foi possível criar a área protegida neste navegador.");}});
  $("vault-note-form").addEventListener("submit",async e=>{e.preventDefault();try{const password=$("vault-password").value;const salt=data.confessionVault?base64ToBytes(data.confessionVault.salt):crypto.getRandomValues(new Uint8Array(16));data.confessionVault=await encryptVault($("vault-note").value,password,salt);activeVaultNote=$("vault-note").value;save();toast("Anotações criptografadas e salvas.");}catch(err){console.error(err);toast("Não foi possível criptografar e salvar as anotações.");}});
  function lockConfessionVault(){activeVaultKey=null;activeVaultNote="";$("vault-note").value="";$("vault-password").value="";$("vault-confirm-password").value="";$("vault-dialog").close();$("vault-unlock-form").classList.remove("hidden");$("vault-note-form").classList.add("hidden");}
  $("vault-lock-button").addEventListener("click",lockConfessionVault);
  $("vault-dialog").addEventListener("close",()=>{activeVaultKey=null;activeVaultNote="";$("vault-note").value="";$("vault-password").value="";});

  // Calendar mode and recurrence projection; recurring tasks only project occurrences for the visible month.
  $("calendar-mode").addEventListener("change",renderCalendar);
  function occurrencesForTask(t,year,month){const base=t.date;if(!base)return[];if(!t.recurrence||t.recurrence==="none")return [base];const [y,m,d]=base.split("-").map(Number);const start=new Date(y,m-1,d,12),end=new Date(year,month+1,0,12);const out=[];let cur=new Date(start);let guard=0;while(cur<=end&&guard<500){if(cur.getFullYear()===year&&cur.getMonth()===month)out.push(`${cur.getFullYear()}-${String(cur.getMonth()+1).padStart(2,"0")}-${String(cur.getDate()).padStart(2,"0")}`);if(t.recurrence==="weekly")cur.setDate(cur.getDate()+7);else if(t.recurrence==="monthly"){const wanted=d;cur.setDate(1);cur.setMonth(cur.getMonth()+1);const max=new Date(cur.getFullYear(),cur.getMonth()+1,0).getDate();cur.setDate(Math.min(wanted,max));}else if(t.recurrence==="yearly"){cur.setFullYear(cur.getFullYear()+1);}else break;guard++;}return out;}
  const originalCalendarEvents=calendarEvents;
  calendarEvents = () => {
    const events=[];const year=calendarCursor.getFullYear(),month=calendarCursor.getMonth();
    (data.tasks||[]).forEach(x=>occurrencesForTask(x,year,month).forEach(date=>events.push({date,title:x.title,time:x.time,area:"Tarefa",icon:"✓",notes:x.notes,images:x.images,done:x.done,id:x.id,recurrence:x.recurrence})));
    (data.pastoral||[]).forEach(x=>events.push({date:x.date,title:x.title,time:x.time,area:({pascom:"PASCOM",juventude:"Juventude",nucleo:"Núcleo JSF",acolito:"Acólito"})[x.area]||"Pastoral",icon:({pascom:"📣",juventude:"🎉",nucleo:"◎",acolito:"✝️"})[x.area]||"✦",notes:x.notes,images:x.images,location:x.location}));
    (data.roles||[]).forEach(x=>events.push({date:x.date,title:x.title,time:x.time,area:"Rolê",icon:"🎉",notes:[x.location,x.people,x.notes].filter(Boolean).join(" · "),images:x.images}));
    (data.transactions||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:x.type==="income"?"Receita":"Despesa",icon:x.type==="income"?"＋":"−",notes:money(x.amount),images:x.images}));
    (data.diary||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:"Diário",icon:"✎",notes:x.mood,images:x.images}));
    (data.intentions||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:"Intenção",icon:"🙏",notes:x.body}));
    (data.gratitude||[]).forEach(x=>events.push({date:x.date,title:x.title,time:"",area:"Gratidão",icon:"♡",notes:x.body}));
    return events.filter(x=>x.date);
  };
  const baseRenderCalendar = renderCalendar;
  renderCalendar = function(){
    const mode=$("calendar-mode").value||"month";
    const grid=$("calendar-grid"),weekdays=document.querySelector(".calendar-weekdays");
    grid.classList.toggle("hidden",mode!=="month");weekdays.classList.toggle("hidden",mode!=="month");
    baseRenderCalendar();
    if(mode==="list"){$("calendar-selected-title").textContent=calendarCursor.toLocaleDateString("pt-BR",{month:"long",year:"numeric"});const items=calendarEvents().filter(x=>x.date.startsWith(`${calendarCursor.getFullYear()}-${String(calendarCursor.getMonth()+1).padStart(2,"0")}`)).sort((a,b)=>a.date.localeCompare(b.date)||(a.time||"").localeCompare(b.time||""));$("calendar-day-list").innerHTML=items.length?items.map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${x.icon} ${escapeHTML(x.title)}</div><div class="item-meta">${dateLabel(x.date)}${x.time?` · ${escapeHTML(x.time)}`:""} · ${escapeHTML(x.area)}</div>${x.notes?`<div class="item-note">${escapeHTML(x.notes)}</div>`:""}</div></div>`).join(""):'<div class="empty-inline">Nenhum compromisso neste mês.</div>';}
    if(mode==="day"){$("calendar-selected-title").textContent=dateLabel(calendarSelected);}
  };

  // Delegated actions for edit/delete, since item cards are rebuilt on every save.
  document.addEventListener("click",e=>{
    const cat=e.target.closest("[data-prayer-category]");if(cat){openPrayerCategory(cat.dataset.prayerCategory);return;}
    const pOpen=e.target.closest("[data-prayer-open]");if(pOpen){const p=data.prayers.find(x=>x.id===pOpen.dataset.prayerOpen);if(p){openPrayerCategory(p.category);setTimeout(()=>$("prayer-card-"+p.id)?.scrollIntoView({behavior:"smooth",block:"start"}),50);}return;}
    const pEdit=e.target.closest("[data-prayer-edit]");if(pEdit){openPrayerDialog(pEdit.dataset.prayerEdit);return;}
    const pDelete=e.target.closest("[data-prayer-delete]");if(pDelete&&confirm("Excluir esta oração?")){data.prayers=data.prayers.filter(x=>x.id!==pDelete.dataset.prayerDelete);save();renderPrayerDetail();toast("Oração excluída.");return;}
    const pFav=e.target.closest("[data-prayer-favorite]");if(pFav){data.prayers=data.prayers.map(x=>x.id===pFav.dataset.prayerFavorite?{...x,favorite:!x.favorite}:x);save();renderPrayerDetail();return;}
    if(e.target.closest("#open-confession-vault")){openConfessionVault();return;}
    const taskEdit=e.target.closest("[data-task-edit]");if(taskEdit){openTaskDialog(taskEdit.dataset.taskEdit);return;}
    const txEdit=e.target.closest("[data-tx-edit]");if(txEdit){openFinanceDialog(txEdit.dataset.txEdit);return;}
    const pastEdit=e.target.closest("[data-pastoral-edit]");if(pastEdit){openPastoralDialog(pastEdit.dataset.area,pastEdit.dataset.pastoralEdit);return;}
    const roleEdit=e.target.closest("[data-role-edit]");if(roleEdit){openRoleDialog(roleEdit.dataset.roleEdit);return;}
    const photo=e.target.closest("[data-gallery-open]");if(photo){const x=data.gallery.find(i=>i.id===photo.dataset.galleryOpen);if(x){if(!x.data){toast("A imagem não está incluída neste backup sem fotos. Restaure um backup completo para visualizá-la.");return;}$("lightbox-image").src=x.data;$("lightbox-caption").textContent=[x.caption,x.album,dateLabel(x.date)].filter(Boolean).join(" · ");$("gallery-lightbox").showModal();}return;}
    const gEdit=e.target.closest("[data-gallery-edit]");if(gEdit){const x=data.gallery.find(i=>i.id===gEdit.dataset.galleryEdit);if(x){$("gallery-edit-id").value=x.id;$("gallery-edit-caption").value=x.caption||"";$("gallery-edit-album").value=x.album||"Geral";$("gallery-edit-dialog").showModal();}return;}
    const gDel=e.target.closest("[data-gallery-delete]");if(gDel&&confirm("Excluir esta foto da galeria?")){data.gallery=data.gallery.filter(x=>x.id!==gDel.dataset.galleryDelete);save();toast("Foto excluída.");return;}
    const nEdit=e.target.closest("[data-note-edit]");if(nEdit){openNoteDialog(nEdit.dataset.noteKind,nEdit.dataset.noteEdit);return;}
    const nDel=e.target.closest("[data-note-delete]");if(nDel&&confirm("Excluir este registro?")){const key=nDel.dataset.noteKind==="gratitude"?"gratitude":"intentions";data[key]=data[key].filter(x=>x.id!==nDel.dataset.noteDelete);save();toast("Registro excluído.");return;}
    const iEdit=e.target.closest("[data-improvement-edit]");if(iEdit){openImprovementDialog(iEdit.dataset.improvementEdit);return;}
    const iDel=e.target.closest("[data-improvement-delete]");if(iDel&&confirm("Excluir esta sugestão de melhoria?")){data.improvements=data.improvements.filter(x=>x.id!==iDel.dataset.improvementDelete);save();toast("Melhoria excluída.");return;}
    const iCopy=e.target.closest("[data-improvement-copy]");if(iCopy){const x=data.improvements.find(i=>i.id===iCopy.dataset.improvementCopy);if(x)copyText(improvementsText([x]));return;}
    const mEdit=e.target.closest("[data-member-edit]");if(mEdit){const x=data.members.find(i=>i.id===mEdit.dataset.memberEdit);if(x)openMemberDialog(x.area,x.id);return;}
    const mDel=e.target.closest("[data-member-delete]");if(mDel&&confirm("Excluir este membro da lista?")){data.members=data.members.filter(x=>x.id!==mDel.dataset.memberDelete);save();return;}
    const goalProgress=e.target.closest("[data-goal-progress]");if(goalProgress){const g=data.goals.find(x=>x.id===goalProgress.dataset.goalProgress);if(g){$("goal-progress-id").value=g.id;$("goal-progress-amount").value=g.current||0;$("goal-progress-dialog").showModal();}return;}
    const goalEdit=e.target.closest("[data-goal-edit]");if(goalEdit){const g=data.goals.find(x=>x.id===goalEdit.dataset.goalEdit);if(g){editingGoal=g.id;$("goal-title").value=g.title;$("goal-target").value=g.target;$("goal-current").value=g.current;$("goal-deadline").value=g.deadline||"";$("goal-form-title").textContent="Editar meta";$("goal-dialog").showModal();}return;}
    const goalDelete=e.target.closest("[data-goal-delete]");if(goalDelete&&confirm("Excluir esta meta financeira?")){data.goals=data.goals.filter(x=>x.id!==goalDelete.dataset.goalDelete);save();return;}
    const bEdit=e.target.closest("[data-bible-note-edit]");if(bEdit){openBibleNote(bEdit.dataset.bibleNoteEdit);return;}
    const bDel=e.target.closest("[data-bible-note-delete]");if(bDel&&confirm("Excluir esta anotação bíblica?")){data.bibleNotes=data.bibleNotes.filter(x=>x.id!==bDel.dataset.bibleNoteDelete);save();return;}
  });
  document.addEventListener("change",e=>{const st=e.target.closest("[data-improvement-status]");if(st){data.improvements=data.improvements.map(x=>x.id===st.dataset.improvementStatus?{...x,status:st.value,updatedAt:Date.now()}:x);save();toast("Status atualizado.");}});

  // Atualiza o texto inicial e a agenda do dia com os dados locais.
  function renderHomeExtras(){
    const p=data.profile||{};const name=p.nickname||p.firstName;if(name)$("page-title").textContent=`Bom ter você aqui, ${name}.`;
    const events=[];
    (data.tasks||[]).forEach(x=>{const recurringToday=x.recurrence&&x.recurrence!=="none"&&x.date<today()&&occurrencesForTask(x,new Date().getFullYear(),new Date().getMonth()).includes(today());if((x.date===today()||recurringToday)&&!x.done)events.push({title:x.title,time:x.time,area:recurringToday?"Tarefa recorrente":"Tarefa",icon:"✓"});});
    (data.pastoral||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:x.time,area:({pascom:"PASCOM",juventude:"Juventude",nucleo:"Núcleo",acolito:"Acólitos"})[x.area]||"Pastoral",icon:"✦"}));
    (data.roles||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:x.time,area:"Rolê",icon:"🎉"}));
    (data.transactions||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:"",area:x.type==="income"?"Receita":"Despesa",icon:x.type==="income"?"＋":"−"}));
    (data.diary||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:"",area:"Diário",icon:"✎"}));
    (data.intentions||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:"",area:"Intenção",icon:"🙏"}));
    (data.gratitude||[]).filter(x=>x.date===today()).forEach(x=>events.push({title:x.title,time:"",area:"Gratidão",icon:"♡"}));
    $("home-agenda-list").innerHTML=events.length?events.sort((a,b)=>(a.time||"").localeCompare(b.time||"")).map(x=>`<div class="item-row"><div class="item-main"><div class="item-title">${x.icon||"•"} ${escapeHTML(x.title)}</div><div class="item-meta">${x.time?escapeHTML(x.time)+" · ":""}${escapeHTML(x.area)}</div></div></div>`).join(""):'<div class="empty-inline">Nenhum compromisso cadastrado para hoje.</div>';
  }
  function renderFinanceReport(){const month=$("finance-month").value||monthKey(today());const txs=data.transactions.filter(t=>monthKey(t.date)===month&&t.type==="expense");const by={};txs.forEach(t=>{const cat=t.category||"Outros";by[cat]=(by[cat]||0)+Number(t.amount||0);});const rows=Object.entries(by).sort((a,b)=>b[1]-a[1]);$("finance-category-report").innerHTML=rows.length?rows.map(([cat,total])=>`<div class="item-row"><div class="item-main"><div class="item-title">${escapeHTML(cat)}</div><div class="mini-progress"><span style="width:${rows[0][1]?total/rows[0][1]*100:0}%"></span></div></div><strong class="amount expense">${money(total)}</strong></div>`).join(""):'<div class="empty-inline">Sem despesas no período selecionado.</div>';}
  // The data profile form is loaded only when the user visits its page, but persisted data stays safe.


  function renderAll() {
    $("stat-tasks").textContent=data.tasks.filter(t=>!t.done).length;
    $("stat-diary").textContent=data.diary.length;
    renderTasks(); renderDiary(); renderFinance(); renderPastoral(); renderRoles(); renderCalendar();
    renderPrayerCategories(); renderGallery(); renderNotes("intention"); renderNotes("gratitude"); renderImprovements(); renderMembers(); renderGoals(); renderBibleNotes(); renderFinanceReport(); renderHomeExtras();
  }
  renderAll();
  if ("Notification" in window && Notification.permission === "granted") checkDueNotifications();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) {
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();