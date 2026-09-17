type TaskId = 'compare' | 'plus1' | 'minus1' | 'addition' | 'subtraction'

type NodeTemplate = {
  id: string
  region: string
  cell_type: string
  neurotransmitter: string
  x: number
  y: number
  index: number
}

type NodeState = NodeTemplate & {
  activity: number
  membrane_potential: number
}

type TrialResult = {
  task: TaskId
  operand_a: number
  operand_b: number
  operator: string
  choices: number[]
  correct_answer: number
  selected_answer: number
  selected_index: number
  correct: boolean
  dopamine: number
  reward: number
}

const TASKS: Record<TaskId, { label: string; short: string }> = {
  compare: { label: '数量比較', short: 'MORE?' },
  plus1: { label: '+1', short: '+1' },
  minus1: { label: '-1', short: '-1' },
  addition: { label: '加算', short: '+' },
  subtraction: { label: '減算', short: '-' },
}

const REGION_SPECS: Array<[string, number, number, number, number, number, string, string]> = [
  ['optic_left', 0.12, 0.51, 0.075, 0.19, 36, 'Visual projection', 'acetylcholine'],
  ['optic_right', 0.88, 0.51, 0.075, 0.19, 36, 'Visual projection', 'acetylcholine'],
  ['antennal', 0.50, 0.70, 0.10, 0.06, 22, 'Sensory interneuron', 'acetylcholine'],
  ['mushroom_left', 0.36, 0.35, 0.14, 0.08, 44, 'Kenyon cell', 'acetylcholine'],
  ['mushroom_right', 0.64, 0.35, 0.14, 0.08, 44, 'Kenyon cell', 'acetylcholine'],
  ['central', 0.50, 0.52, 0.16, 0.11, 42, 'Central complex neuron', 'acetylcholine'],
  ['mbon', 0.50, 0.40, 0.11, 0.055, 20, 'MBON', 'glutamate'],
  ['dan', 0.50, 0.22, 0.12, 0.05, 18, 'Dopaminergic neuron', 'dopamine'],
  ['output', 0.50, 0.82, 0.12, 0.055, 22, 'Descending neuron', 'acetylcholine'],
]

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))
const round = (value: number, digits = 4) => Number(value.toFixed(digits))

