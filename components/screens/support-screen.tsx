"use client"

import { useEffect, useRef, useState } from "react"
import { Send } from "lucide-react"
import { ScreenHeader } from "@/components/app/ui"
import { cn } from "@/lib/utils"

interface Msg {
  id: number
  from: "agent" | "me"
  text: string
  time: string
}

const initial: Msg[] = [
  {
    id: 1,
    from: "agent",
    text: "Hi there! I'm Ada from Doorsteps support. How can I help you today?",
    time: "1:02 PM",
  },
  {
    id: 2,
    from: "me",
    text: "Hello, I want to check on my order DL-4821.",
    time: "1:03 PM",
  },
  {
    id: 3,
    from: "agent",
    text: "Sure! Your order is on the way and should arrive in about 15 minutes. Emeka is your rider.",
    time: "1:03 PM",
  },
]

const quickReplies = [
  "Where is my order?",
  "I want a refund",
  "Change my address",
  "Talk to a human",
]

function nowTime() {
  return new Date().toLocaleTimeString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function SupportScreen() {
  const [messages, setMessages] = useState<Msg[]>(initial)
  const [input, setInput] = useState("")
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" })
  }, [messages, typing])

  function send(text: string) {
    const value = text.trim()
    if (!value) return
    setMessages((m) => [...m, { id: Date.now(), from: "me", text: value, time: nowTime() }])
    setInput("")
    setTyping(true)
    setTimeout(() => {
      setTyping(false)
      setMessages((m) => [
        ...m,
        {
          id: Date.now() + 1,
          from: "agent",
          text: "Thanks for reaching out! I've noted that. One of our agents will assist you shortly. Is there anything else I can help with?",
          time: nowTime(),
        },
      ])
    }, 1400)
  }

  return (
    <div className="flex h-full flex-col bg-background">
      <ScreenHeader title="Doorsteps Support" subtitle="Typically replies in a few minutes" />

      <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto p-5">
        {messages.map((m) => (
          <div
            key={m.id}
            className={cn("flex", m.from === "me" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[78%] rounded-3xl px-4 py-2.5 text-sm leading-relaxed",
                m.from === "me"
                  ? "rounded-br-md bg-brand text-brand-foreground"
                  : "rounded-bl-md border border-border bg-card text-foreground",
              )}
            >
              <p>{m.text}</p>
              <p
                className={cn(
                  "mt-1 text-[10px]",
                  m.from === "me" ? "text-brand-foreground/70" : "text-muted-foreground",
                )}
              >
                {m.time}
              </p>
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="flex gap-1 rounded-3xl rounded-bl-md border border-border bg-card px-4 py-3">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"
                  style={{ animationDelay: `${i * 0.15}s` }}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* quick replies */}
      <div className="flex gap-2 overflow-x-auto px-5 pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {quickReplies.map((q) => (
          <button
            key={q}
            type="button"
            onClick={() => send(q)}
            className="whitespace-nowrap rounded-full border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors active:bg-secondary"
          >
            {q}
          </button>
        ))}
      </div>

      {/* input */}
      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-border bg-background p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
              e.preventDefault()
              send(input)
            }
          }}
          placeholder="Type your message..."
          className="h-11 flex-1 rounded-full border border-border bg-secondary px-4 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-brand"
        />
        <button
          type="submit"
          aria-label="Send message"
          disabled={!input.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand text-brand-foreground transition-transform active:scale-90 disabled:opacity-50"
        >
          <Send className="h-5 w-5" />
        </button>
      </form>
    </div>
  )
}
