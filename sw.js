const CACHE = "magnificat-v7";
const ASSETS = ["./", "./index.html", "./styles.css", "./app.js", "./manifest.json", "./assets/fechar.png", "./assets/receitas.png", "./assets/evento.png", "./assets/inicio.png", "./assets/adicionar.png", "./assets/icon-192.png", "./assets/salvar.png", "./assets/pastoral-equipe.png", "./assets/diario.png", "./assets/pesquisar.png", "./assets/categorias-financeiras.png", "./assets/magnificat-logo.jpg", "./assets/localizacao.png", "./assets/pascom.png", "./assets/oracao.png", "./assets/juventude.png", "./assets/anexar-imagem.png", "./assets/perfil.png", "./assets/despesas.png", "./assets/calendario.png", "./assets/voltar.png", "./assets/nucleo.png", "./assets/confirmar.png", "./assets/fundo-inicio.jpg", "./assets/icon-512.png", "./assets/excluir.png", "./assets/roles.png", "./assets/editar.png", "./assets/contas.png", "./assets/biblia.png", "./assets/filtro.png", "./assets/lembrete.png", "./assets/financas.png", "./assets/pastorais.png", "./assets/concluido.png", "./assets/notificacoes.png", "./assets/prioridade.png", "./assets/mais.png", "./assets/relogio.png", "./assets/acolitos.png", "./assets/historico-financeiro.png", "./assets/galeria.png", "./assets/tarefas.png", "./assets/ajuda.png", "./assets/pendente.png", "./assets/intencoes.png"];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith("magnificat-") && key !== CACHE).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request).then(response => {
    if (response && response.ok && new URL(event.request.url).origin === self.location.origin) { const copy=response.clone(); caches.open(CACHE).then(cache=>cache.put(event.request,copy)); }
    return response;
  })));
});
