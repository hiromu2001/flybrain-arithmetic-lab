import { useEffect, useMemo, useRef, useState } from 'react'

type NodeState = {
  id: string
  region: string
  activity: number
  membrane_potential: number
  cell_type: string
  neurotransmitter: string
  x: number
  y: number
  index: number
}

type TaskInfo = {
  id: string
  label: string
  short: string
}

type Ability = {
  label: string
  trials: number
  accuracy: number
}

type SimState = {
  type: string
  model: string
  connectome_mode: string
  flywire_ready: boolean
  simulated_neurons: number
  task: string
  task_label: string
  available_tasks: TaskInfo[]
  trial: number
  accuracy: number
  recent_accuracy: number
  learning_rate: number
  noise: number
  dopamine: number
  reward: number
  correct: boolean | null
  operand_a: number
  operand_b: number
  operator: string
  choices: number[]
  correct_answer: number
  selected_answer: number | null
  selected_index: number | null
  weight_change: number
  nodes: NodeState[]
  abilities: Record<string, Ability>
  auto?: boolean
  speed?: number
}

type HistoryPoint = {
  trial: number
  accuracy: number
  dopamine: number
}

const FALLBACK_TASKS: TaskInfo[] = [
  { id: 'compare', label: '数量比較', short: 'MORE?' },
  { id: 'plus1', label: '+1', short: '+1' },
  { id: 'minus1', label: '-1', short: '-1' },
  { id: 'addition', label: '加算', short: '+' },
  { id: 'subtraction', label: '減算', short: '-' },
]

function DotCloud({ count, compact = false }: { count: number; compact?: boolean }) {
  const dots = Array.from({ length: Math.max(0, count) })
  return (
    <div className={`dot-cloud ${compact ? 'compact' : ''}`} aria-label={`${count}個`}>
      {dots.map((_, i) => {
        const x = ((i * 37 + count * 13) % 74) + 12
        const y = ((i * 53 + count * 17) % 64) + 15
        const scale = 0.8 + ((i * 7) % 5) * 0.07
        return <span key={i} style={{ left: `${x}%`, top: `${y}%`, transform: `scale(${scale})` }} />
      })}
      {count === 0 && <b className="zero-mark">0</b>}
    </div>
  )
}

