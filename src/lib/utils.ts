import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function wordCount(text: string): number {
  if (!text.trim()) return 0
  const cleaned = text.replace(/```[\s\S]*?```/g, '').replace(/`[^`]*`/g, '')
  const cjk = cleaned.match(/[一-鿿぀-ゟ゠-ヿ]/g)?.length ?? 0
  const words = cleaned.replace(/[一-鿿぀-ゟ゠-ヿ]/g, ' ').split(/\s+/).filter(Boolean).length
  return cjk + words
}

export function charCount(text: string): number {
  return text.length
}
