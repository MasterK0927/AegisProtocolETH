"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Clock, Download, Share, MoreVertical, Zap, Timer, ArrowLeft, Paperclip, Mic, Square } from "lucide-react"
import Link from "next/link"

interface Message {
  id: string
  content: string
  sender: "user" | "agent"
  timestamp: Date
  type?: "text" | "file" | "image"
}

// Mock agent data
const agentInfo = {
  name: "Research Assistant Pro",
  avatar: "🔬",
  status: "online",
  timeRemaining: "2h 34m",
  capabilities: ["Research", "Analysis", "Writing"],
}

export default function ChatPage({ params }: { params: { agent: string } }) {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content:
        "Hello! I'm your Research Assistant Pro. I'm ready to help you with research, analysis, and writing tasks. What would you like to work on today?",
      sender: "agent",
      timestamp: new Date(Date.now() - 60000),
    },
  ])
  const [inputValue, setInputValue] = useState("")
  const [isTyping, setIsTyping] = useState(false)
  const [isRecording, setIsRecording] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue("")
    setIsTyping(true)

    // Simulate agent response
    setTimeout(() => {
      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: `I understand you want to ${inputValue.toLowerCase()}. Let me help you with that. I'll analyze the information and provide you with a comprehensive response based on my research capabilities.`,
        sender: "agent",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, agentMessage])
      setIsTyping(false)
    }, 2000)
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  }

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="text-lg">{agentInfo.avatar}</AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background"></div>
              </div>

              <div>
                <h1 className="font-semibold text-foreground">{agentInfo.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="text-green-500">●</span>
                  <span>Online</span>
                  <span>•</span>
                  <Clock className="w-3 h-3" />
                  <span>{agentInfo.timeRemaining} remaining</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {agentInfo.capabilities.map((capability) => (
                <Badge key={capability} variant="secondary" className="text-xs">
                  {capability}
                </Badge>
              ))}
            </div>

            <Button variant="ghost" size="sm">
              <Share className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <Download className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm">
              <MoreVertical className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.sender === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`flex gap-3 max-w-2xl ${message.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-sm">
                  {message.sender === "user" ? "U" : agentInfo.avatar}
                </AvatarFallback>
              </Avatar>

              <div className={`space-y-1 ${message.sender === "user" ? "items-end" : "items-start"} flex flex-col`}>
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.sender === "user" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground">{formatTime(message.timestamp)}</span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-2xl">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="text-sm">{agentInfo.avatar}</AvatarFallback>
              </Avatar>
              <div className="bg-muted px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  ></div>
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-border bg-card px-6 py-4">
        <div className="flex items-end gap-3">
          <Button variant="ghost" size="sm" className="flex-shrink-0">
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Message Research Assistant Pro..."
              className="pr-12 py-3 text-sm resize-none min-h-[44px]"
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={isRecording ? () => setIsRecording(false) : () => setIsRecording(true)}
            >
              {isRecording ? <Square className="w-4 h-4 text-red-500" /> : <Mic className="w-4 h-4" />}
            </Button>
          </div>

          <Button onClick={handleSendMessage} disabled={!inputValue.trim()} size="sm" className="flex-shrink-0">
            <Send className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex items-center justify-between mt-3 text-xs text-muted-foreground">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1">
              <Zap className="w-3 h-3" />
              <span>Powered by blockchain</span>
            </div>
            <div className="flex items-center gap-1">
              <Timer className="w-3 h-3" />
              <span>Session expires in {agentInfo.timeRemaining}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
              Extend Time
            </Button>
            <Button variant="ghost" size="sm" className="text-xs h-6 px-2">
              End Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
