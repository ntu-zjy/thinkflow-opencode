import React, { useMemo } from "react"
import {
  AbsoluteFill,
  Audio,
  Sequence,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Easing,
  staticFile,
} from "remotion"

const WIDTH = 1080
const HEIGHT = 1920

// ========== 工具函数 ==========
function useSlideProgress(durationInFrames: number) {
  const frame = useCurrentFrame()
  const progress = Math.min(frame / durationInFrames, 1)
  return { frame, progress }
}

// ========== 分镜1：开场标题 ==========
function Slide1({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const titleY = interpolate(frame, [0, 40], [200, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })
  const subtitleOpacity = interpolate(frame, [20, 60], [0, 1], {
    extrapolateRight: "clamp",
  })
  const bgScale = interpolate(frame, [0, 150], [1, 1.2], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  })

  const particles = useMemo(() => {
    return Array.from({ length: 30 }).map((_, i) => ({
      x: Math.random() * WIDTH,
      y: Math.random() * HEIGHT,
      size: 2 + Math.random() * 4,
      speed: 0.5 + Math.random() * 1.5,
      opacity: 0.3 + Math.random() * 0.7,
    }))
  }, [])

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0a0e27 0%, #1a1a3e 50%, #0a0e27 100%)",
        overflow: "hidden",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
      }}
    >
      <Audio src={staticFile("audio-0.mp3")} />
      {/* 粒子背景 */}
      {particles.map((p, i) => {
        const py = (p.y + frame * p.speed) % HEIGHT
        const px = p.x + Math.sin((frame + i * 100) * 0.02) * 20
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: px,
              top: py,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "rgba(100, 200, 255, " + p.opacity * 0.6 + ")",
              boxShadow: `0 0 ${p.size * 2}px rgba(100, 200, 255, 0.4)`,
            }}
          />
        )
      })}

      {/* 背景网格 */}
      <div
        style={{
          position: "absolute",
          width: "200%",
          height: "200%",
          backgroundImage:
            "linear-gradient(rgba(100, 200, 255, 0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(100, 200, 255, 0.03) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
          transform: `scale(${bgScale})`,
          transformOrigin: "center center",
        }}
      />

      {/* 标题 */}
      <div
        style={{
          transform: `translateY(${titleY}px)`,
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 120,
            fontWeight: "bold",
            color: "#fff",
            textShadow: "0 0 40px rgba(100, 200, 255, 0.5), 0 0 80px rgba(100, 200, 255, 0.3)",
            letterSpacing: "0.1em",
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
          }}
        >
          人工智能
        </div>
        <div
          style={{
            fontSize: 48,
            color: "#64c8ff",
            marginTop: 30,
            opacity: subtitleOpacity,
            letterSpacing: "0.2em",
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
          }}
        >
          Artificial Intelligence
        </div>
      </div>

      {/* 底部装饰线 */}
      <div
        style={{
          position: "absolute",
          bottom: 200,
          width: interpolate(frame, [40, 100], [0, 400], {
            extrapolateRight: "clamp",
          }),
          height: 2,
          background: "linear-gradient(90deg, transparent, #64c8ff, transparent)",
        }}
      />
    </AbsoluteFill>
  )
}

