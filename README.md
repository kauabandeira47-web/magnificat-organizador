# Magnificat — seu espaço pessoal

Aplicativo web responsivo para organização pessoal, vida espiritual e acompanhamento das atividades pastorais. O projeto usa HTML, CSS e JavaScript puro e pode ser publicado no GitHub Pages.

## O que há nesta versão

- **Início:** resumo de tarefas, diário, saldo mensal, Palavra para meditar e agenda do dia.
- **Calendário:** visualizações mensal, diária e lista do mês, com eventos oriundos das áreas pessoais e pastorais e projeção de tarefas recorrentes.
- **Tarefas:** cadastro, edição, conclusão, exclusão, prioridades, categorias, pesquisa e repetição semanal, mensal ou anual.
- **Diário:** entradas editáveis, data, humor, pesquisa e anexos de imagens.
- **Finanças:** receitas e despesas, lançamentos editáveis, categorias, cartões, parcelamento e metas financeiras.
- **Pastorais:** PASCOM, Juventude, Núcleo e Acólitos, com atividades e listas pessoais de membros.
- **Rolês:** eventos pessoais, participantes, observações, custos, despesas e imagens.
- **Orações:** biblioteca por categorias usando as capas fornecidas pelo usuário; busca, favoritos, cadastro e edição de orações.
- **Bíblia:** acesso externo à Bíblia do Padre Paulo Ricardo e à Liturgia Diária da Canção Nova, além de anotações bíblicas locais.
- **Galeria:** área independente com imagens, álbuns, legendas, busca, visualização ampliada, edição e exclusão.
- **Intenções e gratidão:** registros pessoais editáveis.
- **Central de melhorias:** cadastro, categorias, status, pesquisa, cópia individual ou completa e exportação em TXT.
- **Perfil:** informações pessoais, preferências, frase, versículo e foto.
- **Confissão:** bloco de notas separado, protegido por senha e criptografia no navegador.
- **Backup:** exportação e restauração de arquivo JSON, incluindo dados e imagens.

## Armazenamento, backup e privacidade

Esta versão **não usa banco de dados online, login ou sincronização automática**. Os dados são guardados no armazenamento local do navegador e ficam neste dispositivo e neste perfil de navegador. Limpar os dados do navegador, trocar de perfil ou de dispositivo pode fazer com que os registros não estejam disponíveis. Faça backups regularmente e guarde o arquivo em um local seguro, como seu Google Drive.

O backup completo é um arquivo JSON que pode conter fotos, registros do diário, informações financeiras e outras informações pessoais. O arquivo exportado **não é protegido por senha**. Tenha cuidado ao compartilhá-lo. A opção de exportar sem anexos conserva as informações textuais e metadados da Galeria, mas não leva os arquivos de imagem.

O armazenamento local do navegador tem limite. As imagens são redimensionadas e comprimidas antes de serem salvas, mas muitas fotos ainda podem exceder a capacidade disponível. Se aparecer um aviso de falha ao salvar, exporte um backup e reduza a quantidade de anexos.

A área privada de Confissão utiliza Web Crypto (AES-GCM e chave derivada de senha) em contextos seguros, como GitHub Pages em HTTPS ou localhost compatível. Use uma senha forte e guarde-a em local seguro: **se ela for esquecida, o conteúdo criptografado não poderá ser recuperado**. Essa senha protege o bloco de notas, não o restante do aplicativo nem o arquivo de backup.

## Fontes externas da área espiritual

As seguintes páginas podem ser abertas a partir do aplicativo; elas requerem internet:

- Bíblia — Padre Paulo Ricardo: https://padrepauloricardo.org/biblia
- Liturgia Diária — Canção Nova: https://liturgia.cancaonova.com/pb/liturgia/
- Orações diante de Jesus Eucarístico — Canção Nova: https://formacao.cancaonova.com/espiritualidade/oracao/oracoes-para-fazer-diante-de-jesus-eucaristico/
- Mistérios do Santo Rosário — Vaticano: https://www.vatican.va/special/rosary/documents/misteri_po.html
- *Rosarium Virginis Mariae* — São João Paulo II: https://www.vatican.va/content/john-paul-ii/pt/apost_letters/2002/documents/hf_jp-ii_apl_20021016_rosarium-virginis-mariae.html
- *Patris corde* — Papa Francisco: https://www.vatican.va/content/francesco/pt/apost_letters/documents/papa-francesco-lettera-ap_20201208_patris-corde.html
- Consagração a Nossa Senhora Aparecida — Santuário Nacional: https://www.a12.com/reze-no-santuario/consagracao
- Oração oficial para a canonização de Carlo Acutis — Associação Carlo Acutis: https://www.carloacutis.com/pt/association/preghiera-ufficiale
- Novena do Venerável Guido Schäffer — Associação do Venerável Guido: https://guidoschaffer.com.br/reze.html
- Orações de São João Paulo II — Santa Sé: https://www.vatican.va/content/john-paul-ii/pt/prayers.html

**Nota sobre os textos de oração:** orações básicas e os mistérios do Rosário aparecem no app. Algumas devoções e novenas têm uma indicação de fonte ou uma ficha de referência em vez de texto completo, para evitar atribuir à Igreja uma redação não conferida. As Orações Eucarísticas I–V são textos litúrgicos próprios do Missal Romano: esta versão indica a necessidade de consultar a edição aprovada para o Brasil e não pretende substituir o Missal. Os textos podem ser editados no app conforme a versão que o usuário conferir.

## Como testar no computador

1. Extraia o arquivo ZIP para uma pasta.
2. Para uma verificação rápida, abra `index.html` em um navegador.
3. Para testar recursos que dependem de HTTPS, criptografia ou instalação PWA, publique em HTTPS ou use um servidor local apropriado.

## Como publicar no GitHub Pages

1. Entre em https://github.com e abra o repositório do Magnificat.
2. Envie os arquivos e pastas extraídos do ZIP para a raiz do repositório; não envie somente o ZIP.
3. Faça commit das alterações.
4. Abra **Settings → Pages**.
5. Em **Build and deployment**, selecione **Deploy from a branch**, branch `main` e pasta `/(root)`.
6. Salve e abra o endereço publicado informado pelo GitHub.

Ao atualizar um site que usa o mesmo endereço, o armazenamento local do navegador normalmente permanece associado à mesma origem; ainda assim, faça um backup antes de atualizar.

## Estrutura

- `index.html` — telas e formulários.
- `styles.css` — identidade visual e responsividade.
- `app.js` — funcionalidades e armazenamento local.
- `manifest.json` — metadados de instalação PWA.
- `sw.js` — service worker e cache básico.
- `assets/` — identidade visual, ícones e capas das categorias espirituais.

## Tecnologias

HTML, CSS e JavaScript puro. Não é necessário instalar pacotes ou executar uma etapa de build.
