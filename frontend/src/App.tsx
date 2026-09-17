import { useEffect, useMemo, useRef, useState } from 'react'

type NodeState = {
  id: string
  region: 'visual' | 'quantity' | 'kenyon' | 'mbon' | 'dan' | 'output'
  activity: number
  x: number
  y: number
  index: number
}

type SimState = {
  type: string
  model: string
  trial: number
  accuracy: number
  recent_accuracy: number
  learning_rate: number
  noise: number
  dopamine: number
  reward: number
  correct: boolean | null
  input_count: number
  choices: number[]
  correct_answer: number
  selected_answer: number | null
  selected_index: number | null
  weight_change: number
  nodes: NodeState[]
  association: number[][]
  auto?: boolean
  speed?: number
}

type HistoryPoint = {
  trial: number
  accuracy: number
  dopamine: number
  correct: boolean | null
}

const regionCenters = {
  visual: [100, 260],
  quantity: [280, 260],
  kenyon: [480, 260],
  mbon: [670, 215],
  dan: [670, 375],
  output: [870, 260],
} as const

const regionLabels: Record<NodeState['region'], string> = {
  visual: 'VISUAL',
  quantity: 'QUANTITY',
  kenyon: 'KENYON CELLS',
  mbon: 'MBON',
  dan: 'DAN / DOPAMINE',
  output: 'DECISION',
}

function DotPattern({ count }: { count: number }) {
  const dots = Array.from({ length: count })
  return (
    <div className="dot-pattern" aria-label={`${count} dots`}>
      {dots.map((_, i) => (
        <span
          key={i}
          className="stimulus-dot"
          style={{
            transform: `translate(${((i * 31) % 67) - 33}px, ${((i * 47) % 53) - 26}px)`,
          }}
        />
      ))}
    </div>
  )
}

function Fly({ state }: { state: SimState | null }) {
  const dopamine = state?.dopamine ?? 0
  const thinking = state !== null && state.trial > 0 && state.selected_answer !== null
  const classNames = [
    'fly-stage',
    thinking ? 'is-thinking' : '',
    dopamine > 0 ? 'is-rewarded' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className={classNames}>
      <div className="scan-ring" />
      <div className="fly-shadow" />
      <div className="fly">
        <div className="wing wing-left" />
        <div className="wing wing-right" />
        <div className="fly-body" />
        <div className="fly-head">
          <div className="eye eye-left" />
          <div className="eye eye-right" />
          <div className="antenna antenna-left" />
          <div className="antenna antenna-right" />
        </div>
        <div className="leg leg-1" />
        <div className="leg leg-2" />
        <div className="leg leg-3" />
        <div className="leg leg-4" />
      </div>
      {dopamine > 0 && <div className="reward-burst">DOPAMINE +{dopamine.toFixed(2)}</div>}
      <div className="subject-label">
        <span>SUBJECT</span>
        <strong>FLY #001</strong>
      </div>
    </div>
  )
}

function BrainMap({ nodes, dopamine }: { nodes: NodeState[]; dopamine: number }) {
  const connections: [keyof typeof regionCenters, keyof typeof regionCenters][] = [
    ['visual', 'quantity'],
    ['quantity', 'kenyon'],
    ['kenyon', 'mbon'],
    ['mbon', 'output'],
    ['dan', 'kenyon'],
    ['dan', 'mbon'],
  ]

  return (
    <div className="brain-panel-inner">
      <svg viewBox="0 0 1000 520" className="brain-svg" role="img" aria-label="Neural activity map">
        <defs>
          <filter id="glow">
            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
            <feMerge>
              <feMergeNode in="coloredBlur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L7,3 z" className="arrow-head" />
          </marker>
        </defs>

        <path
          d="M70 260 C125 95, 330 70, 505 105 C700 143, 890 113, 930 260 C890 407, 700 377, 505 415 C330 450, 125 425, 70 260 Z"
          className="brain-outline"
        />

        {connections.map(([from, to]) => {
          const [x1, y1] = regionCenters[from]
          const [x2, y2] = regionCenters[to]
          const isDopamine = from === 'dan'
          return (
            <line
              key={`${from}-${to}`}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              markerEnd="url(#arrow)"
              className={`brain-connection ${isDopamine && dopamine > 0 ? 'dopamine-path' : ''}`}
            />
          )
        })}

        {Object.entries(regionCenters).map(([region, [x, y]]) => (
          <g key={region}>
            <circle cx={x} cy={y} r="58" className={`region-halo region-${region}`} />
            <text x={x} y={y - 73} textAnchor="middle" className="region-label">
              {regionLabels[region as NodeState['region']]}
            </text>
          </g>
        ))}

        {nodes.map((node) => {
          const x = node.x * 1000
          const y = node.y * 520
          const radius = 3.5 + node.activity * 7
          return (
            <circle
              key={node.id}
              cx={x}
              cy={y}
              r={radius}
              className={`neuron neuron-${node.region}`}
              style={{ opacity: 0.22 + node.activity * 0.78 }}
              filter={node.activity > 0.62 ? 'url(#glow)' : undefined}
            />
          )
        })}
      </svg>
      <div className="brain-legend">
        <span><i className="legend-dot visual" /> sensory</span>
        <span><i className="legend-dot kenyon" /> memory</span>
        <span><i className="legend-dot dan" /> dopamine</span>
        <span><i className="legend-dot output" /> decision</span>
      </div>
    </div>
  )
}

