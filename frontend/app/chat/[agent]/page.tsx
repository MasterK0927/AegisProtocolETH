"use client";

import type React from "react";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Clock,
  Download,
  Mic,
  MoreVertical,
  Paperclip,
  Send,
  Share,
  Square,
  Timer,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { fetchAgent, type AgentData } from "@/lib/agents";
import { fetchActiveRental, type ActiveRental } from "@/lib/rentals";
import { ApiKeyModal } from "@/components/api-key-modal";
import { createLLMService, type LLMMessage } from "@/lib/llm-service";

type Message = {
  id: string;
  content: string;
  sender: "user" | "agent";
  timestamp: Date;
  type?: "text" | "file" | "image";
};

function formatAddress(address?: string | null) {
  if (!address) {
    return "";
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export default function ChatPage({ params }: { params: { agent: string } }) {
  const tokenId = useMemo(
    () => Number.parseInt(params.agent, 10),
    [params.agent]
  );
  const { toast } = useToast();
  const { address, connect, disconnect, isConnecting, chainId } = useWeb3();

  const [agent, setAgent] = useState<AgentData | null>(null);
  const [rental, setRental] = useState<ActiveRental | null>(null);
  const [rentalLoaded, setRentalLoaded] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasInitializedMessages, setHasInitializedMessages] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [userIsRenter, setUserIsRenter] = useState(false);
  const [renterApiKeys, setRenterApiKeys] = useState<Record<
    string,
    string
  > | null>(null);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refreshRental = useCallback(async () => {
    if (Number.isNaN(tokenId)) {
      return;
    }

    try {
      const rentalData = await fetchActiveRental(
        tokenId,
        chainId ? { chainId } : undefined
      );
      setRental(rentalData);
      setRentalLoaded(true);
    } catch (err) {
      console.error("Failed to fetch rental information", err);
    }
  }, [tokenId, chainId]);

  const updateTimeRemaining = useCallback(() => {
    if (!rental) {
      setTimeRemaining(null);
      setSessionActive(false);
      setUserIsRenter(false);
      return;
    }

    const nowSeconds = BigInt(Math.floor(Date.now() / 1000));
    if (rental.expiresAt <= nowSeconds) {
      setTimeRemaining(null);
      setSessionActive(false);
      setUserIsRenter(false);
      return;
    }

    const secondsLeft = rental.expiresAt - nowSeconds;
    const hours = Number(secondsLeft / 3600n);
    const minutes = Number((secondsLeft % 3600n) / 60n);
    const label =
      secondsLeft < 60n
        ? "<1m"
        : `${hours > 0 ? `${hours}h ` : ""}${minutes
            .toString()
            .padStart(2, "0")}m`;

    setTimeRemaining(label.trim());
    setSessionActive(true);
    const normalizedAddress = address?.toLowerCase();
    setUserIsRenter(
      Boolean(normalizedAddress) && rental.renter === normalizedAddress
    );
  }, [address, rental]);

  useEffect(() => {
    if (Number.isNaN(tokenId)) {
      setError("Invalid agent identifier.");
      setIsLoading(false);
      return;
    }

    let cancelled = false;

    const load = async () => {
      setIsLoading(true);
      setError(null);

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
      } catch (err) {
        console.error("Failed to load agent", err);
        if (!cancelled) {
          setError(
            "Unable to load agent data. Ensure the local Hardhat node is running and contracts are deployed."
          );
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    load();

    return () => {
      cancelled = true;
    };
  }, [tokenId]);

  useEffect(() => {
    setRentalLoaded(false);
    setSessionActive(false);
    setUserIsRenter(false);
    setTimeRemaining(null);
    setRental(null);
  }, [tokenId]);

  useEffect(() => {
    if (Number.isNaN(tokenId)) {
      return;
    }

    refreshRental();
    const interval = setInterval(refreshRental, 30000);
    return () => clearInterval(interval);
  }, [tokenId, refreshRental]);

  useEffect(() => {
    updateTimeRemaining();
    if (!rental) {
      return;
    }

    const interval = setInterval(updateTimeRemaining, 30000);
    return () => clearInterval(interval);
  }, [rental, updateTimeRemaining]);

  useEffect(() => {
    updateTimeRemaining();
  }, [address, updateTimeRemaining]);

  // Check for stored API keys when user is renter and session is active
  useEffect(() => {
    if (userIsRenter && sessionActive && !renterApiKeys) {
      const storedKeys = sessionStorage.getItem(`agent_${tokenId}_api_keys`);
      if (storedKeys) {
        try {
          setRenterApiKeys(JSON.parse(storedKeys));
        } catch (e) {
          console.error("Failed to parse stored API keys:", e);
          setShowApiKeyModal(true);
        }
      } else {
        setShowApiKeyModal(true);
      }
    }
  }, [userIsRenter, sessionActive, tokenId, renterApiKeys]);

  useEffect(() => {
    if (!agent || hasInitializedMessages) {
      return;
    }

    const intro =
      agent.shortDescription ||
      agent.description ||
      "I'm ready to help you today.";
    setMessages([
      {
        id: "intro",
        content: `Hello! I'm ${agent.name}. ${intro}`,
        sender: "agent",
        timestamp: new Date(),
      },
    ]);
    setHasInitializedMessages(true);
  }, [agent, hasInitializedMessages]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const banner = useMemo(() => {
    if (!rentalLoaded) {
      return null;
    }

    if (!address) {
      return {
        tone: "warning" as const,
        message: "Connect your wallet to access your rental session.",
      };
    }

    if (!sessionActive) {
      return {
        tone: "warning" as const,
        message:
          "You don't have an active rental for this agent. Rent it from the marketplace to start chatting.",
      };
    }

    if (!userIsRenter) {
      return {
        tone: "warning" as const,
        message: "This agent is currently rented by another wallet.",
      };
    }

    if (!renterApiKeys) {
      return {
        tone: "info" as const,
        message:
          "API keys required to use this agent. Click to configure your API keys.",
        action: () => setShowApiKeyModal(true),
      };
    }

    return null;
  }, [address, rentalLoaded, sessionActive, userIsRenter, renterApiKeys]);

  const canSendMessages = Boolean(
    address && sessionActive && userIsRenter && renterApiKeys
  );

  const handleApiKeysSubmitted = (apiKeys: Record<string, string>) => {
    setRenterApiKeys(apiKeys);
    sessionStorage.setItem(
      `agent_${tokenId}_api_keys`,
      JSON.stringify(apiKeys)
    );
    setShowApiKeyModal(false);

    toast({
      title: "API keys configured",
      description: "You can now chat with the agent using your API keys.",
    });
  };

  const handleSendMessage = useCallback(() => {
    if (!agent) {
      return;
    }

    if (!inputValue.trim()) {
      return;
    }

    if (!canSendMessages) {
      toast({
        title: "No active rental",
        description:
          "You need an active rental to send messages to this agent.",
        variant: "destructive",
      });
      return;
    }

    if (!renterApiKeys) {
      toast({
        title: "API keys required",
        description: "Please provide your API keys to use this agent.",
        variant: "destructive",
      });
      setShowApiKeyModal(true);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    // Call LLM with renter's API keys
    (async () => {
      try {
        const llmService = createLLMService(renterApiKeys);

        // Convert chat messages to LLM format
        const llmMessages: LLMMessage[] = messages
          .filter((m) => m.sender !== "agent" || m.id !== "intro") // Exclude intro message
          .map((m) => ({
            role:
              m.sender === "user" ? ("user" as const) : ("assistant" as const),
            content: m.content,
          }));

        // Add the current user message
        llmMessages.push({
          role: "user",
          content: inputValue,
        });

        // Get LLM config from agent metadata
        const llmConfig = agent.metadata?.aegis?.llmConfig;
        if (!llmConfig?.provider || !llmConfig?.model) {
          throw new Error("Agent LLM configuration is incomplete");
        }

        const response = await llmService.callLLM(
          llmMessages,
          {
            provider: llmConfig.provider,
            model: llmConfig.model,
            temperature: llmConfig.temperature || 0.7,
            maxTokens: llmConfig.maxTokens || 2000,
          },
          agent
        );

        const agentMessage: Message = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          content: response.content,
          sender: "agent",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, agentMessage]);
      } catch (error) {
        console.error("LLM call failed:", error);

        const errorMessage: Message = {
          id: `${Date.now()}-error`,
          content: `I apologize, but I encountered an error while processing your request: ${
            error instanceof Error ? error.message : "Unknown error"
          }. Please check your API keys and try again.`,
          sender: "agent",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, errorMessage]);

        toast({
          title: "AI Response Error",
          description:
            error instanceof Error
              ? error.message
              : "Failed to get response from AI",
          variant: "destructive",
        });
      } finally {
        setIsTyping(false);
      }
    })();
  }, [agent, canSendMessages, inputValue, toast, renterApiKeys, tokenId]);

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleConnect = useCallback(async () => {
    try {
      await connect();
      await refreshRental();
    } catch (err) {
      toast({
        title: "Wallet connection failed",
        description:
          err instanceof Error
            ? err.message
            : "Please ensure MetaMask is installed and unlocked.",
        variant: "destructive",
      });
    }
  }, [connect, refreshRental, toast]);

  const handleExtendTime = useCallback(() => {
    toast({
      title: "Extend rental coming soon",
      description: "You'll be able to extend sessions in a future update.",
    });
  }, [toast]);

  const handleEndSession = useCallback(() => {
    toast({
      title: "Manual end not available",
      description: "Sessions expire automatically when the rental ends.",
    });
  }, [toast]);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
  };

  const statusDotClass = sessionActive
    ? userIsRenter
      ? "text-green-500"
      : "text-amber-500"
    : "text-muted-foreground";
  const sessionStatus = sessionActive
    ? userIsRenter
      ? "Active rental"
      : "In use by another wallet"
    : "No active rental";

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

  const displayedCapabilities =
    agent.capabilities.length > 0 ? agent.capabilities.slice(0, 4) : [];
  const avatarIsImage =
    agent.avatar.startsWith("http") || agent.avatar.startsWith("data:");
  const agentAvatarLabel = agent.avatar || "🤖";
  const userAvatarLabel = address ? address.slice(2, 4).toUpperCase() : "U";
  const walletButtonDisabled = Boolean(isConnecting && !address);
  const walletButtonLabel = address
    ? formatAddress(address)
    : isConnecting
    ? "Connecting…"
    : "Connect Wallet";

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
              <div className="relative">
                <Avatar className="w-10 h-10">
                  {avatarIsImage ? (
                    <AvatarImage src={agent.avatar} alt={agent.name} />
                  ) : (
                    <AvatarFallback className="text-lg">
                      {agentAvatarLabel}
                    </AvatarFallback>
                  )}
                </Avatar>
                {sessionActive && userIsRenter && (
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>

              <div>
                <h1 className="font-semibold text-foreground">{agent.name}</h1>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className={statusDotClass}>●</span>
                  <span>{sessionStatus}</span>
                  {sessionActive && timeRemaining && (
                    <>
                      <span>•</span>
                      <Clock className="w-3 h-3" />
                      <span>{timeRemaining} remaining</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              {displayedCapabilities.length > 0 ? (
                displayedCapabilities.map((capability) => (
                  <Badge
                    key={capability}
                    variant="secondary"
                    className="text-xs"
                  >
                    {capability}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="text-xs">
                  No capabilities listed
                </Badge>
              )}
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={walletButtonDisabled && !address}
              onClick={address ? disconnect : handleConnect}
            >
              {walletButtonLabel}
            </Button>

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

      {banner && (
        <div className="px-6 py-3">
          <div
            className={`px-4 py-3 rounded-lg text-sm border ${
              banner.tone === "info"
                ? "bg-blue-500/10 border-blue-500/40 text-blue-600 cursor-pointer hover:bg-blue-500/20"
                : "bg-amber-500/10 border-amber-500/40 text-amber-600"
            }`}
            onClick={banner.action}
          >
            {banner.message}
          </div>
        </div>
      )}

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
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatTime(message.timestamp)}
                </span>
              </div>
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex justify-start">
            <div className="flex gap-3 max-w-2xl">
              <Avatar className="w-8 h-8">
                {avatarIsImage ? (
                  <AvatarImage src={agent.avatar} alt={agent.name} />
                ) : (
                  <AvatarFallback className="text-sm">
                    {agentAvatarLabel}
                  </AvatarFallback>
                )}
              </Avatar>
              <div className="bg-muted px-4 py-3 rounded-2xl">
                <div className="flex gap-1">
                  <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.1s" }}
                  />
                  <div
                    className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                    style={{ animationDelay: "0.2s" }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-border bg-card px-6 py-4">
        <div className="flex items-end gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="flex-shrink-0"
            disabled={!canSendMessages}
          >
            <Paperclip className="w-4 h-4" />
          </Button>

          <div className="flex-1 relative">
            <Input
              ref={inputRef}
              value={inputValue}
              onChange={(event) => setInputValue(event.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Message ${agent.name}...`}
              className="pr-12 py-3 text-sm resize-none min-h-[44px]"
              disabled={!canSendMessages}
            />
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-2 top-1/2 transform -translate-y-1/2"
              onClick={() => setIsRecording((prev) => !prev)}
              disabled={!canSendMessages}
            >
              {isRecording ? (
                <Square className="w-4 h-4 text-red-500" />
              ) : (
                <Mic className="w-4 h-4" />
              )}
            </Button>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!canSendMessages || !inputValue.trim()}
            size="sm"
            className="flex-shrink-0"
          >
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
              <span>
                Session{" "}
                {sessionActive && timeRemaining
                  ? `expires in ${timeRemaining}`
                  : "not active"}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={handleExtendTime}
              disabled={!canSendMessages}
            >
              Extend Time
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-6 px-2"
              onClick={handleEndSession}
              disabled={!canSendMessages}
            >
              End Session
            </Button>
          </div>
        </div>
      </div>

      {agent && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          onSubmit={handleApiKeysSubmitted}
          agent={agent}
        />
      )}
    </div>
  );
}
