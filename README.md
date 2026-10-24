# Magnificat app — organização pessoal

Aplicativo web responsivo para organizar datas e tarefas, registrar um diário pessoal e acompanhar receitas e despesas. Foi pensado para iniciantes e pode ser publicado gratuitamente no GitHub Pages.

## Recursos adicionados\n\n- Calendário geral mensal que reúne tarefas, diário, lançamentos financeiros, eventos pastorais, missas e rolês.\n- Área Rolês para planejar passeios com amigos, local, participantes, observações e imagens.\n- Anexos de imagens nos registros pastorais e nos rolês.\n- Ícones visuais na navegação para identificar rapidamente cada área.\n\n## Identidade visual

A logo do Magnificat app está aplicada na navegação e na tela inicial. Os ícones de instalação para celular e navegador também foram incluídos, com paleta bege e vinho.

## Funcionalidades desta versão

- **Visão geral:** resumo de tarefas pendentes, entradas no diário e saldo financeiro do mês.
- **Datas e tarefas:** cadastro de título, data, horário, categoria, observações e imagens anexadas; marcar como concluída, buscar, filtrar e excluir.
- **Diário pessoal:** criar, editar e excluir entradas com humor do dia e anexar imagens.
- **Financeiro:** registrar receitas e despesas, categorizar lançamentos, anexar comprovantes/imagens e visualizar os totais mensais.\n- **PASCOM:** calendário de eventos, reuniões, coberturas e publicações.\n- **Juventude:** calendário de encontros, retiros, formações e eventos.\n- **Núcleo JSF:** lista de responsabilidades pessoais com status pendente/concluída.\n- **Acólito:** registro das missas em que você se voluntariou para servir, com data, horário, local e observações.
- **Salvamento automático:** os dados são salvos no armazenamento local do navegador.
- **Layout responsivo:** interface adaptada para celular e computador.
- **PWA básico:** manifest e service worker incluídos para permitir instalação/cache em hospedagem HTTPS compatível.

## Como testar no computador

1. Extraia o ZIP.
2. Abra `index.html` no navegador. A maioria das funções deve funcionar localmente.
3. Para testar o modo instalável e o service worker, use um servidor local ou publique no GitHub Pages.

## Como publicar no GitHub Pages

1. Entre em https://github.com e crie um repositório, por exemplo `magnificat-app`.
2. No repositório, clique em **Add file → Upload files**.
3. Envie os arquivos desta pasta (não envie apenas o ZIP; extraia antes).
4. Clique em **Commit changes**.
5. Abra **Settings → Pages**.
6. Em **Build and deployment**, escolha **Deploy from a branch**.
7. Selecione a branch `main` e a pasta `/(root)`, depois salve.
8. Aguarde a publicação. O GitHub mostrará o endereço do site na seção Pages.

## Importante sobre seus dados e privacidade

Esta é uma primeira versão sem servidor. Os registros e imagens ficam no `localStorage` do navegador e **não são sincronizados automaticamente entre dispositivos**. As imagens são convertidas para JPEG e reduzidas para até 1400 px, com limite de 5 imagens por registro. Se limpar os dados do navegador, trocar de navegador ou usar outro aparelho, seus registros podem não aparecer. Para dados financeiros e pessoais importantes, faça cópias de segurança e não compartilhe o dispositivo sem proteção.

O próximo passo recomendado é adicionar exportação/importação de backup e, se você quiser sincronização entre celular e computador, conectar um serviço de autenticação e banco de dados (por exemplo, Supabase). Nunca coloque senhas, chaves privadas ou credenciais no código público do GitHub. Como imagens aumentam o espaço ocupado no navegador, prefira anexar fotos comprimidas e faça backups regularmente.

## Estrutura

- `index.html` — telas e formulários
- `styles.css` — visual e responsividade
- `app.js` — funcionalidades e armazenamento local
- `manifest.json` — metadados da instalação PWA
- `sw.js` — cache básico para uso offline

## Tecnologias

HTML, CSS e JavaScript puro. Não exige instalação de pacotes nem etapa de build.


### Fundo da interface
A arte `assets/fundo-inicio.jpg` é usada como fundo geral da interface. Para trocar, substitua esse arquivo mantendo o mesmo nome.


### Ícones e categorias
Os ícones personalizados ficam em `assets/`. A navegação principal usa Início, Calendário, Tarefas, Finanças, Diário, Pastorais, Rolês e Mais. A página Pastorais abre PASCOM, Juventude, Núcleo e Acólitos. Os atalhos espirituais e de perfil ficam em Mais.


### Bíblia e orações
A área Bíblia e orações inclui um acesso à Liturgia Diária da Canção Nova: https://liturgia.cancaonova.com/pb/liturgia/. O site pode bloquear exibição incorporada em alguns navegadores; nesse caso, use o botão para abrir diretamente.