function gaussian() {
  let u = 0
  let v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

class BrowserFlyBrainSimulation {
  private readonly answerMax = 8
  private readonly featureSize = 16
  private task: TaskId = 'plus1'
  private trial = 0
  private correctCount = 0
  private recent: boolean[] = []
  private learningRate = 0.16
  private noise = 0.18
  private exploration = 0.10
  private weights: Record<TaskId, number[][]>
  private eligibility: Record<TaskId, number[][]>
  private taskStats: Record<TaskId, { trial: number; correct: number; recent: boolean[] }>
  private nodeTemplates: NodeTemplate[]
  private lastNodes: NodeState[]
  private lastResult: TrialResult | null = null
  private lastWeightChange = 0

  constructor() {
    this.weights = this.makeMatrices(() => gaussian() * 0.045)
    this.eligibility = this.makeMatrices(() => 0)
    this.taskStats = this.makeStats()
    this.nodeTemplates = this.buildNodeTemplates()
    this.lastNodes = this.quietNodes()
  }

  private makeMatrices(value: () => number) {
    return Object.fromEntries(
      (Object.keys(TASKS) as TaskId[]).map((task) => [
        task,
        Array.from({ length: this.featureSize }, () => Array.from({ length: this.answerMax + 1 }, value)),
      ]),
    ) as Record<TaskId, number[][]>
  }

  private makeStats() {
    return Object.fromEntries(
      (Object.keys(TASKS) as TaskId[]).map((task) => [task, { trial: 0, correct: 0, recent: [] as boolean[] }]),
    ) as Record<TaskId, { trial: number; correct: number; recent: boolean[] }>
  }

  reset() {
    const task = this.task
    this.trial = 0
    this.correctCount = 0
    this.recent = []
    this.weights = this.makeMatrices(() => gaussian() * 0.045)
    this.eligibility = this.makeMatrices(() => 0)
    this.taskStats = this.makeStats()
    this.task = task
    this.lastResult = null
    this.lastWeightChange = 0
    this.lastNodes = this.quietNodes()
  }

  setTask(value: string) {
    if (value in TASKS) {
      this.task = value as TaskId
      this.lastResult = null
      this.lastWeightChange = 0
      this.lastNodes = this.quietNodes()
    }
  }

  setLearningRate(value: number) {
    this.learningRate = clamp(value, 0, 0.6)
  }

  setNoise(value: number) {
    this.noise = clamp(value, 0, 1)
  }

  private buildNodeTemplates() {
    const nodes: NodeTemplate[] = []
    let index = 0
    for (const [region, cx, cy, sx, sy, count, cellType, neurotransmitter] of REGION_SPECS) {
      for (let i = 0; i < count; i += 1) {
        nodes.push({
          id: `${region}-${i}`,
          region,
          cell_type: cellType,
          neurotransmitter,
          x: round(clamp(cx + gaussian() * sx * 0.42, 0.025, 0.975)),
          y: round(clamp(cy + gaussian() * sy * 0.42, 0.05, 0.95)),
          index,
        })
        index += 1
      }
    }
    return nodes
  }

  private quietNodes(): NodeState[] {
    return this.nodeTemplates.map((node) => ({ ...node, activity: 0.03, membrane_potential: -65 }))
  }

  private makeProblem(): [number, number, string, number] {
    const int = (min: number, maxInclusive: number) => Math.floor(Math.random() * (maxInclusive - min + 1)) + min
    if (this.task === 'compare') {
      const a = int(1, 6)
      let b = int(1, 6)
      while (a === b) b = int(1, 6)
      return [a, b, 'MORE', Math.max(a, b)]
    }
    if (this.task === 'plus1') {
      const a = int(1, 6)
      return [a, 1, '+', a + 1]
    }
    if (this.task === 'minus1') {
      const a = int(2, 7)
      return [a, 1, '-', a - 1]
    }
    if (this.task === 'addition') {
      const a = int(1, 4)
      let b = int(1, 4)
      while (a + b > this.answerMax) b = int(1, 4)
      return [a, b, '+', a + b]
    }
    const a = int(2, 7)
    const b = int(1, a)
    return [a, b, '-', a - b]
  }

  private makeChoices(correct: number) {
    const candidates = Array.from({ length: this.answerMax + 1 }, (_, n) => n).filter((n) => n !== correct)
    candidates.sort((a, b) => Math.abs(a - correct) - Math.abs(b - correct))
    const pool = candidates.slice(0, 4)
    const wrong = pool[Math.floor(Math.random() * pool.length)]
    return Math.random() < 0.5 ? [correct, wrong] : [wrong, correct]
  }

  private features(a: number, b: number) {
    const f = Array(this.featureSize).fill(0) as number[]
    f[Math.min(Math.max(a, 1), 6) - 1] = 1
    if (b > 0) f[6 + Math.min(b, 6) - 1] = 1
    f[12] = a / 8
    f[13] = b / 8
    f[14] = a > b ? 1 : 0
    f[15] = 1
    return f
  }

  runTrial() {
    const [a, b, operator, correctAnswer] = this.makeProblem()
    const choices = this.task === 'compare' ? [a, b] : this.makeChoices(correctAnswer)
    const features = this.features(a, b)
    const taskWeights = this.weights[this.task]
    const scores = choices.map((choice) => features.reduce((sum, feature, i) => sum + feature * taskWeights[i][choice], 0) + gaussian() * this.noise)

    const selectedIndex = Math.random() < this.exploration ? Math.floor(Math.random() * 2) : scores[0] >= scores[1] ? 0 : 1
    const selectedAnswer = choices[selectedIndex]
    const correct = selectedAnswer === correctAnswer
    const dopamine = correct ? 1 : 0
    const reward = dopamine

    const eligibility = this.eligibility[this.task]
    const decay = Math.exp(-1 / 4)
    for (let i = 0; i < this.featureSize; i += 1) {
      for (let j = 0; j <= this.answerMax; j += 1) eligibility[i][j] *= decay
      eligibility[i][selectedAnswer] += features[i]
    }

    const before = taskWeights.reduce((sum, row) => sum + row[selectedAnswer], 0)
    if (dopamine > 0) {
      for (let i = 0; i < this.featureSize; i += 1) {
        for (let j = 0; j <= this.answerMax; j += 1) {
          taskWeights[i][j] = clamp(taskWeights[i][j] + this.learningRate * dopamine * eligibility[i][j], -1.5, 3)
        }
      }
    }
    const after = taskWeights.reduce((sum, row) => sum + row[selectedAnswer], 0)
    this.lastWeightChange = (after - before) / this.featureSize

    this.trial += 1
    this.correctCount += correct ? 1 : 0
    this.recent = [...this.recent, correct].slice(-100)
    const stats = this.taskStats[this.task]
    stats.trial += 1
    stats.correct += correct ? 1 : 0
    stats.recent = [...stats.recent, correct].slice(-100)

    this.lastResult = {
      task: this.task,
      operand_a: a,
      operand_b: b,
      operator,
      choices,
      correct_answer: correctAnswer,
      selected_answer: selectedAnswer,
      selected_index: selectedIndex,
      correct,
      dopamine,
      reward,
    }
    this.lastNodes = this.activeNodes(a, b, scores, dopamine, correct)
    return this.snapshot()
  }

  private activeNodes(a: number, b: number, scores: number[], dopamine: number, correct: boolean): NodeState[] {
    const taskDrive: Record<TaskId, number> = {
      compare: 0.74,
      plus1: 0.62,
      minus1: 0.65,
      addition: 0.82,
      subtraction: 0.84,
    }
    const drive: Record<string, number> = {
      optic_left: 0.54 + a / 16,
      optic_right: 0.54 + b / 16,
      antennal: 0.18,
      mushroom_left: taskDrive[this.task],
      mushroom_right: taskDrive[this.task] * 0.94,
      central: 0.58 + 0.18 * Math.min((a + b) / 10, 1),
      mbon: 0.48 + 0.20 * Number(correct),
      dan: 0.10 + dopamine * 0.95,
      output: 0.48 + 0.15 * Number(Math.max(...scores) > 0),
    }
    return this.nodeTemplates.map((node) => {
      const current = clamp(drive[node.region] + gaussian() * 0.16, 0, 1.35)
      const analog = 1 / (1 + Math.exp(-(current - 0.42) * 5))
      const spikeTerm = clamp((current - 0.35) / 0.9, 0, 1)
      const activity = clamp(0.62 * spikeTerm + 0.38 * analog, 0, 1)
      return {
        ...node,
        activity: round(activity),
        membrane_potential: round(-65 + activity * 12 - Math.random() * 3, 2),
      }
    })
  }

  snapshot() {
    const accuracy = this.trial ? this.correctCount / this.trial : 0
    const recentAccuracy = this.recent.length ? this.recent.filter(Boolean).length / this.recent.length : 0
    const abilities = Object.fromEntries((Object.keys(TASKS) as TaskId[]).map((task) => {
      const stats = this.taskStats[task]
      const acc = stats.recent.length ? stats.recent.filter(Boolean).length / stats.recent.length : 0
      return [task, { label: TASKS[task].label, trials: stats.trial, accuracy: round(acc) }]
    }))
    const result = this.lastResult
    return {
      type: 'state',
      model: 'browser-functional-lif-v2',
      connectome_mode: 'functional-proxy',
      flywire_ready: true,
      simulated_neurons: this.nodeTemplates.length,
      task: this.task,
      task_label: TASKS[this.task].label,
      available_tasks: (Object.keys(TASKS) as TaskId[]).map((id) => ({ id, ...TASKS[id] })),
      trial: this.trial,
      accuracy: round(accuracy),
      recent_accuracy: round(recentAccuracy),
      learning_rate: this.learningRate,
      noise: this.noise,
      dopamine: result?.dopamine ?? 0,
      reward: result?.reward ?? 0,
      correct: result?.correct ?? null,
      operand_a: result?.operand_a ?? 2,
      operand_b: result?.operand_b ?? 1,
      operator: result?.operator ?? '+',
      choices: result?.choices ?? [3, 4],
      correct_answer: result?.correct_answer ?? 3,
      selected_answer: result?.selected_answer ?? null,
      selected_index: result?.selected_index ?? null,
      weight_change: round(this.lastWeightChange, 6),
      nodes: this.lastNodes,
      abilities,
    }
  }
}

class BrowserSimulationSocket {
  static readonly CONNECTING = 0
  static readonly OPEN = 1
  static readonly CLOSING = 2
  static readonly CLOSED = 3

  readonly url: string
  readyState = BrowserSimulationSocket.CONNECTING
  bufferedAmount = 0
  extensions = ''
  protocol = ''
  binaryType: BinaryType = 'blob'
  onopen: ((this: WebSocket, ev: Event) => unknown) | null = null
  onclose: ((this: WebSocket, ev: CloseEvent) => unknown) | null = null
  onerror: ((this: WebSocket, ev: Event) => unknown) | null = null
  onmessage: ((this: WebSocket, ev: MessageEvent) => unknown) | null = null
  private simulation = new BrowserFlyBrainSimulation()
  private auto = false
  private speed = 1
  private timer: number | null = null

  constructor(url: string | URL) {
    this.url = String(url)
    window.setTimeout(() => {
      this.readyState = BrowserSimulationSocket.OPEN
      this.onopen?.call(this as unknown as WebSocket, new Event('open'))
      this.emit(this.simulation.snapshot())
    }, 0)
  }

  private emit(state: ReturnType<BrowserFlyBrainSimulation['snapshot']>) {
    const data = JSON.stringify({ ...state, auto: this.auto, speed: this.speed })
    this.onmessage?.call(this as unknown as WebSocket, { data } as MessageEvent)
  }

  private restartAuto() {
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    if (!this.auto || this.readyState !== BrowserSimulationSocket.OPEN) return
    const delay = Math.max(45, 900 / this.speed)
    this.timer = window.setInterval(() => this.emit(this.simulation.runTrial()), delay)
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView) {
    if (typeof data !== 'string') return
    const message = JSON.parse(data) as { type?: string; value?: unknown }
    switch (message.type) {
      case 'step':
        this.emit(this.simulation.runTrial())
        break
      case 'set_auto':
        this.auto = Boolean(message.value)
        this.restartAuto()
        this.emit(this.simulation.snapshot())
        break
      case 'set_speed':
        this.speed = Number(message.value) || 1
        this.restartAuto()
        this.emit(this.simulation.snapshot())
        break
      case 'set_task':
        this.simulation.setTask(String(message.value ?? 'plus1'))
        this.emit(this.simulation.snapshot())
        break
      case 'reset':
        this.simulation.reset()
        this.emit(this.simulation.snapshot())
        break
      case 'set_learning_rate':
        this.simulation.setLearningRate(Number(message.value))
        this.emit(this.simulation.snapshot())
        break
      case 'set_noise':
        this.simulation.setNoise(Number(message.value))
        this.emit(this.simulation.snapshot())
        break
      default:
        break
    }
  }

  close() {
    this.auto = false
    if (this.timer !== null) window.clearInterval(this.timer)
    this.timer = null
    this.readyState = BrowserSimulationSocket.CLOSED
    this.onclose?.call(this as unknown as WebSocket, {} as CloseEvent)
  }

  addEventListener() {}
  removeEventListener() {}
  dispatchEvent() { return true }
}

export function installBrowserSimulationSocket() {
  window.WebSocket = BrowserSimulationSocket as unknown as typeof WebSocket
}
