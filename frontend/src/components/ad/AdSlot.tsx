import { useEffect, useId } from 'react'

const PUBLISHER = import.meta.env.VITE_ADSENSE_PUBLISHER as string | undefined

interface AdSlotProps {
  slotId: string
  format?: 'auto' | 'horizontal' | 'rectangle' | 'vertical'
  className?: string
}

/**
 * Slot de anúncio do Google AdSense.
 *
 * Só exibe o anúncio quando a variável de ambiente VITE_ADSENSE_PUBLISHER
 * estiver preenchida (ex.: "ca-pub-1234567890"). Com ranhura ausente, a
 * página fica limpa até o AdSense ser aprovado.
 */
export function AdSlot({ slotId, format = 'auto', className }: AdSlotProps) {
  const reactId = useId()

  useEffect(() => {
    const atributeId = reactId.replace(/[^a-zA-Z0-9]/g, '')

    function loadAd() {
      try {
        const w = window as unknown as { adsbygoogle?: unknown[] }
        if (w.adsbygoogle) {
          w.adsbygoogle.push({})
        }
      } catch {
        // ignore
      }
    }

    if (PUBLISHER) {
      const ins = document.getElementById(`ad-slot-${atributeId}`)
      if (ins && ins.getAttribute('data-adsbygoogle-status') === undefined) {
        loadAd()
      }
    }
  }, [reactId])

  if (!PUBLISHER) {
    return null
  }

  const atributeId = reactId.replace(/[^a-zA-Z0-9]/g, '')

  return (
    <div className={className ?? 'w-full overflow-hidden'} style={{ minHeight: format === 'vertical' ? 200 : 90 }}>
      <ins
        id={`ad-slot-${atributeId}`}
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