function RealisticFly({ state }: { state: SimState | null }) {
  const rewarded = (state?.dopamine ?? 0) > 0
  const active = (state?.trial ?? 0) > 0
  return (
    <div className={`specimen-stage ${rewarded ? 'rewarded' : ''} ${active ? 'active' : ''}`}>
      <div className="specimen-grid" />
      <svg className="fly-anatomy" viewBox="0 0 640 430" role="img" aria-label="Drosophila melanogaster visualization">
        <defs>
          <radialGradient id="thoraxG" cx="38%" cy="32%" r="75%">
            <stop offset="0" stopColor="#8c623d" />
            <stop offset="0.45" stopColor="#4b2d20" />
            <stop offset="1" stopColor="#17100d" />
          </radialGradient>
          <linearGradient id="abdomenG" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="#2d1b13" />
            <stop offset="0.45" stopColor="#855f31" />
            <stop offset="0.7" stopColor="#4a321c" />
            <stop offset="1" stopColor="#17100d" />
          </linearGradient>
          <radialGradient id="eyeG" cx="35%" cy="30%" r="70%">
            <stop offset="0" stopColor="#ff6f52" />
            <stop offset="0.42" stopColor="#b62422" />
            <stop offset="1" stopColor="#4c0b0f" />
          </radialGradient>
          <linearGradient id="wingG" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#eef6f1" stopOpacity="0.68" />
            <stop offset="1" stopColor="#9fc5b7" stopOpacity="0.15" />
          </linearGradient>
          <filter id="softGlow"><feGaussianBlur stdDeviation="7" /></filter>
          <filter id="flyShadow"><feGaussianBlur stdDeviation="9" /></filter>
          <pattern id="ommatidia" width="8" height="7" patternUnits="userSpaceOnUse">
            <circle cx="2" cy="2" r="1.45" fill="#ff8068" fillOpacity="0.45" />
            <circle cx="6" cy="5" r="1.25" fill="#3d090e" fillOpacity="0.55" />
          </pattern>
        </defs>

        <ellipse cx="320" cy="374" rx="176" ry="22" fill="#000" opacity="0.38" filter="url(#flyShadow)" />
        {rewarded && <ellipse cx="285" cy="187" rx="155" ry="130" fill="#ffb52e" opacity="0.13" filter="url(#softGlow)" />}

        {/* wings */}
        <g className="wings">
          <path d="M300 184 C218 99 95 65 69 121 C49 165 146 240 293 242 Z" fill="url(#wingG)" stroke="#b7d5cc" strokeOpacity="0.52" strokeWidth="2" />
          <path d="M317 181 C402 96 529 72 562 126 C585 166 489 241 324 241 Z" fill="url(#wingG)" stroke="#b7d5cc" strokeOpacity="0.52" strokeWidth="2" />
          <g className="wing-veins" fill="none" stroke="#647b74" strokeOpacity="0.54" strokeWidth="1.6">
            <path d="M291 193 C221 148 144 114 79 126" /><path d="M286 204 C208 194 141 176 91 145" /><path d="M285 217 C216 226 155 213 111 182" /><path d="M224 151 L165 218" />
            <path d="M327 191 C410 143 491 112 553 132" /><path d="M330 205 C417 190 493 173 548 145" /><path d="M331 218 C414 229 485 211 529 181" /><path d="M408 151 L474 216" />
          </g>
        </g>

        {/* abdomen */}
        <path d="M317 229 C356 230 401 253 421 294 C440 333 410 360 357 357 C318 355 288 321 282 277 C279 249 292 232 317 229 Z" fill="url(#abdomenG)" stroke="#a37c46" strokeOpacity="0.45" strokeWidth="2" />
        <g className="abdomen-bands" fill="none" stroke="#17100c" strokeWidth="9" strokeOpacity="0.66">
          <path d="M304 257 C341 270 378 269 410 257" /><path d="M300 284 C340 298 388 296 423 282" /><path d="M310 313 C350 326 394 323 426 307" /><path d="M329 338 C363 346 393 341 414 330" />
        </g>

        {/* thorax */}
        <ellipse cx="300" cy="226" rx="73" ry="83" fill="url(#thoraxG)" stroke="#a77b51" strokeOpacity="0.4" strokeWidth="2" />
        <path d="M265 173 C291 157 328 160 348 181" fill="none" stroke="#d0a16e" strokeOpacity="0.32" strokeWidth="4" />
        <g className="bristles" stroke="#17110e" strokeWidth="2" strokeLinecap="round">
          <path d="M253 176 L227 139" /><path d="M276 157 L265 118" /><path d="M307 151 L313 111" /><path d="M334 163 L354 123" /><path d="M346 188 L382 157" />
        </g>

        {/* head */}
        <ellipse cx="244" cy="183" rx="58" ry="53" fill="#5b3827" stroke="#a27150" strokeOpacity="0.5" strokeWidth="2" />
        <ellipse cx="210" cy="181" rx="33" ry="40" fill="url(#eyeG)" /><ellipse cx="210" cy="181" rx="31" ry="38" fill="url(#ommatidia)" opacity="0.8" />
        <ellipse cx="268" cy="169" rx="30" ry="37" fill="url(#eyeG)" /><ellipse cx="268" cy="169" rx="28" ry="35" fill="url(#ommatidia)" opacity="0.75" />
        <path d="M229 208 C238 222 252 225 262 211" fill="none" stroke="#1b110d" strokeWidth="5" strokeLinecap="round" />

        {/* antennae */}
        <g stroke="#251713" strokeWidth="3" fill="none" strokeLinecap="round">
          <path d="M226 146 C206 118 186 111 171 99" /><path d="M258 139 C264 109 280 95 292 79" />
          <path d="M171 99 l-17 -18 M172 99 l-24 1 M292 79 l8 -23 M292 79 l22 -10" strokeWidth="2" />
        </g>

        {/* six legs */}
        <g className="legs" fill="none" stroke="#251812" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M263 239 C217 258 188 290 157 337 L112 362" /><path d="M273 256 C231 290 223 326 213 371 L181 393" /><path d="M292 273 C278 315 282 350 292 390 L266 410" />
          <path d="M330 239 C372 258 402 294 437 337 L482 362" /><path d="M337 255 C382 287 393 325 405 371 L440 393" /><path d="M336 273 C353 314 351 350 342 390 L370 410" />
        </g>
        <g className="tarsi" stroke="#251812" strokeWidth="2" strokeLinecap="round">
          <path d="M112 362 l-19 4 M112 362 l-14 11" /><path d="M181 393 l-17 3 M266 410 l-16 2" /><path d="M482 362 l19 4 M482 362 l14 11" /><path d="M440 393 l17 3 M370 410 l16 2" />
        </g>
      </svg>

      <div className="specimen-meta">
        <div><span>SPECIES</span><b>D. melanogaster</b></div>
        <div><span>SUBJECT</span><b>FLY #001</b></div>
        <div><span>STATE</span><b>{rewarded ? 'REWARDED' : active ? 'ACTIVE' : 'IDLE'}</b></div>
      </div>
      {rewarded && <div className="dopamine-burst">DOPAMINE BURST <b>+{state?.dopamine.toFixed(2)}</b></div>}
    </div>
  )
}

