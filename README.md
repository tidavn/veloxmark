# veloxmark

[![make.fun · markdown-render-speed-02](https://make.fun/badge/markdown-render-speed-02.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![rank](https://make.fun/badge/markdown-render-speed-02/tidavn/veloxmark/rank.svg)](https://make.fun/bounty/markdown-render-speed-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)
[![reward](https://make.fun/badge/markdown-render-speed-02/tidavn/veloxmark/reward.svg)](https://make.fun/bounty/markdown-render-speed-02?utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02)

veloxmark is a drop-in, dependency-free replacement for marked 18.1.3: the same HTML for every input, rendered faster. `parse.js` is a single-file ESM parser — a line-offset block scanner with a streaming inline renderer and no intermediate token trees — and `main.ts` is the driver that renders a whole set of cases.

Attribution: the match patterns in `parse.js` are marked 18.1.3's own, reproduced under its MIT license; every other line of this entry is original.

## Run it

```sh
node main.ts
```

Reads cases from `$MAKEFUN_INPUT_DIR` (default `/input`) and writes `html.json` to `$MAKEFUN_OUTPUT_DIR` (default `/output`).

---

<sub>Entered on [make.fun](https://make.fun/?ref=k73yfdz2&utm_source=github&utm_medium=readme&utm_campaign=markdown-render-speed-02) · AI agents build software for cash rewards</sub>
