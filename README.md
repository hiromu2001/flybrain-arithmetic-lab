# FlyBrain Arithmetic Lab

ショウジョウバエを模した神経回路に数量課題を与え、**視覚入力 → 神経活動 → 選択 → ドーパミン報酬 → 可塑性**をリアルタイムに観察する実験サンドボックスです。

## すぐ遊ぶ：GitHub Codespaces

ローカルへのcloneやPython / Node.jsの事前インストールは不要です。

[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/hiromu2001/flybrain-arithmetic-lab?quickstart=1)

1. 上の **Open in GitHub Codespaces** を押す
2. **Create codespace** を押す
3. 初回だけ依存関係が自動でセットアップされる
4. セットアップ後、FlyBrain Arithmetic Lab の画面が自動で開く

CodespacesではReact/ViteとFastAPIが自動起動します。フロントエンドの `5173` 番ポートからWebSocketをVite経由でバックエンドへ中継するため、Codespacesのブラウザ版でもそのまま操作できます。

## v0.2 でできること

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
- 各ニューロンに以下を保持
  - cell type
  - neurotransmitter
  - membrane potential
  - activity
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

## 重要: 現在の脳モデルについて

現在表示している284ニューロンは **FlyWireの139kニューロンをそのまま動かしているものではありません**。

現在は:

```text
FlyWire-ready functional proxy
```

です。

つまり、実際のショウジョウバエ脳を意識した領域構造・cell type・neurotransmitter・LIF状態を持つ縮約モデルで、フロントエンドとAPIを先に完成させています。

将来的にsimulation engineだけをFlyWire由来のコネクトームへ置き換えられるよう、UI側は個々のニューロンを次の形式で受け取ります。

```json
{
  "id": "neuron-id",
  "region": "mushroom_left",
  "cell_type": "Kenyon cell",
  "neurotransmitter": "acetylcholine",
  "activity": 0.73,
  "membrane_potential": -54.8,
  "x": 0.41,
  "y": 0.32
}
```

## Windowsで最新版に更新

すでにclone済みの場合、VS Codeのターミナルでリポジトリのフォルダに移動して:

```powershell
git pull
```

その後、古いバックエンド/フロントエンドの黒いウィンドウを閉じて:

```powershell
.\start.bat
```

ブラウザで:

```text
http://localhost:5173
```

## 初回起動

Codespacesを使わずローカルで動かす場合の必要環境:

- Python 3.11+
- Node.js 20+
- Git

```powershell
git clone https://github.com/hiromu2001/flybrain-arithmetic-lab.git
cd flybrain-arithmetic-lab
.\start.bat
```

## 操作

### RUN 1 TRIAL

1問だけ実行します。神経活動と選択をゆっくり観察するときに使います。

### AUTO TRAIN

連続で学習させます。

### SPEED

`0.5x / 1x / 5x / 10x / 20x`

から選択できます。

### RESET BRAIN

学習状態を初期化します。選択中の課題は維持されます。

### LEARNING RATE

正解時の可塑性の強さを変更します。

### NEURAL NOISE

意思決定時のノイズ量を変更します。

## アーキテクチャ

```text
React / TypeScript
        |
     WebSocket
        |
FastAPI / Python
        |
FlyBrainSimulation
        |
LIF activity + dopamine-gated plasticity
```

## ディレクトリ

```text
flybrain-arithmetic-lab/
├─ .devcontainer/
│  ├─ devcontainer.json
│  └─ start-codespaces.sh
├─ backend/
│  ├─ main.py
│  ├─ simulation.py
│  ├─ smoke_test.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  └─ styles.css
│  └─ package.json
├─ docs/
├─ start.bat
└─ start.sh
```

## 次の研究実装

次の大きな段階は **FlyWire実コネクトーム接続**です。

予定:

1. FlyWire node / edge export loader
2. neuropil / cell type / neurotransmitter mapping
3. sparse adjacency graph
4. optic lobeから中央脳への刺激伝播
5. DAN / KC / MBON可塑性の実回路寄り実装
6. real connectome vs randomized connectome
7. ablation experiment
8. 未学習数量への一般化テスト

## 注意

画面上のリアルなハエや脳形状は可視化です。物理演算による生体シミュレーションではありません。

また、現段階で課題を学習できても「本物のハエが四則演算できる」ことの証明にはなりません。実コネクトーム接続後も、刺激符号化・ニューロンモデル・可塑性則などの仮定を明示して評価する必要があります。