function BrainMap({ nodes, dopamine }: { nodes: NodeState[]; dopamine: number }) {
  const activeCount = nodes.filter((n) => n.activity > 0.55).length
  const paths = [
    'M128 280 C210 205 294 205 365 255',
    'M872 280 C790 205 706 205 635 255',
    'M365 255 C420 225 462 220 500 242',
    'M635 255 C580 225 538 220 500 242',
    'M500 242 C500 320 500 368 500 445',
    'M345 205 C405 155 457 154 495 205',
    'M655 205 C595 155 543 154 505 205',
    'M410 380 C448 412 475 425 500 445',
    'M590 380 C552 412 525 425 500 445',
  ]
  return (
    <div className="brain-wrap">
      <svg viewBox="0 0 1000 560" className="brain-svg" role="img" aria-label="Fruit fly brain activity">
        <defs>
          <radialGradient id="brainTissue" cx="50%" cy="42%" r="58%">
            <stop offset="0" stopColor="#513c52" stopOpacity="0.42" />
            <stop offset="0.65" stopColor="#211a2e" stopOpacity="0.52" />
            <stop offset="1" stopColor="#0b0d15" stopOpacity="0.16" />
          </radialGradient>
          <filter id="neuralGlow"><feGaussianBlur stdDeviation="5" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
          <filter id="tissueGlow"><feGaussianBlur stdDeviation="12" /></filter>
        </defs>

        <ellipse cx="116" cy="286" rx="83" ry="159" className="optic-lobe tissue" />
        <ellipse cx="884" cy="286" rx="83" ry="159" className="optic-lobe tissue" />
        <path d="M191 273 C212 136 346 91 494 112 C647 89 786 139 809 275 C826 385 721 475 503 484 C284 477 176 387 191 273 Z" fill="url(#brainTissue)" className="central-tissue" />
        <path d="M293 215 C336 143 433 137 477 211 C441 224 405 248 377 287 C344 259 316 238 293 215 Z" className="mushroom-ghost" />
        <path d="M707 215 C664 143 567 137 523 211 C559 224 595 248 623 287 C656 259 684 238 707 215 Z" className="mushroom-ghost" />
        <ellipse cx="500" cy="292" rx="94" ry="73" className="central-complex-ghost" />

        <g className="neural-tracts">
          {paths.map((d, i) => <path d={d} key={i} className={dopamine > 0 && i >= 5 ? 'reward-tract' : ''} />)}
        </g>

        {nodes.map((node) => {
          const x = node.x * 1000
          const y = node.y * 560
          const strong = node.activity > 0.57
          const dan = node.region === 'dan'
          return (
            <circle
              key={node.id}
              cx={x}
              cy={y}
              r={1.7 + node.activity * 4.7}
              className={`brain-neuron r-${node.region} ${strong ? 'firing' : ''} ${dan && dopamine > 0 ? 'dan-burst' : ''}`}
              style={{ opacity: 0.16 + node.activity * 0.84 }}
              filter={strong ? 'url(#neuralGlow)' : undefined}
            >
              <title>{`${node.cell_type} · ${node.neurotransmitter} · ${node.membrane_potential} mV`}</title>
            </circle>
          )
        })}
      </svg>
      <div className="brain-overlay top-left"><span>DISPLAYED NEURONS</span><b>{nodes.length}</b></div>
      <div className="brain-overlay top-right"><span>ACTIVE &gt; 0.55</span><b>{activeCount}</b></div>
      <div className="brain-regions">
        <span>OPTIC LOBE</span><span>MUSHROOM BODY</span><span>CENTRAL COMPLEX</span><span>DAN / MBON</span>
      </div>
    </div>
  )
}

