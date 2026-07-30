import { Application, Assets, Container, Graphics, Sprite, Text, Texture } from 'pixi.js'
import gsap from 'gsap'
import {
  ASSET,
  CAMERA_FOCUS_X,
  CHICKEN_DISPLAY,
  DIFFICULTIES,
  VEHICLE_FACE_DOWN,
  VEHICLE_TRAFFIC_POOL,
  VISIBLE_LANE_SLOTS,
  type DifficultyId,
  type VehicleKind,
} from '../constants/gameConfig'
import type { StepResult } from '../services/chickenRoadGameService'

export type SceneOptions = {
  width: number
  height: number
  canvas: HTMLCanvasElement
  difficulty?: DifficultyId
  laneCount?: number
  multipliers?: number[]
}

type Traffic = { sprite: Sprite; lane: number; direction: 1 | -1; speed: number }

export class ChickenRoadScene {
  readonly app: Application
  private world = new Container()
  private trafficLayer = new Container()
  private actorLayer = new Container()
  private chicken = new Sprite(Texture.WHITE)
  private shadow = new Graphics()
  private traffic: Traffic[] = []
  private width: number
  private height: number
  private difficulty: DifficultyId = 'medium'
  private laneCount = 7
  private multipliers: number[] = []
  private laneWidth = 0
  private roadLeft = 78
  private roadRight = 0
  private worldWidth = 0
  private cameraX = 0
  private currentStep = 0
  private spawnElapsed = 0
  private paused = false
  private moving = false
  private destroyed = false
  private cameraTween: gsap.core.Tween | null = null

  private constructor(app: Application, width: number, height: number) {
    this.app = app
    this.width = width
    this.height = height
  }

  static async create(options: SceneOptions) {
    const app = new Application()
    await app.init({
      canvas: options.canvas,
      width: options.width,
      height: options.height,
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(2, window.devicePixelRatio || 1),
      autoDensity: true,
    })
    const scene = new ChickenRoadScene(app, options.width, options.height)
    scene.difficulty = options.difficulty ?? 'medium'
    scene.laneCount = options.laneCount ?? DIFFICULTIES[scene.difficulty].laneCount
    scene.multipliers = options.multipliers ?? [...DIFFICULTIES[scene.difficulty].multipliers]
    await scene.build()
    return scene
  }

  private async build() {
    try {
      await Assets.load([
        ASSET.chicken('idle'),
        ASSET.chicken('jump'),
        ASSET.chicken('hit'),
        ...VEHICLE_TRAFFIC_POOL.map((kind) => ASSET.vehicle(kind)),
      ])
    } catch {
      // White texture fallbacks keep the scene usable when an asset is absent.
    }
    this.app.stage.addChild(this.world)
    this.rebuildWorld()
    this.app.ticker.add(this.tick)
  }

  private texture(url: string) {
    return (Assets.get(url) as Texture | undefined) ?? Texture.WHITE
  }

  private rebuildWorld() {
    this.world.removeChildren()
    this.traffic = []
    this.roadLeft = 78
    this.laneWidth = Math.max(90, (this.width - this.roadLeft - 44) / VISIBLE_LANE_SLOTS)
    this.roadRight = this.roadLeft + this.laneCount * this.laneWidth
    this.worldWidth = this.roadRight + 120

    const background = new Graphics()
    background.rect(0, 0, this.worldWidth, this.height).fill(0x3b8a45)
    background.rect(0, 24, this.roadLeft, this.height - 48).fill(0x9aa1a5)
    background
      .rect(this.roadLeft, 24, this.roadRight - this.roadLeft, this.height - 48)
      .fill(0x4b5158)
    background.rect(this.roadRight, 24, 120, this.height - 48).fill(0xb3b8ba)
    this.world.addChild(background)

    for (let i = 0; i <= this.laneCount; i += 1) {
      const x = this.roadLeft + i * this.laneWidth
      const line = new Graphics()
      line.rect(x - 2, 30, 4, this.height - 60).fill({ color: 0xffffff, alpha: 0.25 })
      this.world.addChild(line)
    }

    for (let i = 0; i < this.laneCount; i += 1) {
      const marker = new Graphics()
      marker.circle(0, 0, 24).fill(i === 0 ? 0xf2bf38 : 0x30353b)
      marker.x = this.laneX(i)
      marker.y = this.height * 0.53
      const label = new Text({
        text: `${(this.multipliers[i] ?? 1).toFixed(2)}x`,
        style: { fill: 0xffffff, fontSize: 11, fontWeight: '700' },
      })
      label.anchor.set(0.5)
      marker.addChild(label)
      this.world.addChild(marker)
    }

    this.trafficLayer = new Container()
    this.actorLayer = new Container()
    this.world.addChild(this.trafficLayer, this.actorLayer)
    this.shadow = new Graphics()
    this.shadow.ellipse(0, 0, 31, 9).fill({ color: 0x000000, alpha: 0.28 })
    this.chicken = new Sprite(this.texture(ASSET.chicken('idle')))
    this.chicken.anchor.set(0.5, 0.86)
    this.chicken.width = CHICKEN_DISPLAY
    this.chicken.height = CHICKEN_DISPLAY
    this.actorLayer.addChild(this.shadow, this.chicken)
    this.syncToStep(this.currentStep)
  }

