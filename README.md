# ECLIPSE: Crônicas do Véu

Um protótipo original de RPG de exploração para navegador. Explore Elyndra, encontre criaturas chamadas Vélions, forme vínculos, cuide da sua equipe e descubra novas regiões. O projeto é single-player e não utiliza personagens ou cenários de franquias existentes.

## Como jogar

Não há etapa de build nem dependências de pacote. Abra `index.html` em um navegador moderno ou sirva a pasta localmente, por exemplo:

```sh
python3 -m http.server 8000
```

Depois, acesse <http://localhost:8000>. Para jogar em um telefone ou tablet na mesma rede, abra o endereço do servidor usando o IP local do computador e a porta `8000`.

### Controles

| Ação | Teclado | Toque |
| --- | --- | --- |
| Mover | `WASD` ou setas | Direcional na tela |
| Iniciar combate / ataque rápido | `J` ou espaço | Botão de espada |
| Escolher habilidade durante o combate | `1`–`3` ou `D` (ataque) | Botões de habilidade no HUD |
| Interagir / recolher / conversar | `E` | Botão `E` |
| Tentar vínculo com criatura próxima | `K` | Botão de selo (`◎`) |
| Correr | Segurar `Shift` | — |
| Abrir mapa | `M` | Botão “Abrir mapa” |
| Explorar, equipe, bestiário, crônicas, bolsa | `1`–`5` | Menu da interface |

Aproxime-se do Vélion ferido junto às ruínas e use `E` para conversar. Oferecer uma fruta aumenta a confiança; em seguida, escolha “Selar vínculo”. Com um Vélion na equipe ativa, use `J`/espaço ou o botão de espada perto de uma criatura selvagem para iniciar um combate por turnos. Escolha uma habilidade no HUD (ou pressione `1`–`3`); `D` usa um ataque direto. A defesa reduz o dano da resposta inimiga. Também é possível enfraquecer criaturas antes de tentar capturá-las com `K` ou o botão de selo. Explore pontos brilhantes para recolher recursos, consulte o mapa para viajar e use a tela da equipe para alimentar, reorganizar ou liberar companheiros. Criaturas ganham experiência e podem evoluir.

### Salvamento

O jogo salva automaticamente durante a jornada e também oferece o botão de salvamento manual. Os dados ficam no `localStorage` do navegador deste dispositivo (`eclipse-veil-save-v1`); não existe conta ou sincronização na nuvem. Use “Nova jornada” para reiniciar — a ação substitui o progresso local após confirmação. Limpar os dados do site ou trocar de navegador/dispositivo pode apagar ou não transferir o progresso.

## Escopo do protótipo

- Exploração top-down em canvas com regiões, obstáculos, pontos de coleta, ruínas e altar.
- Combate por turnos com HUD e habilidades próprias de cada elemento, além de captura por selos, equipe de até quatro Vélions e refúgio.
- Progressão de nível, alimentação, afinidade, evolução com escolha de forma, bestiário e crônicas com recompensas.
- Viagem regional, interface adaptável, controles de toque, efeitos sonoros simples e salvamento local.

## Premissas e limitações

- É uma demonstração jogável de sistemas principais, não um RPG completo: conteúdo, mapas, encontros, balanceamento e crônicas são limitados e podem mudar.
- O combate é deliberadamente simples e não inclui árvores complexas de habilidades, inventário de equipamento ou IA avançada.
- A jornada é individual e funciona no cliente; não há servidor, multijogador, conta, sincronização ou proteção contra edição do salvamento local.
- Em Android e outros dispositivos móveis, o jogo roda no navegador; não é um aplicativo nativo instalável. Recomenda-se um navegador atualizado e espaço de tela suficiente para a interface.
- A interface e os textos estão em português brasileiro. A tipografia remota pode depender de conexão; fontes alternativas do sistema são usadas como fallback.

## Projeto no OMGithub

<!-- omgithub:readme:start -->
## 🚀 Build, play, and remix with OMGithub

**Remixed using [OMGithub.com](https://go.ondev.store/).**

[![OMGithub](https://img.shields.io/badge/OMGithub-Open%20project-orange?style=for-the-badge)](https://go.ondev.store/LordWW09/PlayGround)
[![GitHub](https://img.shields.io/badge/GitHub-Source-181717?logo=github&style=for-the-badge)](https://github.com/LordWW09/PlayGround)

- 🎮 [Open the project](https://go.ondev.store/LordWW09/PlayGround).
- ✨ [Remix this project](https://go.ondev.store/LordWW09/PlayGround?remix=1).
- 💻 [Explore the source](https://github.com/LordWW09/PlayGround).
- 🛠️ [Check build runs](https://github.com/LordWW09/PlayGround/actions).
- 🐛 [Report an issue](https://github.com/LordWW09/PlayGround/issues).
- 👤 [Explore the creator's projects](https://go.ondev.store/LordWW09).
- 🌍 [Create with OMGithub](https://go.ondev.store/).
- 🧬 [Explore the remix source](https://github.com/LordWW09/PlayGround/tree/094e52b0571f6fc9f10af89a56a07facb6c2227b).
<!-- omgithub:readme:end -->