function AccuracyChart({ history }: { history: HistoryPoint[] }) {
  const points = useMemo(() => history.map((p, i) => {
    const x = (i / Math.max(history.length - 1, 1)) * 100
    const y = 96 - p.accuracy * 90
    return `${x},${y}`
  }).join(' '), [history])
  return (
    <svg className="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="0" y1="51" x2="100" y2="51" className="chart-grid" />
      <line x1="0" y1="10" x2="100" y2="10" className="chart-grid" />
      {history.length > 1 && <polyline points={points} className="chart-line" />}
    </svg>
  )
}

function ChoiceCard({ value, index, state }: { value: number; index: number; state: SimState | null }) {
  const selected = state?.selected_index === index
  const expected = state?.correct === false && state.correct_answer === value
  const result = selected ? (state?.correct ? 'correct' : 'wrong') : expected ? 'expected' : ''
  return (
    <div className={`answer-card ${result}`}>
      <div className="answer-top"><span>{String.fromCharCode(65 + index)}</span><b>{value}</b></div>
      <DotCloud count={value} compact />
      <em>{selected ? (state?.correct ? 'SELECTED · CORRECT' : 'SELECTED · MISS') : expected ? 'EXPECTED' : 'OPTION'}</em>
    </div>
  )
}

function TrialView({ state }: { state: SimState | null }) {
  const a = state?.operand_a ?? 2
  const b = state?.operand_b ?? 1
  const task = state?.task ?? 'plus1'
  const choices = state?.choices ?? [3, 4]
  if (task === 'compare') {
    return (
      <div className="trial-content compare-trial">
        <div className="quantity-card"><span>A</span><DotCloud count={a} /><b>{a}</b></div>
        <div className="question-core"><small>SELECT THE LARGER QUANTITY</small><strong>どちらが多い？</strong></div>
        <div className="quantity-card"><span>B</span><DotCloud count={b} /><b>{b}</b></div>
        <div className="answer-row compare-answers">
          {choices.map((value, index) => <ChoiceCard key={`${value}-${index}`} value={value} index={index} state={state} />)}
        </div>
      </div>
    )
  }
  return (
    <div className="trial-content arithmetic-trial">
      <div className="equation-visual">
        <div className="quantity-card operand"><DotCloud count={a} /><b>{a}</b></div>
        <div className="operator-mark">{state?.operator ?? '+'}</div>
        <div className="quantity-card operand"><DotCloud count={b} /><b>{b}</b></div>
        <div className="operator-mark equals">= ?</div>
      </div>
      <div className="answer-row">
        {choices.map((value, index) => <ChoiceCard key={`${value}-${index}`} value={value} index={index} state={state} />)}
      </div>
    </div>
  )
}