  private laneX(index: number) {
    return this.roadLeft + (index + 0.5) * this.laneWidth
  }

  private positionForStep(step: number) {
    return step <= 0 ? this.roadLeft * 0.48 : this.laneX(Math.min(step - 1, this.laneCount - 1))
  }

  private follow(x: number, animate = true) {
    const target = Math.max(0, Math.min(this.worldWidth - this.width, x - this.width * CAMERA_FOCUS_X))
    this.cameraTween?.kill()
    if (!animate) {
      this.cameraX = target
      this.world.x = -target
      return
    }
    this.cameraTween = gsap.to(this, {
      cameraX: target,
      duration: 0.45,
      ease: 'power2.inOut',
      onUpdate: () => {
        this.world.x = -this.cameraX
      },
    })
  }

  setRoundConfig(options: { difficulty: DifficultyId; laneCount: number; multipliers: number[] }) {
    this.difficulty = options.difficulty
    this.laneCount = options.laneCount
    this.multipliers = [...options.multipliers]
    this.currentStep = 0
    this.cameraX = 0
    this.rebuildWorld()
  }

  setCurrentStep(step: number) {
    this.currentStep = Math.max(0, Math.min(step, this.laneCount))
  }

  syncToStep(step: number) {
    if (this.moving) return
    this.setCurrentStep(step)
    const x = this.positionForStep(this.currentStep)
    this.chicken.x = x
    this.chicken.y = this.height * 0.6
    this.shadow.x = x
    this.shadow.y = this.chicken.y + 4
    this.follow(x, false)
  }

  async playStepResult(result: StepResult) {
    this.moving = true
    const x = this.laneX(result.stepIndex)
    this.chicken.texture = this.texture(ASSET.chicken('jump'))
    await gsap.to(this.chicken, { x, y: this.height * 0.48, duration: 0.32, ease: 'power2.out' })
    this.follow(x)
    await gsap.to(this.chicken, { y: this.height * 0.6, duration: 0.32, ease: 'power2.in' })
    this.shadow.x = x
    if (result.collided || !result.safe) {
      this.chicken.texture = this.texture(ASSET.chicken('hit'))
      await this.impact(result.vehicleKind)
    } else {
      this.currentStep = result.stepIndex + 1
      this.chicken.texture = this.texture(ASSET.chicken('idle'))
    }
    this.moving = false
  }

  private async impact(kind: VehicleKind = VEHICLE_TRAFFIC_POOL[0]!) {
    const sprite = new Sprite(this.texture(ASSET.vehicle(kind)))
    sprite.anchor.set(0.5)
    sprite.width = 55
    sprite.height = 90
    sprite.x = this.chicken.x
    sprite.y = -60
    this.trafficLayer.addChild(sprite)
    await gsap.to(sprite, { y: this.chicken.y, duration: 0.38, ease: 'power3.in' })
    await gsap.to(this.chicken, { rotation: 1.5, x: '+=24', duration: 0.28 })
    sprite.destroy()
  }

  async celebrate() {
    await gsap.to(this.chicken, {
      y: this.height * 0.46,
      duration: 0.22,
      yoyo: true,
      repeat: 3,
    })
  }

  setTrafficPaused(paused: boolean) {
    this.paused = paused
  }

  private tick = () => {
    if (this.destroyed || this.paused) return
    const dt = this.app.ticker.deltaMS / 1000
    this.spawnElapsed += dt
    const config = DIFFICULTIES[this.difficulty]
    if (this.spawnElapsed >= config.spawnInterval && this.traffic.length < this.laneCount * 2) {
      this.spawnElapsed = 0
      const lane = Math.floor(Math.random() * this.laneCount)
      const kind = VEHICLE_TRAFFIC_POOL[Math.floor(Math.random() * VEHICLE_TRAFFIC_POOL.length)]!
      const direction: 1 | -1 = lane % 2 ? -1 : 1
      const sprite = new Sprite(this.texture(ASSET.vehicle(kind)))
      sprite.anchor.set(0.5)
      sprite.width = 50
      sprite.height = 82
      sprite.x = this.laneX(lane)
      sprite.y = direction > 0 ? -60 : this.height + 60
      sprite.rotation = VEHICLE_FACE_DOWN[kind] === (direction > 0) ? 0 : Math.PI
      this.trafficLayer.addChild(sprite)
      this.traffic.push({ sprite, lane, direction, speed: 100 * config.vehicleSpeed })
    }
    this.traffic.forEach((actor) => {
      actor.sprite.y += actor.direction * actor.speed * dt
    })
    this.traffic = this.traffic.filter((actor) => {
      const visible = actor.sprite.y > -100 && actor.sprite.y < this.height + 100
      if (!visible) actor.sprite.destroy()
      return visible
    })
  }

  resize(width: number, height: number) {
    this.width = width
    this.height = height
    this.app.renderer.resize(width, height)
    this.rebuildWorld()
  }

  destroy() {
    if (this.destroyed) return
    this.destroyed = true
    this.cameraTween?.kill()
    this.app.ticker.remove(this.tick)
    this.app.destroy(true, { children: true, texture: false })
  }
}