// ========== 分镜2：定义 ==========
function Slide2({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const titleX = interpolate(frame, [0, 30], [-100, 0], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  })
  const items = ["模拟人类智能的技术", "学习、推理与感知", "不断进化的科学"]

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1a1a3e 0%, #2d1b69 50%, #1a1a3e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <Audio src={staticFile("audio-1.mp3")} />
      <div
        style={{
          transform: `translateX(${titleX}px)`,
          marginBottom: 80,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: "bold",
            color: "#fff",
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
          }}
        >
          什么是人工智能？
        </div>
      </div>

      {items.map((item, i) => {
        const itemY = interpolate(frame, [20 + i * 20, 50 + i * 20], [100, 0], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
        const itemOpacity = interpolate(frame, [20 + i * 20, 50 + i * 20], [0, 1], {
          extrapolateRight: "clamp",
        })
        return (
          <div
            key={i}
            style={{
              transform: `translateY(${itemY}px)`,
              opacity: itemOpacity,
              background: "rgba(255,255,255,0.08)",
              borderRadius: 20,
              padding: "30px 50px",
              marginBottom: 30,
              width: "100%",
              maxWidth: 800,
              border: "1px solid rgba(100, 200, 255, 0.2)",
              backdropFilter: "blur(10px)",
              display: "flex",
              alignItems: "center",
            }}
          >
            <div
              style={{
                width: 16,
                height: 16,
                borderRadius: "50%",
                background: "#64c8ff",
                marginRight: 30,
                boxShadow: "0 0 20px rgba(100, 200, 255, 0.5)",
                flexShrink: 0,
              }}
            />
            <div
              style={{
                fontSize: 42,
                color: "#fff",
                fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
              }}
            >
              {item}
            </div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

// ========== 分镜3：核心技术 ==========
function Slide3({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const cards = [
    { title: "机器学习", color: "#ff6b6b", icon: "ML" },
    { title: "深度学习", color: "#4ecdc4", icon: "DL" },
    { title: "神经网络", color: "#64c8ff", icon: "NN" },
  ]

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #0d1b2a 0%, #1b2838 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
      }}
    >
      <Audio src={staticFile("audio-2.mp3")} />
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: "#fff",
          marginBottom: 80,
          textAlign: "center",
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
          fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
        }}
      >
        核心技术
      </div>

      {cards.map((card, i) => {
        const cardY = interpolate(frame, [15 + i * 15, 45 + i * 15], [150, 0], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
        const cardOpacity = interpolate(frame, [15 + i * 15, 45 + i * 15], [0, 1], {
          extrapolateRight: "clamp",
        })
        const cardScale = interpolate(frame, [15 + i * 15, 45 + i * 15], [0.8, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.back(1.2)),
        })

        return (
          <div
            key={i}
            style={{
              transform: `translateY(${cardY}px) scale(${cardScale})`,
              opacity: cardOpacity,
              background: `linear-gradient(135deg, ${card.color}22, ${card.color}11)`,
              borderRadius: 30,
              padding: 40,
              marginBottom: 30,
              width: "100%",
              maxWidth: 900,
              border: `2px solid ${card.color}44`,
              display: "flex",
              alignItems: "center",
              gap: 40,
            }}
          >
            <div
              style={{
                width: 100,
                height: 100,
                borderRadius: 25,
                background: card.color,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 32,
                fontWeight: "bold",
                color: "#fff",
                flexShrink: 0,
                fontFamily: "'Helvetica Neue',sans-serif",
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontSize: 48,
                color: "#fff",
                fontWeight: "bold",
                fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
              }}
            >
              {card.title}
            </div>
          </div>
        )
      })}
    </AbsoluteFill>
  )
}

// ========== 分镜4：应用场景 ==========
function Slide4({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const scenes = [
    { title: "语音助手", icon: "🎤", color: "#a855f7" },
    { title: "自动驾驶", icon: "🚗", color: "#3b82f6" },
    { title: "医疗诊断", icon: "🏥", color: "#10b981" },
  ]

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 60px",
      }}
    >
      <Audio src={staticFile("audio-3.mp3")} />
      <div
        style={{
          fontSize: 64,
          fontWeight: "bold",
          color: "#fff",
          marginBottom: 80,
          opacity: interpolate(frame, [0, 30], [0, 1], {
            extrapolateRight: "clamp",
          }),
          fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
        }}
      >
        应用场景
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 30,
          width: "100%",
          maxWidth: 900,
        }}
      >
        {scenes.map((scene, i) => {
          const itemX = interpolate(frame, [20 + i * 18, 50 + i * 18], [i % 2 === 0 ? -200 : 200, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          })
          const itemOpacity = interpolate(frame, [20 + i * 18, 50 + i * 18], [0, 1], {
            extrapolateRight: "clamp",
          })
          const itemRotate = interpolate(frame, [20 + i * 18, 50 + i * 18], [i % 2 === 0 ? -10 : 10, 0], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          })

          return (
            <div
              key={i}
              style={{
                transform: `translateX(${itemX}px) rotate(${itemRotate}deg)`,
                opacity: itemOpacity,
                background: `linear-gradient(90deg, ${scene.color}22, transparent)`,
                borderRadius: 24,
                padding: "35px 45px",
                border: `2px solid ${scene.color}44`,
                display: "flex",
                alignItems: "center",
                gap: 30,
              }}
            >
              <div
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: "50%",
                  background: scene.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 42,
                  flexShrink: 0,
                }}
              >
                {scene.icon}
              </div>
              <div
                style={{
                  fontSize: 44,
                  color: "#fff",
                  fontWeight: "bold",
                  fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
                }}
              >
                {scene.title}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

// ========== 分镜5：数据展示 ==========
function Slide5({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const bars = [
    { label: "2020", value: 35, color: "#64c8ff" },
    { label: "2022", value: 55, color: "#4ecdc4" },
    { label: "2024", value: 75, color: "#a855f7" },
    { label: "2026", value: 95, color: "#ff6b6b" },
  ]
  const maxBarHeight = 600

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #1a1a2e 0%, #16213e 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 80px",
      }}
    >
      <Audio src={staticFile("audio-4.mp3")} />
      <div
        style={{
          fontSize: 56,
          fontWeight: "bold",
          color: "#fff",
          marginBottom: 100,
          textAlign: "center",
          opacity: interpolate(frame, [0, 25], [0, 1], {
            extrapolateRight: "clamp",
          }),
          fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
        }}
      >
        AI 市场规模（万亿美元）
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "center",
          gap: 40,
          height: maxBarHeight + 100,
          width: "100%",
        }}
      >
        {bars.map((bar, i) => {
          const barHeight = interpolate(frame, [20 + i * 15, 50 + i * 15], [0, (bar.value / 100) * maxBarHeight], {
            extrapolateRight: "clamp",
            easing: Easing.out(Easing.cubic),
          })
          const barOpacity = interpolate(frame, [20 + i * 15, 50 + i * 15], [0, 1], {
            extrapolateRight: "clamp",
          })

          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                opacity: barOpacity,
              }}
            >
              <div
                style={{
                  fontSize: 36,
                  color: bar.color,
                  fontWeight: "bold",
                  marginBottom: 20,
                  fontFamily: "'Helvetica Neue',sans-serif",
                }}
              >
                {bar.value}%
              </div>
              <div
                style={{
                  width: 120,
                  height: barHeight,
                  background: `linear-gradient(180deg, ${bar.color}, ${bar.color}88)`,
                  borderRadius: "12px 12px 0 0",
                  boxShadow: `0 0 30px ${bar.color}44`,
                }}
              />
              <div
                style={{
                  fontSize: 32,
                  color: "#fff",
                  marginTop: 20,
                  fontFamily: "'Helvetica Neue',sans-serif",
                }}
              >
                {bar.label}
              </div>
            </div>
          )
        })}
      </div>
    </AbsoluteFill>
  )
}