export default function App() {
  const [state, setState] = useState<SimState | null>(null)
  const [connected, setConnected] = useState(false)
  const [auto, setAuto] = useState(false)
  const [speed, setSpeed] = useState(1)
  const [history, setHistory] = useState<HistoryPoint[]>([])
  const socketRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<number | null>(null)
  const lastTrialRef = useRef(-1)

  useEffect(() => {
    let disposed = false
    const connect = () => {
      const host = window.location.hostname || 'localhost'
      const socket = new WebSocket(`ws://${host}:8000/ws`)
      socketRef.current = socket
      socket.onopen = () => !disposed && setConnected(true)
      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as SimState
        setState(next)
        if (typeof next.auto === 'boolean') setAuto(next.auto)
        if (typeof next.speed === 'number') setSpeed(next.speed)
        if (next.trial !== lastTrialRef.current) {
          lastTrialRef.current = next.trial
          setHistory((old) => [...old.slice(-79), { trial: next.trial, accuracy: next.recent_accuracy, dopamine: next.dopamine }])
        }
      }
      socket.onclose = () => {
        if (disposed) return
        setConnected(false)
        reconnectTimer.current = window.setTimeout(connect, 1200)
      }
      socket.onerror = () => socket.close()
    }
    connect()
    return () => {
      disposed = true
      if (reconnectTimer.current !== null) window.clearTimeout(reconnectTimer.current)
      socketRef.current?.close()
    }
  }, [])

  const send = (payload: object) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) socketRef.current.send(JSON.stringify(payload))
  }
  const setAutoMode = (value: boolean) => {
    setAuto(value)
    send({ type: 'set_auto', value })
  }
  const chooseTask = (task: string) => {
    setAuto(false)
    setHistory([])
    lastTrialRef.current = -1
    send({ type: 'set_auto', value: false })
    send({ type: 'set_task', value: task })
  }

  const tasks = state?.available_tasks ?? FALLBACK_TASKS
  const abilityEntries = Object.entries(state?.abilities ?? {})

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">DROSOPHILA NEURAL LEARNING SANDBOX</div>
          <h1>FlyBrain <span>Arithmetic Lab</span></h1>
          <p className="subtitle">報酬学習を、ハエの行動と神経活動を同時に見ながら観察する。</p>
        </div>
        <div className="status-stack">
          <div className={`connection-pill ${connected ? 'online' : 'offline'}`}><i />{connected ? 'SIMULATION ONLINE' : 'BACKEND OFFLINE'}</div>
          <div className="model-pill">FUNCTIONAL PROXY · FLYWIRE-READY</div>
        </div>
      </header>

      <section className="task-ribbon panel">
        <div className="ribbon-copy"><span>EXPERIMENT</span><b>学習させる課題を選択</b></div>
        <div className="task-tabs">
          {tasks.map((task) => (
            <button key={task.id} className={state?.task === task.id ? 'active' : ''} onClick={() => chooseTask(task.id)} disabled={!connected}>
              <strong>{task.short}</strong><span>{task.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="hero-grid">
        <article className="panel specimen-panel">
          <div className="panel-heading"><span>01 / SPECIMEN</span><b>{state?.dopamine ? 'REWARD EVENT' : 'LIVE SUBJECT'}</b></div>
          <RealisticFly state={state} />
        </article>
        <article className="panel brain-panel">
          <div className="panel-heading"><span>02 / BRAIN ACTIVITY</span><b>{state?.simulated_neurons ?? 0} DISPLAY NODES</b></div>
          <BrainMap nodes={state?.nodes ?? []} dopamine={state?.dopamine ?? 0} />
          <div className="science-note"><b>現在:</b> 実コネクトームそのものではなく機能縮約モデル。表示/APIはFlyWireデータへ差し替えられる構造。</div>
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel trial-panel">
          <div className="panel-heading"><span>03 / CURRENT TRIAL</span><b>{state?.task_label ?? '+1'}</b></div>
          <TrialView state={state} />
        </article>

        <article className="panel telemetry-panel">
          <div className="panel-heading"><span>04 / TELEMETRY</span><b>LIVE</b></div>
          <div className="metric-grid">
            <div><span>TRIAL</span><strong>{String(state?.trial ?? 0).padStart(5, '0')}</strong></div>
            <div><span>RECENT ACC.</span><strong>{((state?.recent_accuracy ?? 0) * 100).toFixed(1)}%</strong></div>
            <div className={(state?.dopamine ?? 0) > 0 ? 'hot' : ''}><span>DOPAMINE</span><strong>{(state?.dopamine ?? 0).toFixed(2)}</strong></div>
            <div><span>Δ WEIGHT</span><strong>{(state?.weight_change ?? 0).toFixed(4)}</strong></div>
          </div>
          <div className="chart-block"><div><span>LEARNING TRACE</span><b>last 80 trials</b></div><AccuracyChart history={history} /></div>
          <div className="event-strip">
            <span>視覚入力</span><i /> <span>中枢処理</span><i /> <span>MBON</span><i /> <span>選択</span><i /> <span className={(state?.dopamine ?? 0) > 0 ? 'reward-text' : ''}>DAN報酬</span>
          </div>
        </article>
      </section>

      <section className="panel controls-panel">
        <div className="control-actions">
          <button className="primary-button" onClick={() => send({ type: 'step' })} disabled={!connected || auto}>RUN 1 TRIAL</button>
          <button className={auto ? 'stop-button' : 'secondary-button'} onClick={() => setAutoMode(!auto)} disabled={!connected}>{auto ? 'STOP TRAINING' : 'AUTO TRAIN'}</button>
          <button className="ghost-button" onClick={() => { setHistory([]); lastTrialRef.current = -1; send({ type: 'reset' }) }} disabled={!connected}>RESET BRAIN</button>
        </div>
        <div className="speed-control"><label>SPEED</label><div>{[0.5, 1, 5, 10, 20].map((v) => <button key={v} className={speed === v ? 'active' : ''} onClick={() => { setSpeed(v); send({ type: 'set_speed', value: v }) }}>{v}×</button>)}</div></div>
        <label className="slider-control">LEARNING RATE <b>{(state?.learning_rate ?? 0.16).toFixed(2)}</b><input type="range" min="0" max="0.6" step="0.01" value={state?.learning_rate ?? 0.16} onChange={(e) => send({ type: 'set_learning_rate', value: Number(e.target.value) })} /></label>
        <label className="slider-control">NEURAL NOISE <b>{(state?.noise ?? 0.18).toFixed(2)}</b><input type="range" min="0" max="0.7" step="0.01" value={state?.noise ?? 0.18} onChange={(e) => send({ type: 'set_noise', value: Number(e.target.value) })} /></label>
      </section>

      <section className="panel ability-panel">
        <div className="panel-heading"><span>05 / LEARNED ABILITIES</span><b>FLY #001</b></div>
        <div className="ability-grid">
          {(abilityEntries.length ? abilityEntries : FALLBACK_TASKS.map((t) => [t.id, { label: t.label, trials: 0, accuracy: 0 } as Ability] as [string, Ability])).map(([id, ability]) => (
            <div key={id} className={state?.task === id ? 'ability active' : 'ability'}>
              <div><span>{ability.label}</span><b>{ability.trials} trials</b></div>
              <strong>{ability.trials ? `${(ability.accuracy * 100).toFixed(1)}%` : 'UNTRAINED'}</strong>
              <div className="ability-bar"><i style={{ width: `${ability.accuracy * 100}%` }} /></div>
            </div>
          ))}
        </div>
      </section>

      <footer><span>FlyBrain Arithmetic Lab v0.2</span><span>Visual realism ≠ full biological fidelity · next target: FlyWire connectome adapter</span></footer>
    </main>
  )
}
