"use client"

import { useEffect, useRef } from "react"

// Projeta ponto 3D para 2D (perspectiva de um ponto)
function project(
  x: number,
  y: number,
  z: number,
  vp: { x: number; y: number },
  scale: number,
  focalLength: number
): { x: number; y: number; depth: number } {
  const depth = 1 / (1 + z / focalLength)
  return {
    x: vp.x + x * scale * depth,
    y: vp.y + y * scale * depth,
    depth,
  }
}

// Rotação 4D: roda no plano xy (ângulo a), depois projeta x,y,z,w -> x,y,z (w vira profundidade)
function rotate4D(
  x: number, y: number, z: number, w: number,
  angleXW: number, angleYW: number, angleZW: number
): [number, number, number] {
  const cos = Math.cos
  const sin = Math.sin
  // Rotação XW
  let x1 = x * cos(angleXW) - w * sin(angleXW)
  let w1 = x * sin(angleXW) + w * cos(angleXW)
  x = x1
  w = w1
  // Rotação YW
  let y1 = y * cos(angleYW) - w * sin(angleYW)
  w1 = y * sin(angleYW) + w * cos(angleYW)
  y = y1
  w = w1
  // Rotação ZW
  let z1 = z * cos(angleZW) - w * sin(angleZW)
  w1 = z * sin(angleZW) + w * cos(angleZW)
  z = z1
  // Projeção 4D->3D: perspectiva em w (objetos com w maior ficam menores)
  const wp = 1.5
  const factor = wp / (wp + w * 0.5)
  return [x * factor, y * factor, z * factor]
}

// Vértices do tesseract (8 do cubo interno + 8 do cubo externo na 4ª dimensão)
const TESSERACT_SIZE = 0.25
function getTesseractVerts(wOffset: number) {
  const s = TESSERACT_SIZE
  return [
    [-s, -s, -s, -s + wOffset], [s, -s, -s, -s + wOffset], [s, s, -s, -s + wOffset], [-s, s, -s, -s + wOffset],
    [-s, -s, s, -s + wOffset], [s, -s, s, -s + wOffset], [s, s, s, -s + wOffset], [-s, s, s, -s + wOffset],
    [-s, -s, -s, s + wOffset], [s, -s, -s, s + wOffset], [s, s, -s, s + wOffset], [-s, s, -s, s + wOffset],
    [-s, -s, s, s + wOffset], [s, -s, s, s + wOffset], [s, s, s, s + wOffset], [-s, s, s, s + wOffset],
  ] as const
}
const TESSERACT_EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7],
  [8, 9], [9, 10], [10, 11], [11, 8], [12, 13], [13, 14], [14, 15], [15, 12], [8, 12], [9, 13], [10, 14], [11, 15],
  [0, 8], [1, 9], [2, 10], [3, 11], [4, 12], [5, 13], [6, 14], [7, 15],
]

function drawLogo3D(
  ctx: CanvasRenderingContext2D,
  centerX: number,
  centerY: number,
  fontSize: number
) {
  const text = "ak"
  const fontFamily = '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  ctx.font = `600 ${fontSize}px ${fontFamily}`
  const metrics = ctx.measureText(text)
  const textWidth = metrics.width
  const textHeight = fontSize * 1.1
  const x = centerX - textWidth / 2
  const y = centerY + fontSize * 0.35

  const offset = Math.max(4, fontSize * 0.05)
  const gapSize = Math.max(2, fontSize * 0.02)
  const topBound = centerY - textHeight / 2
  const midY = centerY
  const bottomBound = centerY + textHeight / 2

  // 1. Sombra cinza (camada de profundidade por baixo)
  ctx.save()
  ctx.globalAlpha = 0.5
  ctx.fillStyle = "rgba(100, 100, 110, 0.9)"
  ctx.fillText(text, x + offset * 1.2, y + offset * 1.2)
  ctx.restore()

  // 2. Metade superior: recorte deslocado para cima-esquerda
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - offset * 3, topBound, textWidth + offset * 6, (bottomBound - topBound) / 2 - gapSize / 2)
  ctx.clip()
  ctx.fillStyle = "#ffffff"
  ctx.fillText(text, x - offset, y - offset)
  ctx.restore()

  // 3. Metade inferior: recorte deslocado para baixo-direita
  ctx.save()
  ctx.beginPath()
  ctx.rect(x - offset * 3, midY + gapSize / 2, textWidth + offset * 6, (bottomBound - topBound) / 2 + offset * 2)
  ctx.clip()
  ctx.fillStyle = "#ffffff"
  ctx.fillText(text, x + offset, y + offset)
  ctx.restore()
}

