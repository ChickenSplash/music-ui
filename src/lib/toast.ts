import { createContext, useContext } from 'react'

/** A short note at the bottom of the screen, like "Added to Road trip". */
export type Toast = (message: string) => void

export const ToastContext = createContext<Toast>(() => undefined)

export const useToast = () => useContext(ToastContext)
