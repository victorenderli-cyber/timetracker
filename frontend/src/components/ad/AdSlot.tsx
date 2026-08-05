import { useEffect, useId, useRef, useState } from 'react'

const PUBLISHER = import.meta.env.VITE_ADSENSE_PUBLISHER as string | undefined

interface AdSlotProps {
  slotId: string
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  className?: string
  label?: string
}

const FORMAT_HEIGHT: Record<string, number> = {
  vertical: 200,
  rectangle: 250,
  horizontal: 100,
  auto: 90,
}

/**
 * Slot de anúncio do Google AdSense com carregamento lazy.
 *
 * Só exibe o anúncio quando a variável de ambiente VITE_ADSENSE_PUBLISHER
 * estiver preenchida (ex.: "ca-pub-1234567890"). Sem publisher configurado,
 * mostra um placeholder discreto (rotulado) na mesma altura do anúncio para a
 * página não "pular". O anúncio em si só é disparado quando o slot entra na
 * viewport (IntersectionObserver) e cada slot é renderizado uma única vez.
 */
export function AdSlot({ slotId, format = 'auto', className, label = 'Publicidade' }: AdSlotProps) {
  const reactId = useId()
  const attId = reactId.replace(/[^a-zA-Z0-9]/g, '')
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  const minHeight = FORMAT_HEIGHT[format] ?? 90

  useEffect(() => {
    if (!PUBLISHER) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') {
      setVisible(true)
      return
    }
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisible(true)
          obs.disconnect()
        }
      },
      { rootMargin: '200px 0px' }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!PUBLISHER || !visible) return

    let pushed = false
    function loadAd() {
      if (pushed) return
      pushed = true
      try {
        const w = window as unknown as { adsbygoogle?: unknown[] }
        if (w.adsbygoogle) {
          w.adsbygoogle.push({})
        }
      } catch {
        // ignore
      }
    }

    const ins = document.getElementById(`ad-slot-${attId}`)
    if (ins && ins.getAttribute('data-adsbygoogle-status') === undefined) {
      // aguarda a inserção do <ins> no DOM pelo React
      requestAnimationFrame(loadAd)
    }
  }, [visible, attId])

  if (!PUBLISHER) {
    return (
      <div
        className={className ?? 'w-full overflow-hidden'}
        style={{ minHeight }}
        aria-label={label}
      >
        <div className="w-full h-full min-h-full flex items-center justify-center border border-dashed border-gray-200 dark:border-gray-700 rounded-xl bg-gray-50 dark:bg-gray-800/50">
          <span className="text-[11px] uppercase tracking-widest text-gray-300 dark:text-gray-600">
            {label}
          </span>
        </div>
      </div>
    )
  }

  return (
    <div ref={ref} className={className ?? 'w-full overflow-hidden'} style={{ minHeight }}>
      <ins
        id={`ad-slot-${attId}`}
        className="adsbygoogle block w-full"
        style={{ display: 'block' }}
        data-ad-client={PUBLISHER}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive="true"
      />
    </div>
  )
}