type LogoPosition = "center" | "bottom-left" | "top-left" | "top-right" | "bottom-right" | "hidden"

interface GeometricCanvasProps {
  className?: string
  /** Posição do logo "ak" - na landing use bottom-left para não atrapalhar o conteúdo */
  logoPosition?: LogoPosition
  /** Exibir o cubo/tesseract 4D central - na landing pode esconder */
  showTesseract?: boolean
}

export function ConstellationCanvas({ className, logoPosition = "center", showTesseract = true }: GeometricCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const mouseRef = useRef({ x: -1000, y: -1000 })
  const smoothMouseRef = useRef({ x: -1000, y: -1000 })
  const timeRef = useRef(0)
  const animationRef = useRef<number>(0)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const LERP = 0.08

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const rect = canvas.getBoundingClientRect()
      canvas.width = rect.width * dpr
      canvas.height = rect.height * dpr
      ctx.scale(dpr, dpr)
      canvas.style.width = `${rect.width}px`
      canvas.style.height = `${rect.height}px`
    }
    resize()
    window.addEventListener("resize", resize)

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect()
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      }
    }
    const handleMouseLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }
    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const rect = canvas.getBoundingClientRect()
        mouseRef.current = {
          x: e.touches[0].clientX - rect.left,
          y: e.touches[0].clientY - rect.top,
        }
      }
    }
    const handleTouchEnd = () => {
      mouseRef.current = { x: -1000, y: -1000 }
    }
    window.addEventListener("mousemove", handleMouseMove)
    window.addEventListener("mouseleave", handleMouseLeave)
    window.addEventListener("touchmove", handleTouchMove, { passive: true })
    window.addEventListener("touchend", handleTouchEnd)

    const loop = () => {
      timeRef.current += 0.016
      const t = timeRef.current
      const { width, height } = canvas.getBoundingClientRect()
      const mouse = mouseRef.current
      const smooth = smoothMouseRef.current

      // Interpolação suave do mouse (parallax fluido)
      const targetX = mouse.x >= 0 ? mouse.x : width / 2
      const targetY = mouse.y >= 0 ? mouse.y : height / 2
      smooth.x += (targetX - smooth.x) * LERP
      smooth.y += (targetY - smooth.y) * LERP
      if (mouse.x < 0) smooth.x += (width / 2 - smooth.x) * LERP * 0.5
      if (mouse.y < 0) smooth.y += (height / 2 - smooth.y) * LERP * 0.5

      const mouseNormX = (smooth.x / width - 0.5) * 2
      const mouseNormY = (smooth.y / height - 0.5) * 2
      const vpOffsetX = mouseNormX * width * 0.08
      const vpOffsetY = mouseNormY * height * 0.06
      const vp = {
        x: width / 2 + vpOffsetX + Math.sin(t * 0.5) * 8,
        y: height * 0.55 + vpOffsetY + Math.sin(t * 0.4 + 0.5) * 6,
      }
      const scale = Math.min(width, height) * 0.58
      const focalLength = 2.2

      // Parâmetros 4D: mouse controla rotação na 4ª dimensão (interativo)
      const angleXW = t * 0.4 + mouseNormY * 0.8
      const angleYW = t * 0.35 + mouseNormX * 0.6
      const angleZW = t * 0.25
      const warp = Math.sin(t * 1.2) * 0.045 + mouseNormX * 0.015
      const warp2 = Math.sin(t * 0.8 + 1) * 0.03 + mouseNormY * 0.01

      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, width, height)

      // Gradiente de iluminação difusa nos cantos superiores
      const topGlow = ctx.createRadialGradient(
        width * 0.3, 0, 0,
        width * 0.3, 0, height * 0.8
      )
      topGlow.addColorStop(0, "rgba(80, 80, 90, 0.15)")
      topGlow.addColorStop(0.5, "rgba(40, 40, 45, 0.05)")
      topGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = topGlow
      ctx.fillRect(0, 0, width, height)

      const topGlowRight = ctx.createRadialGradient(
        width * 0.7, 0, 0,
        width * 0.7, 0, height * 0.8
      )
      topGlowRight.addColorStop(0, "rgba(80, 80, 90, 0.12)")
      topGlowRight.addColorStop(0.5, "rgba(40, 40, 45, 0.03)")
      topGlowRight.addColorStop(1, "rgba(0, 0, 0, 0)")
      ctx.fillStyle = topGlowRight
      ctx.fillRect(0, 0, width, height)

      // Glow 4D interativo: "fatia" de luz que segue o cursor
      if (mouse.x >= 0) {
        const sliceGlow = ctx.createRadialGradient(
          smooth.x, smooth.y, 0,
          smooth.x, smooth.y, 280
        )
        sliceGlow.addColorStop(0, "rgba(120, 130, 160, 0.08)")
        sliceGlow.addColorStop(0.4, "rgba(60, 65, 80, 0.03)")
        sliceGlow.addColorStop(1, "rgba(0, 0, 0, 0)")
        ctx.fillStyle = sliceGlow
        ctx.fillRect(0, 0, width, height)
      }

      // Elementos a desenhar (ordem: fundo primeiro)
      const elements: Array<{
        p1: { x: number; y: number; depth: number }
        p2?: { x: number; y: number; depth: number }
        p3?: { x: number; y: number; depth: number }
        p4?: { x: number; y: number; depth: number }
        type: "line" | "rect" | "quad"
        brightness: number
        isHighlight?: boolean
        phase?: number
      }> = []

      // --- PISO: barras paralelas e blocos retangulares (com warp 4D) ---
      const floorLevel = 0.35
      const corridorWidth = 1.2
      const corridorDepth = 4

      for (let zi = 0; zi < 12; zi++) {
        const z = zi * (corridorDepth / 12)
        for (let xi = -6; xi <= 6; xi++) {
          let x = (xi / 6) * corridorWidth
          x += warp * Math.sin(z * 2) + warp2 * xi
          const w = 0.08 + Math.sin(zi * 0.7 + xi * 0.3) * 0.02
          const h = 0.02 + Math.sin(zi * 1.2 + xi * 0.5) * 0.01
          const p1 = project(x, floorLevel, z, vp, scale, focalLength)
          const p2 = project(x + w, floorLevel, z, vp, scale, focalLength)
          const p3 = project(x + w, floorLevel, z + 0.15, vp, scale, focalLength)
          const p4 = project(x, floorLevel, z + 0.15, vp, scale, focalLength)
          const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4
          const brightness = 0.08 + (1 - depth) * 0.25 + Math.sin(zi + xi + t * 0.5) * 0.05
          const phase = 0.5 + 0.5 * (Math.sin(t * 2 + zi * 0.5 + xi * 0.3) + 1) / 2
          elements.push({
            p1, p2, p3, p4,
            type: "quad",
            brightness,
            phase,
          })
        }
      }

      // Linhas horizontais do piso (grupos de 3)
      for (let zi = 0; zi < 15; zi++) {
        const z = zi * (corridorDepth / 15)
        for (let row = 0; row < 3; row++) {
          const x1 = -corridorWidth * 0.9
          const x2 = corridorWidth * 0.9
          const p1 = project(x1, floorLevel + 0.01 * row, z, vp, scale, focalLength)
          const p2 = project(x2, floorLevel + 0.01 * row, z, vp, scale, focalLength)
          const brightness = 0.1 + (1 - p1.depth) * 0.3 + Math.sin(t * 2.5 + zi * 0.5) * 0.04
          const phase = 0.4 + 0.6 * (Math.sin(t * 2 + zi * 0.4 + row) + 1) / 2
          elements.push({ p1, p2, type: "line", brightness, phase })
        }
      }

      // Blocos elevados (degraus) no piso
      for (let bi = 0; bi < 20; bi++) {
        const z = 0.3 + bi * 0.18 + Math.sin(bi) * 0.05
        const x = (Math.sin(bi * 0.7) * 0.4)
        const w = 0.15 + Math.sin(bi * 0.5) * 0.08
        const h = 0.03 + Math.sin(bi * 0.3) * 0.015
        const elevation = Math.sin(bi * 0.4) * 0.02

        const p1 = project(x, floorLevel + elevation, z, vp, scale, focalLength)
        const p2 = project(x + w, floorLevel + elevation, z, vp, scale, focalLength)
        const p3 = project(x + w, floorLevel + elevation, z + 0.1, vp, scale, focalLength)
        const p4 = project(x, floorLevel + elevation, z + 0.1, vp, scale, focalLength)
        const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4
        const brightness = 0.12 + (1 - depth) * 0.35
        elements.push({ p1, p2, p3, p4, type: "quad", brightness, isHighlight: bi === 8 })
      }

      // --- PAREDE ESQUERDA: grade de retângulos (warp 4D) ---
      const wallDepth = 4
      for (let zi = 0; zi < 10; zi++) {
        const z = zi * (wallDepth / 10)
        for (let yi = 0; yi < 8; yi++) {
          const y = -0.1 + yi * 0.12
          let x = -corridorWidth * 0.95
          x += warp * Math.cos(z) * 0.5 - warp2 * yi * 0.3
          const rectW = 0.06 + Math.sin(zi + yi) * 0.02
          const rectD = 0.12
          const p1 = project(x, y, z, vp, scale, focalLength)
          const p2 = project(x, y + 0.1, z, vp, scale, focalLength)
          const p3 = project(x, y + 0.1, z + rectD, vp, scale, focalLength)
          const p4 = project(x, y, z + rectD, vp, scale, focalLength)
          const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4
          const brightness = 0.06 + (1 - depth) * 0.2
          const phase = 0.5 + 0.5 * (Math.sin(t * 0.8 + zi + yi) + 1) / 2
          elements.push({ p1, p2, p3, p4, type: "quad", brightness, phase })
        }
      }

      // Linhas da parede esquerda
      for (let zi = 0; zi < 12; zi++) {
        const z = zi * (wallDepth / 12)
        const x = -corridorWidth * 0.95
        for (let yi = 0; yi < 10; yi++) {
          const y = -0.15 + yi * 0.11
          const p1 = project(x, y, z, vp, scale, focalLength)
          const p2 = project(x, y + 0.08, z, vp, scale, focalLength)
          const brightness = 0.08 + (1 - p1.depth) * 0.25
          elements.push({ p1, p2, type: "line", brightness })
        }
      }

      // --- PAREDE DIREITA (warp 4D) ---
      for (let zi = 0; zi < 10; zi++) {
        const z = zi * (wallDepth / 10)
        for (let yi = 0; yi < 8; yi++) {
          const y = -0.1 + yi * 0.12
          let x = corridorWidth * 0.95
          x -= warp * Math.cos(z) * 0.5 + warp2 * yi * 0.3
          const rectD = 0.12
          const p1 = project(x, y, z, vp, scale, focalLength)
          const p2 = project(x, y + 0.1, z, vp, scale, focalLength)
          const p3 = project(x, y + 0.1, z + rectD, vp, scale, focalLength)
          const p4 = project(x, y, z + rectD, vp, scale, focalLength)
          const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4
          const brightness = 0.06 + (1 - depth) * 0.2
          const phase = 0.5 + 0.5 * (Math.sin(t * 0.8 + zi + yi) + 1) / 2
          elements.push({ p1, p2, p3, p4, type: "quad", brightness, phase })
        }
      }

      for (let zi = 0; zi < 12; zi++) {
        const z = zi * (wallDepth / 12)
        const x = corridorWidth * 0.95
        for (let yi = 0; yi < 10; yi++) {
          const y = -0.15 + yi * 0.11
          const p1 = project(x, y, z, vp, scale, focalLength)
          const p2 = project(x, y + 0.08, z, vp, scale, focalLength)
          const brightness = 0.08 + (1 - p1.depth) * 0.25
          elements.push({ p1, p2, type: "line", brightness })
        }
      }

      // --- TETO: grade de retângulos concêntricos (warp 4D) ---
      const ceilingLevel = -0.4
      for (let ri = 0; ri < 8; ri++) {
        const radius = 0.2 + ri * 0.15
        for (let ai = 0; ai < 12; ai++) {
          const angle = (ai / 12) * Math.PI * 0.6 - Math.PI * 0.3
          let x1 = Math.sin(angle) * radius
          x1 += warp * Math.sin(ri) * 0.1
          const x2 = Math.sin(angle) * (radius + 0.08)
          const z1 = Math.cos(angle) * radius * 2
          const z2 = Math.cos(angle) * (radius + 0.08) * 2
          const p1 = project(x1, ceilingLevel, z1, vp, scale, focalLength)
          const p2 = project(x2, ceilingLevel, z1, vp, scale, focalLength)
          const p3 = project(x2, ceilingLevel, z2, vp, scale, focalLength)
          const p4 = project(x1, ceilingLevel, z2, vp, scale, focalLength)
          const depth = (p1.depth + p2.depth + p3.depth + p4.depth) / 4
          const brightness = 0.05 + (1 - depth) * 0.18
          elements.push({ p1, p2, p3, p4, type: "quad", brightness })
        }
      }

      // Linhas do teto cruzando
      for (let zi = 0; zi < 10; zi++) {
        const z = zi * (wallDepth / 10)
        for (let xi = -8; xi <= 8; xi++) {
          const x = (xi / 8) * corridorWidth * 0.8
          const p1 = project(x, ceilingLevel, z, vp, scale, focalLength)
          const p2 = project(x + 0.05, ceilingLevel, z, vp, scale, focalLength)
          const brightness = 0.06 + (1 - p1.depth) * 0.2
          elements.push({ p1, p2, type: "line", brightness })
        }
      }

      // Ordenar por profundidade (desenhar fundo primeiro)
      elements.sort((a, b) => {
        const d1 = a.p1.depth + (a.p2?.depth ?? 0) + (a.p3?.depth ?? 0) + (a.p4?.depth ?? 0)
        const d2 = b.p1.depth + (b.p2?.depth ?? 0) + (b.p3?.depth ?? 0) + (b.p4?.depth ?? 0)
        return d1 - d2
      })

      // Desenhar todos os elementos
      for (const el of elements) {
        const baseGray = Math.floor(el.brightness * 255)
        const gray = Math.max(15, Math.min(180, baseGray))

        // Reação ao cursor: brilho e glow 4D próximo ao mouse
        let finalGray = gray
        if (mouse.x >= 0 && el.p2) {
          const mx = (el.p1.x + (el.p2.x ?? el.p1.x)) / 2
          const my = (el.p1.y + (el.p2.y ?? el.p1.y)) / 2
          const dist = Math.hypot(smooth.x - mx, smooth.y - my)
          if (dist < 200) {
            const intensity = 1 - dist / 200
            finalGray = Math.min(240, gray + intensity * 120)
          }
        }

        if (el.isHighlight) {
          finalGray = Math.min(255, finalGray + 40)
        }

        const baseAlpha = (0.3 + el.p1.depth * 0.5) * (el.phase ?? 1)
        const strokeColor = `rgba(${finalGray}, ${finalGray}, ${finalGray + 5}, ${baseAlpha})`

        if (el.type === "line" && el.p2) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 0.5 + (1 - el.p1.depth) * 0.5
          ctx.beginPath()
          ctx.moveTo(el.p1.x, el.p1.y)
          ctx.lineTo(el.p2.x, el.p2.y)
          ctx.stroke()
        } else if (el.type === "quad" && el.p2 && el.p3 && el.p4) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = 0.4 + (1 - el.p1.depth) * 0.4
          ctx.beginPath()
          ctx.moveTo(el.p1.x, el.p1.y)
          ctx.lineTo(el.p2.x, el.p2.y)
          ctx.lineTo(el.p3.x, el.p3.y)
          ctx.lineTo(el.p4.x, el.p4.y)
          ctx.closePath()
          ctx.stroke()
          // Preenchimento sutil para retângulos (com phase 4D)
          const fillAlpha = 0.3 * el.p1.depth * (el.phase ?? 1)
          ctx.fillStyle = `rgba(20, 20, 25, ${fillAlpha})`
          ctx.fill()
        }
      }

      // --- TESSERACT 4D: hipercubo girando na 4ª dimensão (opcional) ---
      if (showTesseract) {
        const tesseractZ = 1.2 + Math.sin(t * 0.4) * 0.2
        const verts4D = getTesseractVerts(0)
        const verts3D = verts4D.map(([x, y, z, w]) =>
          rotate4D(x, y, z, w, angleXW, angleYW, angleZW)
        )
        const verts2D = verts3D.map(([x, y, z]) =>
          project(x, y, z + tesseractZ, vp, scale, focalLength)
        )
        const tesseractEdges = TESSERACT_EDGES.map(([a, b]) => ({
          p1: verts2D[a],
          p2: verts2D[b],
          depth: (verts2D[a].depth + verts2D[b].depth) / 2,
        })).sort((a, b) => a.depth - b.depth)
        for (const edge of tesseractEdges) {
          const brightness = 0.15 + (1 - edge.depth) * 0.5 + Math.sin(t * 3) * 0.1
          const gray = Math.min(200, Math.floor(brightness * 255))
          const mouseDist = mouse.x >= 0
            ? Math.hypot(smooth.x - (edge.p1.x + edge.p2.x) / 2, smooth.y - (edge.p1.y + edge.p2.y) / 2)
            : 999
          const glow = mouseDist < 150 ? (1 - mouseDist / 150) * 100 : 0
          ctx.strokeStyle = `rgba(${Math.min(255, gray + glow)}, ${Math.min(255, gray + glow)}, ${Math.min(255, gray + glow + 20)}, ${0.4 + edge.depth * 0.4})`
          ctx.lineWidth = 1 + (1 - edge.depth) * 1.5
          ctx.beginPath()
          ctx.moveTo(edge.p1.x, edge.p1.y)
          ctx.lineTo(edge.p2.x, edge.p2.y)
          ctx.stroke()
        }
      }

      // Partículas 4D: "dados" viajando pelo hiperespaço - interativas com o mouse
      for (let pi = 0; pi < 16; pi++) {
        const phase = (t * 0.6 + pi * 0.5) % (Math.PI * 2)
        const z = (phase / (Math.PI * 2)) * 3.5
        let x = Math.sin(pi * 1.2 + t * 0.4) * 0.55
        let y = Math.cos(pi * 0.9 + t * 0.3) * 0.22 - 0.1
        if (mouse.x >= 0) {
          const mx = (smooth.x / width - 0.5) * 0.5
          const my = (smooth.y / height - 0.5) * 0.3
          x += mx * (0.2 + Math.sin(phase) * 0.1)
          y += my * (0.15 + Math.cos(phase * 2) * 0.08)
        }
        const p = project(x, y, z, vp, scale, focalLength)
        const alpha = 0.35 + 0.5 * (Math.sin(phase * 5) + 1) / 2
        if (p.depth > 0.08 && p.x > -20 && p.x < width + 20 && p.y > -20 && p.y < height + 20) {
          const mouseDist = mouse.x >= 0 ? Math.hypot(smooth.x - p.x, smooth.y - p.y) : 999
          const pulse = mouseDist < 150 ? 1 + (1 - mouseDist / 150) * 0.8 : 1
          ctx.beginPath()
          ctx.arc(p.x, p.y, (1.5 + (1 - p.depth) * 2.5) * pulse, 0, Math.PI * 2)
          let g = 130 + Math.floor((1 - p.depth) * 110) + Math.sin(t * 6) * 25
          if (mouseDist < 150) g = Math.min(255, g + (1 - mouseDist / 150) * 60)
          ctx.fillStyle = `rgba(${g}, ${g}, ${Math.min(255, g + 35)}, ${alpha})`
          ctx.fill()
        }
      }

      // Logo "ak" 3D - posição configurável
      const logoSize =
        logoPosition === "hidden" ? 0 : Math.min(width, height) * (logoPosition === "center" ? 0.24 : 0.12)
      if (logoSize > 0) {
        const padding = 32
        let logoX: number
        let logoY: number
        switch (logoPosition) {
          case "bottom-left":
            logoX = padding + (logoSize * 0.6)
            logoY = height - padding - logoSize * 0.3
            break
          case "top-left":
            logoX = padding + (logoSize * 0.6)
            logoY = padding + logoSize * 0.5
            break
          case "top-right":
            logoX = width - padding - (logoSize * 0.6)
            logoY = padding + logoSize * 0.5
            break
          case "bottom-right":
            logoX = width - padding - (logoSize * 0.6)
            logoY = height - padding - logoSize * 0.3
            break
          default:
            logoX = width / 2
            logoY = height / 2
        }
        drawLogo3D(ctx, logoX, logoY, logoSize)
      }

      // Ponto/detalhe avermelhado interativo (central inferior, ligeiramente à direita)
      const redDotX = vp.x + 40
      const redDotY = height - 80
      const nearRed = mouse.x >= 0 && Math.hypot(smooth.x - redDotX, smooth.y - redDotY) < 60
      ctx.beginPath()
      ctx.arc(redDotX, redDotY, nearRed ? 4 : 2, 0, Math.PI * 2)
      ctx.fillStyle = nearRed ? "rgba(180, 60, 60, 0.9)" : "rgba(120, 40, 40, 0.6)"
      ctx.fill()

      animationRef.current = requestAnimationFrame(loop)
    }
    animationRef.current = requestAnimationFrame(loop)

    return () => {
      cancelAnimationFrame(animationRef.current)
      window.removeEventListener("resize", resize)
      window.removeEventListener("mousemove", handleMouseMove)
      window.removeEventListener("mouseleave", handleMouseLeave)
      window.removeEventListener("touchmove", handleTouchMove)
      window.removeEventListener("touchend", handleTouchEnd)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ display: "block", width: "100%", height: "100%" }}
      aria-hidden
    />
  )
}
