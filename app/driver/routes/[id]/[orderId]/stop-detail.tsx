"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Camera, PenTool, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"
import { updateStopStatus, savePOD, uploadToBlob } from "@/app/driver/actions"
import { SignaturePad } from "@/components/signature-pad"

interface StopDetailProps {
  order: any
  routeName: string
  routeId: string
  existingPod: any
}

export function StopDetail({ order, routeName, routeId, existingPod }: StopDetailProps) {
  const router = useRouter()
  const [notes, setNotes] = useState("")
  const [recipientName, setRecipientName] = useState("")
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingPod?.photo_url || null)
  const [showSignaturePad, setShowSignaturePad] = useState(false)
  const [signatureData, setSignatureData] = useState<string | null>(existingPod?.signature_url || null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const isCompleted = order.status === "delivered" || order.status === "failed"

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSignatureSave = (dataUrl: string) => {
    setSignatureData(dataUrl)
    setShowSignaturePad(false)
  }

  const handleDeliver = async () => {
    setIsSubmitting(true)
    try {
      let photoUrl = existingPod?.photo_url
      let signatureUrl = existingPod?.signature_url

      // Upload photo if present
      if (photoFile) {
        const reader = new FileReader()
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onloadend = () => resolve(reader.result as string)
          reader.onerror = () => reject(new Error("Failed to read file"))
          reader.readAsDataURL(photoFile)
        })

        const result = await uploadToBlob(
          base64Data,
          `pod-photos/${order.id}-${Date.now()}.jpg`,
          photoFile.type || "image/jpeg",
        )

        if (result.error) {
          throw new Error(result.error)
        }
        photoUrl = result.url
      }

      // Upload signature if present and changed
      if (signatureData && signatureData !== existingPod?.signature_url) {
        const result = await uploadToBlob(signatureData, `pod-signatures/${order.id}-${Date.now()}.png`, "image/png")

        if (result.error) {
          throw new Error(result.error)
        }
        signatureUrl = result.url
      }

      // Save POD data
      const podResult = await savePOD(order.id, photoUrl, signatureUrl, notes || undefined, recipientName || undefined)

      if (!podResult.success) {
        if (podResult.code === "AUTH_EXPIRED") {
          alert(podResult.error)
          window.location.href = "/auth/login"
          return
        }
        throw new Error(podResult.error)
      }

      // Update order status
      const statusResult = await updateStopStatus(order.id, "delivered", notes || undefined)

      if (!statusResult.success) {
        if (statusResult.code === "AUTH_EXPIRED") {
          alert(statusResult.error)
          window.location.href = "/auth/login"
          return
        }
        throw new Error(statusResult.error)
      }

      // Success - navigate back
      router.push(`/driver/routes/${routeId}`)
    } catch (error) {
      console.error("[v0] Error delivering order:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // More user-friendly error messages for mobile
      if (errorMessage.includes("Network")) {
        alert("Network error. Please check your connection and try again.")
      } else if (errorMessage.includes("Server Components")) {
        alert("There was a technical issue. Please try again or refresh the page.")
      } else {
        alert(`Failed to mark as delivered: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleFail = async () => {
    if (!notes.trim()) {
      alert("Please provide a reason for the failed delivery.")
      return
    }

    setIsSubmitting(true)
    try {
      const result = await updateStopStatus(order.id, "failed", notes)

      if (!result.success) {
        if (result.code === "AUTH_EXPIRED") {
          alert(result.error)
          window.location.href = "/auth/login"
          return
        }
        throw new Error(result.error)
      }

      router.push(`/driver/routes/${routeId}`)
    } catch (error) {
      console.error("[v0] Error marking as failed:", error)
      const errorMessage = error instanceof Error ? error.message : "Unknown error"
      
      // More user-friendly error messages for mobile
      if (errorMessage.includes("Network")) {
        alert("Network error. Please check your connection and try again.")
      } else if (errorMessage.includes("Server Components")) {
        alert("There was a technical issue. Please try again or refresh the page.")
      } else {
        alert(`Failed to update status: ${errorMessage}`)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background p-4 pb-20">
      <div className="max-w-2xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href={`/driver/routes/${routeId}`}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Stop #{order.stop_sequence}</h1>
            <p className="text-sm text-muted-foreground">{routeName}</p>
          </div>
        </div>

        {/* Order Info */}
        <Card className="p-4 space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Customer</p>
            <p className="font-medium">{order.customer_name}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Address</p>
            <p className="font-medium">{order.address}</p>
          </div>
          {order.phone && (
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">
                <a href={`tel:${order.phone}`} className="text-primary hover:underline">
                  {order.phone}
                </a>
              </p>
            </div>
          )}
          {order.notes && (
            <div>
              <p className="text-sm text-muted-foreground">Delivery Notes</p>
              <p className="font-medium">{order.notes}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="font-medium capitalize">{order.status}</p>
          </div>
        </Card>

        {!isCompleted && (
          <>
            {/* Photo Capture */}
            <Card className="p-4 space-y-3">
              <Label>Photo (Optional)</Label>
              {photoPreview ? (
                <div className="space-y-2">
                  <img src={photoPreview || "/placeholder.svg"} alt="Delivery proof" className="w-full rounded-lg" />
                  <Button
                    variant="outline"
                    className="w-full !bg-transparent !hover:bg-transparent"
                    onClick={() => {
                      setPhotoFile(null)
                      setPhotoPreview(null)
                    }}
                  >
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={handlePhotoChange}
                    className="hidden"
                    id="photo-input"
                  />
                  <label htmlFor="photo-input">
                    <Button variant="outline" className="w-full !bg-transparent !hover:bg-transparent" asChild>
                      <span>
                        <Camera className="h-4 w-4 mr-2" />
                        Take Photo
                      </span>
                    </Button>
                  </label>
                </div>
              )}
            </Card>

            {/* Signature Capture */}
            <Card className="p-4 space-y-3">
              <Label>Signature (Optional)</Label>
              {showSignaturePad ? (
                <SignaturePad onSave={handleSignatureSave} onCancel={() => setShowSignaturePad(false)} />
              ) : signatureData ? (
                <div className="space-y-2">
                  <img
                    src={signatureData || "/placeholder.svg"}
                    alt="Signature"
                    className="w-full border rounded-lg bg-white"
                  />
                  <Button variant="outline" className="w-full !bg-transparent !hover:bg-transparent" onClick={() => setSignatureData(null)}>
                    Clear Signature
                  </Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full !bg-transparent !hover:bg-transparent" onClick={() => setShowSignaturePad(true)}>
                  <PenTool className="h-4 w-4 mr-2" />
                  Capture Signature
                </Button>
              )}
            </Card>

            {/* Recipient Name */}
            <Card className="p-4 space-y-3">
              <Label htmlFor="recipient">Recipient Name (Optional)</Label>
              <Input
                id="recipient"
                placeholder="Who received the delivery?"
                value={recipientName}
                onChange={(e) => setRecipientName(e.target.value)}
              />
            </Card>

            {/* Notes */}
            <Card className="p-4 space-y-3">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                placeholder="Add any notes about this delivery..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </Card>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Button variant="destructive" className="flex-1" size="lg" onClick={handleFail} disabled={isSubmitting}>
                <XCircle className="h-5 w-5 mr-2" />
                {isSubmitting ? "Processing..." : "Failed"}
              </Button>
              <Button className="flex-1" size="lg" onClick={handleDeliver} disabled={isSubmitting}>
                <CheckCircle className="h-5 w-5 mr-2" />
                {isSubmitting ? "Processing..." : "Delivered"}
              </Button>
            </div>
          </>
        )}

        {isCompleted && existingPod && (
          <Card className="p-4 space-y-4">
            <h3 className="font-semibold">Proof of Delivery</h3>
            {existingPod.photo_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Photo</p>
                <img
                  src={existingPod.photo_url || "/placeholder.svg"}
                  alt="Delivery proof"
                  className="w-full rounded-lg"
                />
              </div>
            )}
            {existingPod.signature_url && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Signature</p>
                <img
                  src={existingPod.signature_url || "/placeholder.svg"}
                  alt="Signature"
                  className="w-full border rounded-lg bg-white"
                />
              </div>
            )}
            {existingPod.recipient_name && (
              <div>
                <p className="text-sm text-muted-foreground">Received By</p>
                <p className="font-medium">{existingPod.recipient_name}</p>
              </div>
            )}
            {existingPod.notes && (
              <div>
                <p className="text-sm text-muted-foreground">Notes</p>
                <p className="font-medium">{existingPod.notes}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}