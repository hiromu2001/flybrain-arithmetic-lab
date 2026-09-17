# FlyBrain Arithmetic Lab

## ▶ [ブラウザですぐ遊ぶ](https://hiromu2001.github.io/flybrain-arithmetic-lab/)

**インストール・clone・Codespacesは不要です。**

ショウジョウバエを模した神経回路に数量課題を与え、**視覚入力 → 神経活動 → 選択 → ドーパミン報酬 → 可塑性**をリアルタイムに観察する実験サンドボックスです。

GitHub Pages版ではシミュレーションをブラウザ内のTypeScriptで実行するため、URLを開くだけで操作できます。

## できること

- 解剖寄りのショウジョウバエ表示
  - 複眼
  - 翅と翅脈
  - 腹部の節
  - 6本脚
  - 触角・剛毛
- 左右対称の脳表示
  - optic lobe
  - mushroom body
  - central complex
  - DAN / MBON
  - descending/output neurons
- 284個の表示ニューロンをリアルタイム更新
- 各ニューロンに cell type / neurotransmitter / membrane potential / activity を保持
- 正解時に dopamine burst
- eligibility trace を使った報酬依存可塑性
- 課題別に学習履歴・正答率を保持

### 学習できる課題

1. 数量比較（どちらが多いか）
2. `+1`
3. `-1`
4. 加算
5. 減算

画面上部の課題タブから切り替えられます。

## 現在の脳モデルについて

現在表示している284ニューロンは **FlyWireの139kニューロンをそのまま動かしているものではありません**。

現在は `FlyWire-ready functional proxy` です。

実際のショウジョウバエ脳を意識した領域構造・cell type・neurotransmitter・LIF状態を持つ縮約モデルで、将来的にsimulation engineをFlyWire由来のコネクトームへ置き換えられる構造にしています。

画面上のリアルなハエや脳形状は可視化であり、物理演算による生体シミュレーションではありません。また、現段階で課題を学習できても「本物のハエが四則演算できる」ことの証明にはなりません。

## 操作

### RUN 1 TRIAL

1問だけ実行します。神経活動と選択をゆっくり観察するときに使います。

### AUTO TRAIN

連続で学習させます。

### SPEED

`0.5x / 1x / 5x / 10x / 20x` から選択できます。

### RESET BRAIN

学習状態を初期化します。選択中の課題は維持されます。

### LEARNING RATE

正解時の可塑性の強さを変更します。

### NEURAL NOISE

意思決定時のノイズ量を変更します。

## Web版アーキテクチャ

```text
React / TypeScript
        |
Browser simulation socket
        |
Functional FlyBrain model
        |
Neural activity + dopamine-gated plasticity
```

Web版はGitHub Pagesへ自動デプロイされます。`main` のフロントエンドを更新するとGitHub Actionsがビルド・公開します。

## ローカル版

Python/FastAPI版も残してあります。ローカル版を使う場合は Python 3.11+、Node.js 20+、Git が必要です。

### Windows

```powershell
git clone https://github.com/hiromu2001/flybrain-arithmetic-lab.git
cd flybrain-arithmetic-lab
.\start.bat
```

ブラウザで `http://localhost:5173` を開きます。

### macOS / Linux

```bash
git clone https://github.com/hiromu2001/flybrain-arithmetic-lab.git
cd flybrain-arithmetic-lab
./start.sh
```

## ディレクトリ

```text
flybrain-arithmetic-lab/
├─ .github/
│  └─ workflows/
│     ├─ ci.yml
│     └─ pages.yml
├─ .devcontainer/
├─ backend/
│  ├─ main.py
│  ├─ simulation.py
│  ├─ smoke_test.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ browserSocket.ts
│  │  ├─ main.tsx
│  │  └─ styles.css
│  ├─ package.json
│  └─ vite.config.ts
├─ docs/
├─ start.bat
└─ start.sh
```

## 次の研究実装

1. FlyWire node / edge export loader
2. neuropil / cell type / neurotransmitter mapping
3. sparse adjacency graph
4. optic lobeから中央脳への刺激伝播
5. DAN / KC / MBON可塑性の実回路寄り実装
6. real connectome vs randomized connectome
7. ablation experiment
8. 未学習数量への一般化テスト
