import { useState, useEffect, useCallback, useRef } from 'react'
import { timeEntriesApi } from '@/api'
import { Play, Pause, Square, Timer as TimerIcon, Loader2 } from 'lucide-react'
import { toast, toastError } from '@/store/toastStore'
import type { TimeEntry } from '@/types'

function formatDuration(seconds: number) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function TimerWidget() {
  const [entry, setEntry] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const loadedOnce = useRef(false)

  const load = useCallback(async () => {
    try {
      const data = await timeEntriesApi.getActive()
      setEntry(data)
      if (data) {
        if (data.status === 'paused') {
          setElapsed(data.duration_seconds)
        } else {
          const start = new Date(data.start_time).getTime()
          setElapsed(Math.max(0, Math.floor((Date.now() - start) / 1000)))
        }
      } else {
        setElapsed(0)
      }
    } catch {
      setEntry(null)
    } finally {
      setLoading(false)
      loadedOnce.current = true
    }
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(() => {
      setElapsed((e) => e + 1)
    }, 1000)
    return () => clearInterval(interval)
  }, [load])

  const withAction = async (fn: () => Promise<unknown>, successMsg: string) => {
    setActionLoading(true)
    try {
      await fn()
      toast(successMsg)
      await load()
    } catch (err: any) {
      toastError(err.response?.data?.detail || 'Erro na operação do timer')
    } finally {
      setActionLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="mx-3 mb-4 rounded-xl border border-gray-800 bg-gray-800/50 p-3">
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
          Carregando timer...
        </div>
      </div>
    )
  }

  const isPaused = entry?.status === 'paused'
  const running = !!entry && !isPaused

  return (
    <div className={`mx-3 mb-4 rounded-xl border p-3 ${running ? 'border-primary-600/40 bg-primary-600/10' : 'border-gray-800 bg-gray-800/50'}`}>
      <div className="flex items-center gap-2 mb-2">
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${running ? 'bg-primary-600 text-white' : isPaused ? 'bg-yellow-500 text-white' : 'bg-gray-700 text-gray-300'}`}>
          <TimerIcon className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">Timer</p>
          <p className="font-mono text-sm font-bold text-white tabular-nums leading-tight">
            {formatDuration(elapsed)}
          </p>
        </div>
      </div>
      <p className="text-[11px] text-gray-400 truncate mb-2">
        {entry ? (entry.description || 'Em andamento') : 'Nenhum timer ativo'}
      </p>
      {running ? (
        <div className="flex gap-1.5">
          <button
            onClick={() => withAction(() => timeEntriesApi.pause(entry!.id), 'Timer pausado')}
            disabled={actionLoading}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-700 text-gray-200 text-xs hover:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <Pause className="h-3 w-3" /> Pausar
          </button>
          <button
            onClick={() => withAction(() => timeEntriesApi.stop(entry!.id), 'Registro salvo!')}
            disabled={actionLoading}
            className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-600 text-white text-xs hover:bg-red-500 transition-colors disabled:opacity-50"
          >
            <Square className="h-3 w-3" /> Parar
          </button>
        </div>
      ) : (
        <div className="flex gap-1.5">
          {isPaused ? (
            <button
              onClick={() => withAction(() => timeEntriesApi.resume(entry!.id), 'Timer retomado')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-500 transition-colors disabled:opacity-50"
            >
              <Play className="h-3 w-3" /> Retomar
            </button>
          ) : (
            <button
              onClick={() => withAction(() => timeEntriesApi.start({}), 'Timer iniciado!')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-primary-600 text-white text-xs hover:bg-primary-500 transition-colors disabled:opacity-50"
            >
              <Play className="h-3 w-3" /> Iniciar
            </button>
          )}
          {isPaused && entry && (
            <button
              onClick={() => withAction(() => timeEntriesApi.stop(entry!.id), 'Registro salvo!')}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-gray-700 text-gray-200 text-xs hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              <Square className="h-3 w-3" /> Parar
            </button>
          )}
        </div>
      )}
    </div>
  )
}