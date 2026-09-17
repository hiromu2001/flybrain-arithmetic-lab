# 実装アーキテクチャ

## 目的

MVPでは「全脳再現」よりも、研究ループを壊さずに動かすことを優先する。

```text
Stimulus
  ↓
Functional neural simulation
  ↓
Decision
  ↓
Reward
  ↓
Dopamine signal
  ↓
Eligibility-gated plasticity
  ↓
Next trial
```

## Backend

`backend/simulation.py`

- `FlyBrainSimulation`
- 数量刺激生成
- LIF風population response
- quantity / KC / MBON / DAN / output activity
- reward calculation
- eligibility trace
- dopamine-gated weight update

`backend/main.py`

- FastAPI
- `GET /`
- `GET /state`
- `WS /ws`

WebSocket command:

```json
{"type":"step"}
{"type":"reset"}
{"type":"set_auto","value":true}
{"type":"set_speed","value":5}
{"type":"set_learning_rate","value":0.2}
{"type":"set_noise","value":0.15}
```

## Frontend

`frontend/src/App.tsx`

- WebSocket client
- Trial UI
- Fly animation
- neural activity SVG
- dopamine event animation
- learning trace
- experiment controls

## 現在のネットワーク

```text
visual (8)
  ↓
quantity (4)
  ↓
kenyon (18)
  ↓
mbon (4)
  ↓
output (2)

DAN (3)
  ↘ reward modulation
```

現在のノード数は39。

これは生物学的な細胞数を再現するための値ではなく、UIと実験ループを検証するための縮約モデルである。

## FlyWire実データへの置換方針

MVPの外部インターフェースは次の情報だけを要求する。

```text
trial
nodes[]
region
activity
x/y
selected_answer
dopamine
reward
weight_change
```

したがって将来のconnectome backendも同じstate schemaを返せば、フロントエンドを書き直さず交換できる。

推奨構成:

```text
backend/
  engines/
    base.py
    functional_mvp.py
    flywire.py
  connectome/
    loader.py
    cell_types.py
    neurotransmitters.py
    regions.py
```

### FlyWire adapterで必要になる処理

1. neuron / edge table読み込み
2. root idを内部連番へ変換
3. synapse countから初期weightを構成
4. neurotransmitter符号を反映
5. neuropil / cell typeで可視化regionを割当
6. sparse matrix化
7. simulation stepをGPUまたは疎行列演算へ移行
8. UIへ送るactive neuronだけをdownsample

## 数量課題

Phase 1:

```text
input = 1..4
rule = +1
answer = input + 1
```

回答候補は正答1個と誤答1個。

### 学習則

概念式:

```text
eligibility(t) = eligibility(t-1) * decay + active_pair
Δw = learning_rate * dopamine * eligibility
```

正解時:

```text
reward = 1
dopamine = 1
```

誤答時:

```text
reward = 0
dopamine = 0
```

## 重要な研究上の制約

このMVPの成功は、本物のショウジョウバエが四則演算を理解できることを意味しない。

将来、実コネクトームを使う場合も、ニューロンダイナミクス、可塑性則、感覚符号化、運動出力などに人工的仮定が残るため、それぞれを明示して評価する。

## 次に実装する順序

1. FlyWire loader
2. sparse adjacency representation
3. region filtering
4. LC11 pathway experiment
5. DAN / KC / MBON plasticity refinement
6. randomized-connectome control
7. ablation control
8. unseen quantity generalization test
9. 3D whole-brain renderer
