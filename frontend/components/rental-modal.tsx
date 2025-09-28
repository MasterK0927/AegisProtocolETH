"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { formatEther } from "ethers";
import {
  ArrowLeft,
  ArrowRight,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Info,
  KeyRound,
  Timer,
  Wallet,
  Zap,
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useWeb3 } from "@/hooks/use-web3";
import { rentAgent } from "@/lib/rentals";
import type { AgentData } from "@/lib/agents";
import { getRequiredApiKeys } from "@/lib/real-tools";
import { getLLMProvider } from "@/lib/llms";
import {
  normalizeCredentialKey,
  useAgentCredentials,
  type AgentCredentials,
} from "@/hooks/use-agent-credentials";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

interface RentalModalProps {
  isOpen: boolean;
  onClose: () => void;
  agent: AgentData;
}

const quickTimeOptions = [
  { hours: 1, label: "1 hour", popular: false },
  { hours: 3, label: "3 hours", popular: true },
  { hours: 6, label: "6 hours", popular: false },
  { hours: 12, label: "12 hours", popular: true },
  { hours: 24, label: "24 hours", popular: false },
];

export function RentalModal({ isOpen, onClose, agent }: RentalModalProps) {
  const [hours, setHours] = useState([3]);
  const [showWalletSelection, setShowWalletSelection] = useState(false);
  const [selectedQuickTime, setSelectedQuickTime] = useState(3);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rememberKeys, setRememberKeys] = useState(false);
  const [formTouched, setFormTouched] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);
  const [llmApiKey, setLlmApiKey] = useState("");
  const [showLlmKey, setShowLlmKey] = useState(false);
  const [toolKeys, setToolKeys] = useState<Record<string, string>>({});
  const [visibleToolKeys, setVisibleToolKeys] = useState<
    Record<string, boolean>
  >({});
  const [credentialSnapshot, setCredentialSnapshot] =
    useState<AgentCredentials | null>(null);

  const router = useRouter();
  const { toast } = useToast();
  const { signer, connect, chainId, isConnecting } = useWeb3();
  const {
    credentials,
    isLoaded: credentialsLoaded,
    isPersisted,
    setCredentials: persistCredentials,
  } = useAgentCredentials(agent.tokenId);

  const llmConfig = useMemo(() => {
    const aegis = agent.metadata?.aegis as
      | { llmConfig?: { provider?: string; model?: string } }
      | undefined;
    return aegis?.llmConfig;
  }, [agent.metadata]);

  const llmProvider = useMemo(
    () => getLLMProvider(llmConfig?.provider ?? ""),
    [llmConfig?.provider]
  );

  const toolRequirements = useMemo(
    () =>
      getRequiredApiKeys(agent.tools).map((requirement) => ({
        ...requirement,
        key: normalizeCredentialKey(requirement.provider),
      })),
    [agent.tools]
  );

  useEffect(() => {
    setFormInitialized(false);
    setFormTouched(false);
    setShowWalletSelection(false);
  }, [agent.tokenId]);

  useEffect(() => {
    if (isOpen) {
      setFormInitialized(false);
    } else {
      setFormTouched(false);
      setShowWalletSelection(false);
      setShowLlmKey(false);
      setVisibleToolKeys({});
    }
  }, [isOpen]);

  useEffect(() => {
    if (!credentialsLoaded || formInitialized) {
      return;
    }

    if (llmProvider && credentials.llm?.provider === llmProvider.id) {
      setLlmApiKey(credentials.llm.apiKey ?? "");
    } else {
      setLlmApiKey("");
    }

    const nextToolKeys: Record<string, string> = {};
    toolRequirements.forEach((requirement) => {
      const stored = credentials.tools[requirement.key]?.apiKey ?? "";
      nextToolKeys[requirement.key] = stored;
    });
    setToolKeys(nextToolKeys);
    setVisibleToolKeys((previous) => {
      const next: Record<string, boolean> = {};
      toolRequirements.forEach((requirement) => {
        next[requirement.key] = previous[requirement.key] ?? false;
      });
      return next;
    });
    setRememberKeys(isPersisted);

    const hasStoredCredentials =
      Boolean(credentials.llm?.apiKey) ||
      Object.values(credentials.tools).some((tool) => Boolean(tool?.apiKey));
    setCredentialSnapshot(hasStoredCredentials ? credentials : null);
    setFormInitialized(true);
  }, [
    credentials,
    credentialsLoaded,
    formInitialized,
    isPersisted,
    llmProvider,
    toolRequirements,
  ]);

  const durationSeconds = useMemo(() => BigInt(hours[0]) * 3600n, [hours]);
  const totalCostWei = useMemo(
    () => agent.pricePerSecondWei * durationSeconds,
    [agent.pricePerSecondWei, durationSeconds]
  );
  const totalCostEth = useMemo(
    () => Number.parseFloat(formatEther(totalCostWei)),
    [totalCostWei]
  );
  const platformFee = useMemo(() => totalCostEth * 0.025, [totalCostEth]);
  const finalCost = useMemo(
    () => totalCostEth + platformFee,
    [totalCostEth, platformFee]
  );

  const credentialValidation = useMemo(() => {
    const llmMissing = Boolean(llmProvider && !llmApiKey.trim());
    const missingTools = toolRequirements.filter(
      (requirement) => !toolKeys[requirement.key]?.trim()
    );
    return {
      llmMissing,
      missingTools,
      hasErrors: llmMissing || missingTools.length > 0,
    };
  }, [llmProvider, llmApiKey, toolRequirements, toolKeys]);

  const missingCredentialProviders = useMemo(() => {
    const missing: string[] = [];
    if (credentialValidation.llmMissing && llmProvider) {
      missing.push(llmProvider.name);
    }
    credentialValidation.missingTools.forEach((requirement) => {
      missing.push(requirement.provider);
    });
    return missing;
  }, [credentialValidation, llmProvider]);

  const missingCredentialList = useMemo(() => {
    if (missingCredentialProviders.length === 0) {
      return "";
    }
    if (missingCredentialProviders.length === 1) {
      return missingCredentialProviders[0];
    }
    if (typeof Intl.ListFormat !== "undefined") {
      const formatter = new Intl.ListFormat("en", {
        style: "short",
        type: "conjunction",
      });
      return formatter.format(missingCredentialProviders);
    }
    return missingCredentialProviders.join(", ");
  }, [missingCredentialProviders]);

  const continueButtonLabel = useMemo(() => {
    if (!credentialsLoaded) {
      return "Loading credentials…";
    }
    if (isProcessing) {
      return "Preparing checkout…";
    }
    if (isConnecting) {
      return "Connecting wallet…";
    }
    if (missingCredentialProviders.length > 0) {
      return "Add required API keys";
    }
    return "Continue to Payment";
  }, [
    credentialsLoaded,
    isProcessing,
    isConnecting,
    missingCredentialProviders.length,
  ]);

  const continueButtonDisabled =
    isConnecting || isProcessing || !credentialsLoaded;

  const ContinueIcon = missingCredentialProviders.length > 0 ? KeyRound : Clock;

  const credentialSummary = useMemo(() => {
    const snapshot = credentialSnapshot ?? credentials;
    const providerSet = new Set<string>();
    if (snapshot.llm?.apiKey) {
      providerSet.add(llmProvider?.name ?? snapshot.llm.provider);
    }

    let savedToolCount = 0;
    toolRequirements.forEach((requirement) => {
      if (snapshot.tools?.[requirement.key]?.apiKey) {
        providerSet.add(requirement.provider);
        savedToolCount += 1;
      }
    });

    const providers = Array.from(providerSet);
    const requiredCount = (llmProvider ? 1 : 0) + toolRequirements.length;

    return {
      providers,
      savedCount: providers.length,
      savedToolCount,
      requiredCount,
      hasAny: providers.length > 0,
    };
  }, [credentialSnapshot, credentials, llmProvider, toolRequirements]);

  const handleQuickTimeSelect = (selectedHours: number) => {
    setHours([selectedHours]);
    setSelectedQuickTime(selectedHours);
  };

  const handleSliderChange = (newHours: number[]) => {
    setHours(newHours);
    setSelectedQuickTime(0); // Clear quick selection when using slider
  };

  const handleRent = () => {
    setFormTouched(true);

    if (!credentialsLoaded) {
      toast({
        title: "Loading credentials",
        description: "Please wait a moment while we prepare the checkout.",
      });
      return;
    }

    if (credentialValidation.llmMissing && llmProvider) {
      toast({
        title: "LLM API key required",
        description: `Provide your ${llmProvider.name} API key to continue.`,
        variant: "destructive",
      });
      return;
    }

    if (credentialValidation.missingTools.length > 0) {
      const missing = credentialValidation.missingTools[0];
      toast({
        title: "Tool API key missing",
        description: `Enter the required API key for ${missing.provider}.`,
        variant: "destructive",
      });
      return;
    }

    const payload: AgentCredentials = {
      llm: llmProvider
        ? {
            provider: llmProvider.id,
            model: llmConfig?.model,
            apiKey: llmApiKey.trim(),
          }
        : undefined,
      tools: {},
    };

    toolRequirements.forEach((requirement) => {
      const value = toolKeys[requirement.key]?.trim();
      if (value) {
        payload.tools[requirement.key] = {
          providerLabel: requirement.provider,
          apiKey: value,
          toolIds: requirement.tools,
        };
      }
    });

    persistCredentials(payload, { persist: rememberKeys });
    setCredentialSnapshot(payload);
    setShowWalletSelection(true);
  };

  const handleWalletConnect = async () => {
    let activeSigner = signer;
    let activeChainId = chainId;

    try {
      if (!activeSigner || !activeChainId) {
        const result = await connect();
        activeSigner = result.signer;
        activeChainId = result.chainId;
      }
    } catch (error) {
      toast({
        title: "Wallet connection failed",
        description:
          error instanceof Error
            ? error.message
            : "Please ensure MetaMask is installed and unlocked.",
        variant: "destructive",
      });
      return;
    }

    if (!activeSigner || !activeChainId) {
      toast({
        title: "Wallet not connected",
        description: "Please connect your wallet to continue.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);

    try {
      await rentAgent(agent.tokenId, hours[0], {
        signer: activeSigner,
        chainId: activeChainId,
      });
      toast({
        title: "Rental confirmed",
        description: `${agent.name} is now rented for ${hours[0]} hour(s).`,
      });
      onClose();
      router.push(`/chat/${agent.tokenId}`);
    } catch (error) {
      console.error("Rental failed", error);
      toast({
        title: "Unable to complete rental",
        description:
          error instanceof Error
            ? error.message
            : "Check your wallet confirmation and try again.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const getSavingsText = () => {
    if (hours[0] >= 12) return "Best value for extended use";
    if (hours[0] >= 6) return "Great for complex projects";
    if (hours[0] >= 3) return "Popular choice";
    return "Perfect for quick tasks";
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        {!showWalletSelection ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{agent.avatar}</span>
                Rent {agent.name}
              </DialogTitle>
              <DialogDescription>
                Choose your rental duration and complete payment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Quick Time Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Quick Select</Label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {quickTimeOptions.map((option) => (
                    <Button
                      key={option.hours}
                      variant={
                        selectedQuickTime === option.hours
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      className="relative flex h-auto flex-col rounded-lg py-3"
                      onClick={() => handleQuickTimeSelect(option.hours)}
                    >
                      {option.popular && (
                        <Badge className="absolute -top-2 -right-1 text-xs px-1 py-0 h-4">
                          Popular
                        </Badge>
                      )}
                      <Timer className="w-3 h-3 mb-1" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground">
                  or customize
                </span>
                <div className="flex-1 h-px bg-border"></div>
              </div>

              {/* Custom Time Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Custom Duration</Label>
                <div className="px-4">
                  <Slider
                    value={hours}
                    onValueChange={handleSliderChange}
                    max={48}
                    min={1}
                    step={1}
                    className="w-full"
                  />
                  <div className="flex justify-between text-sm text-muted-foreground mt-2">
                    <span>1 hour</span>
                    <span>48 hours</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-foreground">
                    {hours[0]} hour{hours[0] > 1 ? "s" : ""}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {getSavingsText()}
                  </div>
                </div>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      Agent rental ({hours[0]}h ×{" "}
                      {agent.hourlyRateEth.toFixed(4)} ETH)
                    </span>
                    <span>{totalCostEth.toFixed(4)} ETH</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Platform fee (2.5%)</span>
                    <span>{platformFee.toFixed(4)} ETH</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-medium text-lg">
                    <span>Total</span>
                    <span>{finalCost.toFixed(4)} ETH</span>
                  </div>
                  <div className="text-center text-xs text-muted-foreground">
                    ≈ ${(finalCost * 2500).toFixed(2)} USD
                  </div>
                </CardContent>
              </Card>

              {/* Credential Collection */}
              <Card>
                <CardHeader className="pb-0">
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <KeyRound className="w-5 h-5 text-primary" />
                    Provide API credentials
                  </CardTitle>
                  <CardDescription>
                    We&apos;ll only use your keys during this rental. They never
                    leave your browser or touch the blockchain.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  {llmProvider ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-3">
                        <Label
                          htmlFor="llm-api-key"
                          className="text-sm font-medium"
                        >
                          {llmProvider.name} API key
                        </Label>
                        <Button
                          asChild
                          variant="link"
                          className="h-auto px-0 text-xs"
                        >
                          <a
                            href={llmProvider.apiKeyUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Get key
                            <ExternalLink className="w-3 h-3 ml-1 inline" />
                          </a>
                        </Button>
                      </div>
                      <div className="flex gap-2">
                        <Input
                          id="llm-api-key"
                          type={showLlmKey ? "text" : "password"}
                          value={llmApiKey}
                          onChange={(event) => setLlmApiKey(event.target.value)}
                          placeholder={`Enter your ${llmProvider.name} API key`}
                          className={
                            formTouched && credentialValidation.llmMissing
                              ? "border-destructive focus-visible:ring-destructive"
                              : undefined
                          }
                          disabled={isProcessing}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-10 w-10"
                          onClick={() => setShowLlmKey((previous) => !previous)}
                          aria-label={
                            showLlmKey ? "Hide API key" : "Show API key"
                          }
                        >
                          {showLlmKey ? (
                            <EyeOff className="w-4 h-4" />
                          ) : (
                            <Eye className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                      {formTouched && credentialValidation.llmMissing && (
                        <p className="text-xs text-destructive">
                          This key is required to access the agent&apos;s
                          language model.
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Stored safely in your browser. Clear the toggle below if
                        you prefer to keep it for this rental session only.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-md bg-muted/60 p-3 text-xs text-muted-foreground">
                      The agent creator hasn&apos;t provided LLM details.
                      We&apos;ll prompt you in chat if an API key becomes
                      necessary.
                    </div>
                  )}

                  {toolRequirements.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-sm font-medium">
                        Tool credentials
                      </Label>
                      {toolRequirements.map((requirement) => {
                        const value = toolKeys[requirement.key] ?? "";
                        const visible =
                          visibleToolKeys[requirement.key] ?? false;
                        const isMissing = formTouched && !value.trim();
                        return (
                          <div
                            key={requirement.key}
                            className="space-y-2 rounded-lg border border-border/70 p-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-sm font-medium">
                                  {requirement.provider}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Used for: {requirement.tools.join(", ")}
                                </p>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2"
                                onClick={() =>
                                  setVisibleToolKeys((previous) => ({
                                    ...previous,
                                    [requirement.key]: !visible,
                                  }))
                                }
                                aria-label={
                                  visible ? "Hide API key" : "Show API key"
                                }
                              >
                                {visible ? (
                                  <EyeOff className="w-4 h-4" />
                                ) : (
                                  <Eye className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                            <Input
                              type={visible ? "text" : "password"}
                              value={value}
                              onChange={(event) =>
                                setToolKeys((previous) => ({
                                  ...previous,
                                  [requirement.key]: event.target.value,
                                }))
                              }
                              placeholder={`Enter your ${requirement.provider} API key`}
                              className={
                                isMissing
                                  ? "border-destructive focus-visible:ring-destructive"
                                  : undefined
                              }
                              disabled={isProcessing}
                            />
                            {isMissing && (
                              <p className="text-xs text-destructive">
                                Required for the listed tools during the rental.
                              </p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded-lg border px-4 py-3">
                    <div>
                      <p className="text-sm font-medium">
                        Remember on this device
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Toggle on to store keys securely in this browser for
                        future rentals.
                      </p>
                    </div>
                    <Switch
                      checked={rememberKeys}
                      onCheckedChange={(checked) => setRememberKeys(checked)}
                      disabled={isProcessing}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    You can update or clear these API keys anytime from the chat
                    page during your rental.
                  </p>
                </CardContent>
              </Card>

              {formTouched && credentialValidation.hasErrors && (
                <Alert
                  variant="destructive"
                  className="flex items-start gap-3 border-destructive/40 bg-destructive/10"
                >
                  <Info className="mt-0.5 h-4 w-4" />
                  <AlertTitle className="text-sm font-medium">
                    API keys required
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    <p className="mb-1">
                      Add the following credentials before continuing:
                    </p>
                    <ul className="list-inside list-disc space-y-0.5">
                      {missingCredentialProviders.map((provider) => (
                        <li key={provider}>{provider}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-green-500" />
                  <span>Instant access</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  <span>24/7 availability</span>
                </div>
                <div className="flex items-center gap-2">
                  <Timer className="w-4 h-4 text-purple-500" />
                  <span>Auto-renewal option</span>
                </div>
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-orange-500" />
                  <span>Secure payments</span>
                </div>
              </div>

              <Button
                onClick={handleRent}
                className="w-full"
                size="lg"
                variant={
                  missingCredentialProviders.length > 0
                    ? "secondary"
                    : "default"
                }
                disabled={continueButtonDisabled}
              >
                <ContinueIcon className="w-4 h-4 mr-2" />
                {continueButtonLabel}
              </Button>
              {missingCredentialProviders.length > 0 && !formTouched && (
                <p className="text-xs text-muted-foreground text-center">
                  Enter {missingCredentialList} to unlock checkout.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </DialogTitle>
              <DialogDescription>
                Choose your wallet to complete the rental payment
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Payment Summary */}
              <Card className="bg-muted/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">{agent.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {hours[0]} hour{hours[0] > 1 ? "s" : ""} rental
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold">
                        {finalCost.toFixed(4)} ETH
                      </div>
                      <div className="text-sm text-muted-foreground">
                        ≈ ${(finalCost * 2500).toFixed(2)} USD
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {credentialSummary.hasAny ? (
                <Card className="border-green-500/40 bg-green-500/5">
                  <CardContent className="p-4 space-y-1">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-green-700 dark:text-green-400">
                          Credentials ready
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {credentialSummary.providers.join(", ")}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {credentialSummary.savedCount} saved
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      You can update keys from the chat screen at any time.
                    </p>
                  </CardContent>
                </Card>
              ) : credentialSummary.requiredCount > 0 ? (
                <Card className="border-amber-500/40 bg-amber-500/10">
                  <CardContent className="p-3 text-xs text-amber-600">
                    No API keys detected. Go back to add the required
                    credentials before completing payment.
                  </CardContent>
                </Card>
              ) : (
                <Card className="bg-muted/40 border-dashed">
                  <CardContent className="p-3 text-xs text-muted-foreground">
                    This agent doesn&apos;t require any external API keys to get
                    started.
                  </CardContent>
                </Card>
              )}

              {/* Wallet Options */}
              <Card
                className={`cursor-pointer transition-colors ${
                  isProcessing || isConnecting
                    ? "opacity-60 pointer-events-none"
                    : "hover:bg-muted/50"
                }`}
                onClick={() => {
                  if (!isProcessing && !isConnecting) {
                    void handleWalletConnect();
                  }
                }}
              >
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">M</span>
                      </div>
                      <div>
                        <div className="font-medium">MetaMask</div>
                        <div className="text-sm text-muted-foreground">
                          {isProcessing
                            ? "Waiting for confirmation…"
                            : isConnecting
                            ? "Check your wallet to confirm"
                            : "Connect using browser wallet"}
                        </div>
                      </div>
                    </div>
                    {!isProcessing && !isConnecting && (
                      <ArrowRight className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">
                  More wallet options coming soon
                </div>
                <div className="flex items-center justify-center gap-4 opacity-50">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">CB</span>
                  </div>
                  <div className="w-8 h-8 bg-purple-500 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">WC</span>
                  </div>
                  <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-xs">L</span>
                  </div>
                </div>
              </div>

              <div className="text-xs text-muted-foreground text-center p-3 bg-muted rounded-lg">
                <p>🔒 Your payment is secured by blockchain technology</p>
                <p>Rental starts immediately after confirmation</p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowWalletSelection(false)}
                disabled={isProcessing}
              >
                <ArrowLeft className="mr-2 h-4 w-4" /> Edit rental details
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
