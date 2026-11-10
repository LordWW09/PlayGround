# SEED — mesa virtual local-first

SEED é uma mesa virtual de RPG 2D, em português, com foco em campanhas, fichas, mapas e ferramentas simples para sessões. Sem configuração de nuvem, os dados ficam no navegador e não é necessária uma conta.

## Executar localmente

Abra `index.html` em um navegador moderno. O estado local é mantido no `localStorage`; use **Configurações** para exportar backups e restaurá-los. A versão local pode ser usada sem servidor ou projeto Supabase.

## Ativar campanhas compartilhadas (opcional)

1. Crie um projeto Supabase e execute todo o conteúdo de [`supabase-schema.sql`](supabase-schema.sql) no SQL Editor do projeto.
2. Copie a URL do projeto e a chave pública **anon** para `supabase-config.js`, nos campos `url` e `anonKey`. Nunca coloque uma `service_role` ou outra chave secreta em arquivos servidos ao navegador.
3. Publique os arquivos em um host estático com HTTPS. A autenticação usa o Supabase Auth; a biblioteca Supabase JS é carregada por CDN, então a configuração cloud requer conexão à internet.
4. Cadastre-se/inicie sessão no SEED. Contas públicas são criadas como jogadores; para promover alguém, um administrador confiável deve atualizar `seed_profiles.app_role` no SQL Editor usando o `user_id` da conta (por exemplo: `update public.seed_profiles set app_role = 'master' where user_id = '<UUID>';`). O acesso às campanhas compartilhadas depende do convite ou da aprovação do Mestre.

Enquanto `supabase-config.js` mantiver os valores de exemplo, o app continua no modo local. Campanhas locais e campanhas cloud são armazenadas separadamente; exporte backups antes de trocar de navegador ou dispositivo. Configure também as URLs de redirecionamento de autenticação no painel do Supabase para o endereço publicado.

## Recursos

- Campanhas, sessões, personagens e sistemas configuráveis; inclui ficha de D&D 5ª Edição.
- Mesa 2D com imagens da biblioteca, grade quadrada/hexagonal, tokens, iniciativa e chat.
- Ferramenta **Medir**: clique em dois pontos para visualizar uma distância aproximada; a escala considera 5 pés por quadrado (ou por célula de 48 px sem grade).
- Ferramentas de névoa: **Ocultar área** pinta células opacas e **Revelar área** remove a névoa. As células são persistidas por campanha neste navegador e acompanham o estado do backup.
- Biblioteca local para imagens, PDFs e texto, além de exportação/importação do estado.
- Modo cloud opcional para autenticação, compartilhamento de campanhas, convites e gestão de participantes.

## Limitações e privacidade

- No modo local, dados ficam apenas neste navegador e perfil; não há sincronização entre dispositivos.
- No modo cloud, autenticação e dados de campanha são processados pelo seu projeto Supabase. Revise as políticas e funções de [`supabase-schema.sql`](supabase-schema.sql) antes de publicar; a chave anon é pública e a segurança depende das políticas/RPCs do banco.
- Arquivos da biblioteca ficam no armazenamento local do navegador e não são enviados como parte do compartilhamento cloud. PDFs são armazenados como data URL, mas não há visualizador embutido.
- O limite atual de importação é 1,5 MB por arquivo e o espaço disponível depende da quota do navegador. Arquivos grandes podem esgotar o `localStorage`; faça backups e remova arquivos desnecessários.
- A medida é uma estimativa em pés baseada na distância em pixels e na escala configurada; não aplica regras específicas de movimento ou terreno.
- A ficha D&D é uma implementação de campos comuns de jogo, sem automação completa de regras ou reprodução literal de materiais proprietários.

## Desenvolvimento e validação

A aplicação é composta por HTML, CSS e JavaScript. Verifique a sintaxe com `node --check app.js` e `node --check seed-cloud.js`. Para testar a integração cloud, configure um projeto de teste e use contas distintas para validar os fluxos de Mestre, jogador pendente, jogador aprovado e participante removido.

## Projeto original

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Created using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/LordWW09/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/LordWW09/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/LordWW09/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/LordWW09/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/LordWW09/PlayGround).
- 🛠️ [Check build runs](https://github.com/LordWW09/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/LordWW09/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/LordWW09).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
<!-- omgithub:readme:end -->
