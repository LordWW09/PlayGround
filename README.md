# SEED — mesa virtual local-first

SEED é uma interface de mesa virtual para campanhas de RPG, com foco em fichas, mapas 2D e ferramentas simples para sessões. A aplicação é executada no navegador e não exige conta, servidor ou serviço pago.

## Executar

Abra `index.html` em um navegador moderno. O estado é mantido no `localStorage` do navegador. Para preservar ou transferir seus dados, use as opções de backup e restauração em **Configurações**.

## Recursos

- Campanhas, sessões, personagens e sistemas configuráveis; inclui ficha de D&D 5ª Edição.
- Mesa 2D com imagens da biblioteca, grade quadrada/hexagonal, tokens, iniciativa e chat local.
- Ferramenta **Medir**: clique em dois pontos para visualizar uma distância aproximada; a escala considera 5 pés por quadrado (ou por célula de 48 px sem grade).
- Ferramentas de névoa: **Ocultar área** pinta células opacas e **Revelar área** remove a névoa. As células são persistidas por campanha neste navegador e acompanham o estado do backup.
- Biblioteca local para imagens, PDFs e texto, além de exportação/importação do estado.

## Limitações e privacidade

- O armazenamento fica apenas neste navegador e neste perfil. Não há sincronização entre dispositivos, serviço multiplayer remoto, autenticação ou permissões por jogador; a interface é operada localmente pelo Mestre.
- Os PDFs e demais arquivos são armazenados como data URL na biblioteca, mas não há leitor/visualizador de PDF embutido. Abra o arquivo fora do SEED ou mantenha-o como referência para consulta externa.
- O limite atual de importação é 1,5 MB por arquivo e o espaço disponível depende da quota do navegador. Arquivos grandes podem esgotar o `localStorage`; faça backups e remova arquivos desnecessários.
- A medida é uma estimativa em pés baseada na distância em pixels e na escala configurada; não aplica regras específicas de movimento ou terreno.
- A ficha D&D é uma implementação de campos comuns de jogo, sem automação completa de regras ou reprodução literal de materiais proprietários.

## Desenvolvimento e validação

A aplicação é composta por HTML, CSS e JavaScript sem dependências de runtime ou APIs pagas. Verifique a sintaxe do JavaScript com `node --check app.js`.
