import React, { useState } from "react"
import { Button, Input } from "antd"
import { useAppStore } from "@/store"
import { useMemoryStore } from "@/store"
import { v4 as uuid } from "uuid"
import "./OnboardingModal.css"

const steps = [
  {
    title: "欢迎使用 ThinkFlow",
    subtitle: "可记忆的 Agent Native 内容创作工具",
    desc: "ThinkFlow 让你的内容创作拥有记忆。每次创作都在积累，越用越懂你。",
  },
  {
    title: "创建你的第一个人设记忆",
    subtitle: "告诉 ThinkFlow 你是谁",
    desc: "人设记忆帮助 Agent 理解你的写作风格、账号定位和表达习惯。",
  },
  {
    title: "开始创作",
    subtitle: "画布已准备好",
    desc: "点击节点添加内容，连接输入→Agent→输出，一键运行生成。",
  },
]

export default function OnboardingModal() {
  const setOnboarded = useAppStore((s) => s.setOnboarded)
  const folders = useMemoryStore((s) => s.folders)
  const addEntry = useMemoryStore((s) => s.addEntry)
  const [step, setStep] = useState(0)
  const [personaName, setPersonaName] = useState("")
  const [personaDesc, setPersonaDesc] = useState("")

  function next() {
    if (step < steps.length - 1) setStep(step + 1)
    else finish()
  }

  function finish() {
    if (personaName.trim() && personaDesc.trim()) {
      const personaFolder = folders.find((f) => f.type === "persona")
      if (personaFolder) {
        addEntry(personaFolder.id, {
          title: personaName,
          type: "persona",
          content: personaDesc,
          tags: ["人设"],
        })
      }
    }
    setOnboarded()
  }

  const s = steps[step]

  return (
    <div className="tf-onboarding-overlay">
      <div className="tf-onboarding-modal tf-animate-in">
        <div className="tf-onboarding__progress">
          {steps.map((_, i) => (
            <div key={i} className={`tf-onboarding__dot ${i <= step ? "tf-onboarding__dot--active" : ""}`} />
          ))}
        </div>

        <div className="tf-onboarding__content">
          <p className="tf-onboarding__subtitle">{s.subtitle}</p>
          <h2 className="tf-onboarding__title">{s.title}</h2>
          <p className="tf-onboarding__desc">{s.desc}</p>

          {step === 1 && (
            <div className="tf-onboarding__form">
              <Input
                placeholder="账号名称，如：数码博主小王"
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                className="tf-onboarding__input"
              />
              <Input.TextArea
                placeholder="描述你的账号风格、口头禅、价值观...&#10;例如：我是一个分享国产手机评测的博主，风格客观直接，喜欢用数据说话。常用语：「简单说」「数据告诉你」"
                value={personaDesc}
                onChange={(e) => setPersonaDesc(e.target.value)}
                rows={4}
                className="tf-onboarding__input"
              />
            </div>
          )}
        </div>

        <div className="tf-onboarding__footer">
          {step > 0 && (
            <button className="tf-onboarding__skip" onClick={() => setStep(step - 1)}>
              上一步
            </button>
          )}
          <button className="tf-onboarding__skip" onClick={finish}>
            {step === 1 ? "跳过" : "跳过引导"}
          </button>
          <Button type="primary" onClick={next}>
            {step === steps.length - 1 ? "开始创作 →" : "下一步"}
          </Button>
        </div>
      </div>
    </div>
  )
}