// ========== 分镜6：未来展望 + 结尾 ==========
function Slide6({ durationInFrames }: { durationInFrames: number }) {
  const { frame } = useSlideProgress(durationInFrames)
  const circles = useMemo(() => {
    return Array.from({ length: 20 }).map((_, i) => ({
      x: WIDTH / 2 + (Math.random() - 0.5) * 600,
      y: HEIGHT / 2 + (Math.random() - 0.5) * 800,
      size: 20 + Math.random() * 80,
      delay: i * 3,
    }))
  }, [])

  const bgPulse = interpolate(frame, [0, 60], [1, 1.1], {
    extrapolateRight: "clamp",
    easing: Easing.linear,
  })

  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, #000428 0%, #004e92 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <Audio src={staticFile("audio-5.mp3")} />
      {circles.map((circle, i) => {
        const scale = interpolate(frame, [circle.delay, circle.delay + 40], [0, 1], {
          extrapolateRight: "clamp",
          easing: Easing.out(Easing.cubic),
        })
        const opacity = interpolate(frame, [circle.delay + 20, circle.delay + 60], [0.6, 0], {
          extrapolateRight: "clamp",
        })
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: circle.x - circle.size / 2,
              top: circle.y - circle.size / 2,
              width: circle.size,
              height: circle.size,
              borderRadius: "50%",
              border: "2px solid rgba(100, 200, 255, 0.3)",
              transform: `scale(${scale})`,
              opacity: Math.max(0, opacity),
            }}
          />
        )
      })}

      {/* 背景光晕 */}
      <div
        style={{
          position: "absolute",
          width: 800,
          height: 800,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(100, 200, 255, 0.15) 0%, transparent 70%)",
          transform: `scale(${bgPulse})`,
        }}
      />

      <div
        style={{
          textAlign: "center",
          zIndex: 10,
        }}
      >
        <div
          style={{
            fontSize: 80,
            fontWeight: "bold",
            color: "#fff",
            textShadow: "0 0 60px rgba(100, 200, 255, 0.5)",
            opacity: interpolate(frame, [0, 40], [0, 1], {
              extrapolateRight: "clamp",
            }),
            transform: `scale(${interpolate(frame, [0, 40], [0.8, 1], {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.cubic),
            })})`,
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
            marginBottom: 40,
          }}
        >
          拥抱 AI 时代
        </div>
        <div
          style={{
            fontSize: 42,
            color: "#64c8ff",
            opacity: interpolate(frame, [25, 55], [0, 1], {
              extrapolateRight: "clamp",
            }),
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
            marginBottom: 60,
          }}
        >
          让智能赋能每一个可能
        </div>
        <div
          style={{
            display: "inline-block",
            padding: "20px 60px",
            borderRadius: 50,
            background: "linear-gradient(90deg, #64c8ff, #4ecdc4)",
            fontSize: 36,
            fontWeight: "bold",
            color: "#0a0e27",
            transform: `scale(${interpolate(frame, [20, 50], [0.8, 1], {
              extrapolateRight: "clamp",
              easing: Easing.out(Easing.back(1.5)),
            })})`,
            fontFamily: "'PingFang SC','Helvetica Neue',sans-serif",
          }}
        >
          立即探索
        </div>
      </div>
    </AbsoluteFill>
  )
}

// ========== 视频合成 ==========
const SLIDES = [
  { component: Slide1, durationInFrames: 112 },
  { component: Slide2, durationInFrames: 171 },
  { component: Slide3, durationInFrames: 169 },
  { component: Slide4, durationInFrames: 208 },
  { component: Slide5, durationInFrames: 159 },
  { component: Slide6, durationInFrames: 130 },
]

export function VideoComposition() {
  let accumulated = 0
  const offsets: number[] = []
  for (const s of SLIDES) {
    offsets.push(accumulated)
    accumulated += s.durationInFrames
  }

  return (
    <AbsoluteFill>
      {SLIDES.map((slide, i) => {
        const Component = slide.component
        return (
          <Sequence key={i} from={offsets[i]} durationInFrames={slide.durationInFrames}>
            <Component durationInFrames={slide.durationInFrames} />
          </Sequence>
        )
      })}
    </AbsoluteFill>
  )
}
