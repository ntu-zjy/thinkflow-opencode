import React, { useEffect } from "react"
import { useAppStore } from "@/store"
import { useCanvasStore } from "@/store"
import Layout from "@/components/shared/Layout"
import OnboardingModal from "@/components/shared/OnboardingModal"

export default function App() {
  const onboarded = useAppStore((s) => s.onboarded)
  const canvases = useCanvasStore((s) => s.canvases)
  const activeCanvasId = useCanvasStore((s) => s.activeCanvasId)
  const setActiveCanvas = useCanvasStore((s) => s.setActiveCanvas)

  useEffect(() => {
    if (!activeCanvasId && canvases.length > 0) {
      setActiveCanvas(canvases[0].id)
    }
  }, [])

  return (
    <>
      <Layout />
      {!onboarded && <OnboardingModal />}
    </>
  )
}
