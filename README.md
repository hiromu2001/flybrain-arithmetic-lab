# FlyBrain Arithmetic Lab

ショウジョウバエの脳回路を模した、ドーパミン報酬学習と神経活動のリアルタイム可視化プロトタイプです。

> 現在のMVPは **FlyWireの全コネクトームそのものを完全再現する実装ではありません**。まず「数量刺激 → 神経活動 → 意思決定 → 報酬 → 可塑性」の実験ループと可視化を動かし、後から実コネクトームへ差し替えられる構成にしています。

## できること

- 1〜4個のドット刺激を提示
- `+1` 課題を自動生成
- 簡易LIF（Leaky Integrate-and-Fire）風ニューロン状態をシミュレーション
- 視覚系 / 数量表現 / Mushroom Body / DAN / MBON / 出力層を可視化
- 正解時に dopamine burst を発生
- eligibility trace を使った簡易報酬依存可塑性
- Trial、正答率、ドーパミン値、出力活動をリアルタイム表示
- Observe / Auto Train 切替

## 構成

```text
flybrain-arithmetic-lab/
├─ backend/
│  ├─ main.py
│  ├─ simulation.py
│  └─ requirements.txt
├─ frontend/
│  ├─ src/
│  │  ├─ App.tsx
│  │  ├─ main.tsx
│  │  └─ styles.css
│  ├─ index.html
│  ├─ package.json
│  ├─ tsconfig.json
│  └─ vite.config.ts
├─ start.bat
└─ start.sh
```

## 必要環境

- Python 3.11+
- Node.js 20+

## Windowsで起動

リポジトリをclone後、ルートで:

```bat
start.bat
```

初回は依存関係をインストールします。バックエンドとフロントエンドが別ウィンドウで起動します。

ブラウザで:

```text
http://localhost:5173
```

## 手動起動

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

macOS / Linux:

```bash
source .venv/bin/activate
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 現在のモデル

MVPでは計算負荷と検証容易性を優先し、数十ノードの機能的ネットワークを使います。

```text
visual -> quantity -> kenyon -> mbon -> left/right output
                         ^
                         |
                     dopamine
```

正解時:

```text
reward = 1
DAN activity ↑
Δw = learning_rate × dopamine × eligibility_trace
```

誤答時は正のドーパミン報酬を与えません。

## 次の段階

1. FlyWire公開コネクトームの読み込みアダプタ
2. 実際のcell type / neuropil情報のマッピング
3. LC11を含む視覚経路の検証
4. Mushroom BodyのDAN / KC / MBON回路をより生物学的に実装
5. `+1` 学習後の未知数量への一般化テスト
6. ablation（LC11 / DAN / MBON停止）
7. real connectome vs randomized connectome 比較
8. 3D脳表示

## 注意

このMVPで算数課題に成功しても「本物のハエが算数を理解した」とは言えません。現段階では、ショウジョウバエ由来の回路設計思想を取り入れたシミュレーション上で、報酬学習が成立するかを見るための研究・可視化プロトタイプです。