function AccuracyChart({ history }: { history: HistoryPoint[] }) {
  const points = useMemo(() => {
    if (history.length < 2) return ''
    return history
      .map((point, index) => {
        const x = (index / Math.max(history.length - 1, 1)) * 100
        const y = 96 - point.accuracy * 90
        return `${x},${y}`
      })
      .join(' ')
  }, [history])

  return (
    <svg className="mini-chart" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line x1="0" y1="50" x2="100" y2="50" className="chart-grid" />
      <line x1="0" y1="10" x2="100" y2="10" className="chart-grid" />
      {points && <polyline points={points} className="chart-line" />}
    </svg>
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

      socket.onopen = () => {
        if (!disposed) setConnected(true)
      }

      socket.onmessage = (event) => {
        const next = JSON.parse(event.data) as SimState
        setState(next)
        if (typeof next.auto === 'boolean') setAuto(next.auto)
        if (typeof next.speed === 'number') setSpeed(next.speed)

        if (next.trial !== lastTrialRef.current) {
          lastTrialRef.current = next.trial
          setHistory((old) => [
            ...old.slice(-59),
            {
              trial: next.trial,
              accuracy: next.recent_accuracy,
              dopamine: next.dopamine,
              correct: next.correct,
            },
          ])
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
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify(payload))
    }
  }

  const setAutoMode = (value: boolean) => {
    setAuto(value)
    send({ type: 'set_auto', value })
  }

  const updateSpeed = (value: number) => {
    setSpeed(value)
    send({ type: 'set_speed', value })
  }

  const accuracy = (state?.recent_accuracy ?? 0) * 100
  const dopamine = state?.dopamine ?? 0

  return (
    <main className="app-shell">
      <header className="topbar">
        <div>
          <div className="eyebrow">BIOLOGICAL COMPUTATION SANDBOX</div>
          <h1>FlyBrain <span>Arithmetic Lab</span></h1>
        </div>
        <div className={`connection-pill ${connected ? 'online' : 'offline'}`}>
          <i /> {connected ? 'SIMULATION ONLINE' : 'BACKEND OFFLINE'}
        </div>
      </header>

      <section className="hero-grid">
        <article className="panel fly-panel">
          <div className="panel-heading">
            <span>01 / SUBJECT</span>
            <b>{dopamine > 0 ? 'REWARD EVENT' : 'OBSERVING'}</b>
          </div>
          <Fly state={state} />
        </article>

        <article className="panel brain-panel">
          <div className="panel-heading">
            <span>02 / NEURAL STATE</span>
            <b>{state?.model ?? 'WAITING FOR MODEL'}</b>
          </div>
          <BrainMap nodes={state?.nodes ?? []} dopamine={dopamine} />
        </article>
      </section>

      <section className="experiment-grid">
        <article className="panel task-panel">
          <div className="panel-heading">
            <span>03 / CURRENT TRIAL</span>
            <b>RULE: +1</b>
          </div>
          <div className="task-stage">
            <div className="stimulus-card">
              <span className="tiny-label">INPUT QUANTITY</span>
              <DotPattern count={state?.input_count ?? 2} />
              <strong>{state?.input_count ?? 2}</strong>
            </div>
            <div className="operator">+1</div>
            <div className="choices">
              {(state?.choices ?? [3, 4]).map((choice, index) => {
                const selected = state?.selected_index === index
                const isCorrectChoice = state?.correct_answer === choice
                const resultClass = selected
                  ? state?.correct
                    ? 'selected-correct'
                    : 'selected-wrong'
                  : ''
                return (
                  <div key={`${choice}-${index}`} className={`choice-card ${resultClass}`}>
                    <span>{String.fromCharCode(65 + index)}</span>
                    <DotPattern count={choice} />
                    <strong>{choice}</strong>
                    {selected && <em>{state?.correct ? 'SELECTED / CORRECT' : 'SELECTED / MISS'}</em>}
                    {!selected && isCorrectChoice && state?.correct === false && <em>EXPECTED</em>}
                  </div>
                )
              })}
            </div>
          </div>
        </article>

        <article className="panel metrics-panel">
          <div className="panel-heading">
            <span>04 / TELEMETRY</span>
            <b>LIVE</b>
          </div>
          <div className="metric-grid">
            <div className="metric-card">
              <span>TRIAL</span>
              <strong>{String(state?.trial ?? 0).padStart(5, '0')}</strong>
            </div>
            <div className="metric-card">
              <span>RECENT ACCURACY</span>
              <strong>{accuracy.toFixed(1)}%</strong>
            </div>
            <div className={`metric-card dopamine-card ${dopamine > 0 ? 'bursting' : ''}`}>
              <span>DOPAMINE</span>
              <strong>{dopamine.toFixed(2)}</strong>
            </div>
            <div className="metric-card">
              <span>Δ WEIGHT</span>
              <strong>{state?.weight_change?.toFixed(4) ?? '0.0000'}</strong>
            </div>
          </div>
          <div className="chart-wrap">
            <div className="chart-title">
              <span>LEARNING TRACE</span>
              <b>last 60 trials</b>
            </div>
            <AccuracyChart history={history} />
          </div>
        </article>
      </section>

      <section className="panel control-panel">
        <div className="controls-left">
          <button className="primary-button" onClick={() => send({ type: 'step' })} disabled={!connected || auto}>
            RUN 1 TRIAL
          </button>
          <button className={auto ? 'danger-button' : 'secondary-button'} onClick={() => setAutoMode(!auto)} disabled={!connected}>
            {auto ? 'STOP TRAINING' : 'AUTO TRAIN'}
          </button>
          <button className="ghost-button" onClick={() => { setHistory([]); lastTrialRef.current = -1; send({ type: 'reset' }) }} disabled={!connected}>
            RESET BRAIN
          </button>
        </div>

        <div className="control-field speed-field">
          <label>SPEED</label>
          <div className="speed-buttons">
            {[0.5, 1, 5, 10, 20].map((value) => (
              <button key={value} className={speed === value ? 'active' : ''} onClick={() => updateSpeed(value)}>
                {value}×
              </button>
            ))}
          </div>
        </div>

        <div className="control-field slider-field">
          <label>
            LEARNING RATE <b>{(state?.learning_rate ?? 0.22).toFixed(2)}</b>
          </label>
          <input
            type="range"
            min="0"
            max="0.6"
            step="0.01"
            value={state?.learning_rate ?? 0.22}
            onChange={(event) => send({ type: 'set_learning_rate', value: Number(event.target.value) })}
          />
        </div>

        <div className="control-field slider-field">
          <label>
            NEURAL NOISE <b>{(state?.noise ?? 0.22).toFixed(2)}</b>
          </label>
          <input
            type="range"
            min="0"
            max="0.8"
            step="0.01"
            value={state?.noise ?? 0.22}
            onChange={(event) => send({ type: 'set_noise', value: Number(event.target.value) })}
          />
        </div>
      </section>

      <footer>
        <span>FLYBRAIN ARITHMETIC LAB / MVP 0.1</span>
        <span>Functional LIF prototype — not a full biological FlyWire simulation</span>
      </footer>
    </main>
  )
}
