"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Loader2, Send, Wallet2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { fetchAgent, type AgentData } from "@/lib/agents";

type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
};

export default function ChatPage({ params }: { params: { agent: string } }) {
  const tokenId = useMemo(
    () => Number.parseInt(params.agent, 10),
    [params.agent]
  );
  const { toast } = useToast();
  const { address, connect, disconnect, isConnecting, getPaymentFetcher } =
    useWeb3();

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [lastReceipt, setLastReceipt] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (Number.isNaN(tokenId)) {
      setError("Invalid agent identifier.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const loadAgent = async () => {
      setIsLoading(true);
      try {
        const data = await fetchAgent(tokenId);
        if (cancelled) {
          return;
        }

        if (!data) {
          setError("Agent not found.");
          return;
        }

        setAgent(data);
        setMessages([
          {
            id: "intro",
            content: `Hi! I'm ${data.name}. ${data.shortDescription}`,
            sender: "agent",
            timestamp: new Date(),
          },
        ]);
      } catch (err) {
        console.error("Failed to load agent", err);
        if (!cancelled) {
          setError("Unable to load agent data. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadAgent();

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleConnectWallet = useCallback(async () => {
    try {
      await connect();
    } catch (err) {
      toast({
        title: "Wallet connection failed",
        description:
          err instanceof Error
            ? err.message
            : "Please ensure your wallet extension is available.",
        variant: "destructive",
      });
    }
  }, [connect, toast]);

  const handleSendMessage = useCallback(async () => {
    if (!agent) {
      return;
    }

    const trimmed = inputValue.trim();
    if (!trimmed) {
      return;
    }

    if (!address) {
      toast({
        title: "Connect wallet",
        description: "You need to connect a wallet to initiate a paid request.",
        variant: "destructive",
      });
      return;
    }

    let paidFetch: (
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response>;
    try {
      const maxValue = agent.pricing.maxPaymentValueWei
        ? BigInt(agent.pricing.maxPaymentValueWei)
        : undefined;
      paidFetch = getPaymentFetcher(maxValue);
    } catch (err) {
      toast({
        title: "Wallet not connected",
        description:
          err instanceof Error ? err.message : "Please reconnect your wallet.",
        variant: "destructive",
      });
      return;
    }

    const userMessage: Message = {
      id: `${Date.now()}`,
      content: trimmed,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsSending(true);

    try {
      const response = await paidFetch(`/api/agents/${agent.tokenId}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: [...messages, userMessage].map((message) => ({
            role: message.sender === "user" ? "user" : "assistant",
            content: message.content,
          })),
        }),
      });

      const paymentReceipt = response.headers.get("x-payment-response");
      if (paymentReceipt) {
        setLastReceipt(paymentReceipt);
      }

      if (!response.ok) {
        const errorPayload = await response
          .json()
          .catch(() => ({ error: "Payment or AI request failed." }));

        throw new Error(
          typeof errorPayload.error === "string"
            ? errorPayload.error
            : "Payment required to continue."
        );
      }

      const data = (await response.json()) as {
        message: { content: string };
      };

      const agentMessage: Message = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        content: data.message.content,
        sender: "agent",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, agentMessage]);
    } catch (err) {
      console.error("Paid chat failed", err);
      toast({
        title: "Request failed",
        description:
          err instanceof Error
            ? err.message
            : "We could not settle the payment.",
        variant: "destructive",
      });
      setMessages((prev) => [
        ...prev,
        {
          id: `${userMessage.id}-error`,
          content:
            err instanceof Error
              ? `Payment or AI request failed: ${err.message}`
              : "Payment or AI request failed. Please try again.",
          sender: "agent",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsSending(false);
    }
  }, [agent, address, getPaymentFetcher, inputValue, messages, toast]);

  if (isLoading) {
    return (
      <div className="h-screen bg-background flex items-center justify-center text-muted-foreground">
        Loading agent chat…
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="h-screen bg-background flex flex-col items-center justify-center gap-4 text-center px-6">
        <div className="text-2xl font-semibold">
          {error ?? "Agent not found."}
        </div>
        <Button asChild variant="outline">
          <Link href="/marketplace">Back to marketplace</Link>
        </Button>
      </div>
    );
  }

  const avatarIsImage =
    agent.avatar.startsWith("http") || agent.avatar.startsWith("data:");
  const agentAvatarLabel = agent.avatar || "🤖";
  const userAvatarLabel = address ? address.slice(2, 4).toUpperCase() : "U";
  const connectLabel = address
    ? `Connected: ${address.slice(0, 6)}…${address.slice(-4)}`
    : isConnecting
    ? "Connecting…"
    : "Connect wallet";

  return (
    <div className="h-screen bg-background flex flex-col">
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/marketplace">
                <ArrowLeft className="w-4 h-4" />
              </Link>
            </Button>

            <div className="flex items-center gap-3">
              <Avatar className="w-10 h-10">
                {avatarIsImage ? (
                  <AvatarImage src={agent.avatar} alt={agent.name} />
                ) : (
                  <AvatarFallback className="text-lg">
                    {agentAvatarLabel}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <h1 className="font-semibold text-foreground">{agent.name}</h1>
                <div className="text-sm text-muted-foreground flex items-center gap-2">
                  <Badge variant="outline">{agent.category}</Badge>
                  <span>{agent.pricing.displayLabel}</span>
                </div>
              </div>
            </div>
          </div>

          <Button
            variant={address ? "secondary" : "default"}
            size="sm"
            className="flex items-center gap-2"
            onClick={address ? disconnect : handleConnectWallet}
            disabled={isConnecting}
          >
            <Wallet2 className="w-4 h-4" />
            {connectLabel}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className={`flex gap-3 max-w-2xl ${
                message.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                {message.sender === "user" ? (
                  <AvatarFallback className="text-sm">
                    {userAvatarLabel}
                  </AvatarFallback>
                ) : avatarIsImage ? (
                  <AvatarImage src={agent.avatar} alt={agent.name} />
                ) : (
                  <AvatarFallback className="text-sm">
                    {agentAvatarLabel}
                  </AvatarFallback>
                )}
              </Avatar>

              <div
                className={`space-y-1 ${
                  message.sender === "user" ? "items-end" : "items-start"
                } flex flex-col`}
              >
                <div
                  className={`px-4 py-3 rounded-2xl ${
                    message.sender === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {message.timestamp.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isSending && (
          <div className="flex justify-start">
            <div className="px-4 py-3 bg-muted rounded-2xl text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing payment and generating response…
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-card px-6 py-4">
        <div className="flex items-end gap-3">
          <Input
            value={inputValue}
            onChange={(event) => setInputValue(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder={`Ask ${agent.name}…`}
            className="py-3 text-sm"
            disabled={isSending}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isSending || !inputValue.trim()}
            size="sm"
          >
            {isSending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mt-3 text-xs text-muted-foreground">
          <span>
            Settled-first payments · {agent.pricing.displayLabel} (
            {agent.pricing.priceMoney} USD reference)
          </span>
          {lastReceipt && <span>Receipt: {lastReceipt.slice(0, 18)}…</span>}
        </div>
      </div>
    </div>
  );
}
