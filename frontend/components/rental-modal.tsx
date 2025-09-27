"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"
import { Clock, Wallet, ArrowRight, Timer, Zap } from "lucide-react"

interface RentalModalProps {
  isOpen: boolean
  onClose: () => void
  agent: {
    name: string
    hourlyRate: number
    avatar: string
  }
}

const quickTimeOptions = [
  { hours: 1, label: "1 hour", popular: false },
  { hours: 3, label: "3 hours", popular: true },
  { hours: 6, label: "6 hours", popular: false },
  { hours: 12, label: "12 hours", popular: true },
  { hours: 24, label: "24 hours", popular: false },
]

export function RentalModal({ isOpen, onClose, agent }: RentalModalProps) {
  const [hours, setHours] = useState([3])
  const [showWalletSelection, setShowWalletSelection] = useState(false)
  const [selectedQuickTime, setSelectedQuickTime] = useState(3)

  const totalCost = hours[0] * agent.hourlyRate
  const platformFee = totalCost * 0.025 // 2.5% platform fee
  const finalCost = totalCost + platformFee

  const handleQuickTimeSelect = (selectedHours: number) => {
    setHours([selectedHours])
    setSelectedQuickTime(selectedHours)
  }

  const handleSliderChange = (newHours: number[]) => {
    setHours(newHours)
    setSelectedQuickTime(0) // Clear quick selection when using slider
  }

  const handleRent = () => {
    setShowWalletSelection(true)
  }

  const handleWalletConnect = () => {
    // In real app, this would connect to MetaMask and process payment
    alert(`Renting ${agent.name} for ${hours[0]} hour(s) - ${finalCost.toFixed(4)} ETH`)
    onClose()
    // Redirect to chat interface
    window.location.href = `/chat/${agent.name.toLowerCase().replace(/\s+/g, "-")}`
  }

  const getSavingsText = () => {
    if (hours[0] >= 12) return "Best value for extended use"
    if (hours[0] >= 6) return "Great for complex projects"
    if (hours[0] >= 3) return "Popular choice"
    return "Perfect for quick tasks"
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        {!showWalletSelection ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <span className="text-2xl">{agent.avatar}</span>
                Rent {agent.name}
              </DialogTitle>
              <DialogDescription>Choose your rental duration and complete payment</DialogDescription>
            </DialogHeader>

            <div className="space-y-6 py-4">
              {/* Quick Time Selection */}
              <div className="space-y-4">
                <Label className="text-base font-medium">Quick Select</Label>
                <div className="grid grid-cols-5 gap-2">
                  {quickTimeOptions.map((option) => (
                    <Button
                      key={option.hours}
                      variant={selectedQuickTime === option.hours ? "default" : "outline"}
                      size="sm"
                      className="relative flex flex-col h-auto py-3"
                      onClick={() => handleQuickTimeSelect(option.hours)}
                    >
                      {option.popular && (
                        <Badge className="absolute -top-2 -right-1 text-xs px-1 py-0 h-4">Popular</Badge>
                      )}
                      <Timer className="w-3 h-3 mb-1" />
                      <span className="text-xs">{option.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 h-px bg-border"></div>
                <span className="text-xs text-muted-foreground">or customize</span>
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
                  <div className="text-sm text-muted-foreground">{getSavingsText()}</div>
                </div>
              </div>

              <Separator />

              {/* Cost Breakdown */}
              <Card>
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span>
                      Agent rental ({hours[0]}h × {agent.hourlyRate} ETH)
                    </span>
                    <span>{totalCost.toFixed(4)} ETH</span>
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

              {/* Features */}
              <div className="grid grid-cols-2 gap-4 text-sm">
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

              <Button onClick={handleRent} className="w-full" size="lg">
                <Clock className="w-4 h-4 mr-2" />
                Continue to Payment
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Wallet className="w-5 h-5" />
                Connect Wallet
              </DialogTitle>
              <DialogDescription>Choose your wallet to complete the rental payment</DialogDescription>
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
                      <div className="font-bold">{finalCost.toFixed(4)} ETH</div>
                      <div className="text-sm text-muted-foreground">≈ ${(finalCost * 2500).toFixed(2)} USD</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Wallet Options */}
              <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={handleWalletConnect}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                        <span className="text-white font-bold text-lg">M</span>
                      </div>
                      <div>
                        <div className="font-medium">MetaMask</div>
                        <div className="text-sm text-muted-foreground">Connect using browser wallet</div>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <div className="text-center">
                <div className="text-sm text-muted-foreground mb-2">More wallet options coming soon</div>
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
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
