# ⚽ Quem é o Craque?

Jogo diário de navegador: descubra o jogador de futebol pelos **escudos dos clubes da carreira**.

Aparece o escudo do primeiro clube. Você chuta um nome ou pula. A cada erro ou pulo, aparece o próximo clube da carreira. Acerte antes de a carreira acabar: quanto menos escudos, mais pontos.

- **Craque do dia:** o mesmo jogador para todo mundo, com resultado para compartilhar (🟥⬛🟩⬜).
- **Treino livre:** jogadores sem limite.
- **Fácil ou Difícil:** no Difícil o sorteio inclui mais jogadores e os anos das passagens ficam escondidos.
- **Autocompletar** com dezenas de milhares de nomes e tolerância a erros de digitação.
- **Visual retrô:** pixel art, efeito de TV de tubo, neon rosa e ciano, só fontes pixel (Silkscreen, Pixelify Sans, VT323); o céu escurece a cada escudo revelado.
- **Pontuação simples:** a rodada vale 10 pontos por clube da carreira e perde 10 a cada escudo revelado.
- **Sem API paga e sem cadastro:** usa só dados abertos.

## Estrutura

```
quem-e-o-craque/
├── index.html               página do jogo
├── site.webmanifest         permite "instalar" no celular
├── .nojekyll                avisa o GitHub Pages para servir os arquivos como estão
├── assets/
│   ├── css/style.css        visual completo
│   ├── img/favicon.svg
│   └── js/
│       ├── config.js        ⚙️ ajustes: dificuldade, pontuação, data de lançamento
│       ├── main.js          liga tudo: estado, eventos, modos
│       ├── ui.js            desenha a tela, a revelação do tier e a súmula
│       ├── scene.js         estádio em pixel art da tela inicial
│       ├── sprites.js       sprites 12×12 em pixel art (troféu, bola, bandeirinha…)
│       ├── game.js          regras de uma rodada (sem interface)
│       ├── career.js        monta a carreira (ordena, remove seleções e base)
│       ├── data.js          escolhe a fonte: arquivo local ou Wikidata ao vivo
│       ├── wikidata.js      consultas SPARQL (usado no navegador e no script)
│       ├── crests.js        escudos: Commons → TheSportsDB → escudo desenhado; efeito pixel art
│       ├── autocomplete.js  busca de nomes com tolerância a erros
│       ├── daily.js         craque do dia, contagem regressiva
│       ├── share.js         texto de compartilhamento
│       ├── stats.js         estatísticas salvas no navegador
│       ├── storage.js       localStorage seguro
│       └── text.js          normalizar e escapar texto
├── data/                    gerado automaticamente (players.json, names.json)
├── scripts/build-data.mjs   baixa e compacta os dados do Wikidata
└── .github/workflows/deploy.yml   gera os dados e publica no GitHub Pages
```

## Publicar no GitHub Pages

1. Crie um repositório no GitHub (ex.: `quem-e-o-craque`) e envie estes arquivos para a branch `main`:
   ```bash
   git init
   git add .
   git commit -m "Primeira versão"
   git branch -M main
   git remote add origin https://github.com/hsbll/quem-e-o-craque.git
   git push -u origin main
   ```
2. No repositório, abra **Settings → Pages** e, em **Build and deployment → Source**, escolha **GitHub Actions**.
3. Abra a aba **Actions**. O workflow "Gerar dados e publicar no GitHub Pages" roda sozinho a cada push. Se ele já tiver rodado antes do passo 2, clique em **Run workflow**.
4. Em alguns minutos o jogo fica em `https://hsbll.github.io/quem-e-o-craque/`.

O workflow também roda **toda segunda-feira** para atualizar as carreiras (transferências novas entram sozinhas).

> Troque `SEU_USUARIO` no `userAgent` de `assets/js/config.js`. O Wikidata pede que scripts se identifiquem.

## Rodar no seu computador

Os módulos JavaScript não funcionam abrindo o `index.html` com dois cliques (`file://`). Use um servidor local:

```bash
npm run dev            # abre em http://localhost:5173
# ou: python3 -m http.server 5173
```

Sem a pasta `data/` preenchida, o jogo consulta o Wikidata ao vivo (funciona, só é mais lento na primeira vez). Para gerar os arquivos localmente (precisa do Node 18+):

```bash
npm run data
```

## De onde vêm os dados

| O quê | Fonte | Licença |
|---|---|---|
| Jogadores, apelidos, clubes e anos | [Wikidata](https://www.wikidata.org) (SPARQL) | CC0 |
| Escudos | [Wikimedia Commons](https://commons.wikimedia.org) (propriedade P154) | varia por arquivo |
| Escudos que faltam no Commons | [TheSportsDB](https://www.thesportsdb.com) (chave pública `123`) | termos do TheSportsDB |

Muitos escudos (principalmente de clubes ingleses) não estão no Commons por direitos autorais. Nesses casos o jogo tenta o TheSportsDB e, se não achar, desenha um escudo com as iniciais do clube. Escudos e marcas pertencem aos seus clubes.

## Personalizar

Tudo fica em `assets/js/config.js`:

- `launchDate`: o dia #1 do Craque do dia.
- `dailyMinSitelinks`: fama mínima do craque do dia (número de artigos na Wikipédia).
- `difficulties`: Fácil e Difícil (fama mínima dos jogadores do treino e se os anos aparecem).
- `pointsPerCrest`: quantos pontos vale cada escudo poupado.
- `minClubs`: mínimo de clubes para um jogador ser sorteado.

## Licença

Código sob licença MIT. Os dados do Wikidata são CC0.
