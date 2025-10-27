"use server"

import { createServerClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { put } from "@vercel/blob"

type ActionResponse<T = void> = { success: true; data?: T } | { success: false; error: string; code?: string }

export async function updateStopStatus(
  orderId: string,
  status: "delivered" | "failed",
  notes?: string,
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error in updateStopStatus:", authError)
      return {
        success: false,
        error: "Your session has expired. Please log in again.",
        code: "AUTH_EXPIRED",
      }
    }

    // Add retry logic for mobile devices
    let retryCount = 0
    const maxRetries = 3
    let lastError: any

    while (retryCount < maxRetries) {
      try {
        const { error } = await supabase
          .from("orders")
          .update({
            status,
            updated_at: new Date().toISOString(),
          })
          .eq("id", orderId)

        if (!error) {
          // Success - try to log the event
          const { error: eventError } = await supabase.from("stop_events").insert({
            order_id: orderId,
            driver_id: user.id,
            event_type: status,
            notes,
          })

          if (eventError) {
            console.error("[v0] Error creating stop event:", eventError)
            // Don't fail the whole operation if event logging fails
          }

          revalidatePath("/driver")
          return { success: true }
        }

        lastError = error
        retryCount++
        
        if (retryCount < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      } catch (err) {
        lastError = err
        retryCount++
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    console.error("[v0] Database error in updateStopStatus after retries:", lastError)
    return {
      success: false,
      error: `Failed to update order status: ${lastError?.message || "Network error"}`,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in updateStopStatus:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function savePOD(
  orderId: string,
  photoUrl?: string,
  signatureUrl?: string,
  notes?: string,
  recipientName?: string,
): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      console.error("[v0] Auth error in savePOD:", authError)
      return {
        success: false,
        error: "Your session has expired. Please log in again.",
        code: "AUTH_EXPIRED",
      }
    }

    const podNotes = recipientName ? `Recipient: ${recipientName}\n${notes || ""}` : notes

    // Add retry logic for mobile devices
    let retryCount = 0
    const maxRetries = 3
    let lastError: any

    while (retryCount < maxRetries) {
      try {
        const { data: podData, error } = await supabase
          .from("pods")
          .insert({
            order_id: orderId,
            driver_id: user.id,
            photo_url: photoUrl,
            signature_url: signatureUrl,
            notes: podNotes,
            delivered_at: new Date().toISOString(),
          })
          .select("id")
          .single()

        if (!error && podData) {
          // Success - try to send email if enabled
          if (podData.id && process.env.NEXT_PUBLIC_ENABLE_POD_EMAIL === "true") {
            console.log("[v0] [POD] Triggering email via API route")
            console.log("[v0] [POD] Order ID:", orderId)
            console.log("[v0] [POD] POD ID:", podData.id)

            // Fire-and-forget email sending (non-blocking) with mobile-friendly fetch
            try {
              fetch("/api/pod-email", {
                method: "POST",
                headers: { 
                  "Content-Type": "application/json",
                  "Cache-Control": "no-cache"
                },
                body: JSON.stringify({ orderId, podId: podData.id }),
                cache: "no-store",
              })
                .then(async (r) => {
                  let result: any
                  const ct = r.headers.get("content-type") || ""

                  if (ct.includes("application/json")) {
                    result = await r.json()
                  } else {
                    result = { ok: false, status: r.status, body: await r.text() }
                  }

                  console.log("[v0] [POD] Email API response:", result)

                  if (!result.ok) {
                    console.error("[v0] [POD] Email failed:", {
                      status: result.status,
                      error: result.error,
                      body: result.body,
                    })
                  }

                  return result
                })
                .catch((e) => {
                  console.warn("[v0] [POD] Email API call failed (non-blocking):", e)
                })
            } catch (emailError) {
              console.warn("[v0] [POD] Email setup failed (non-blocking):", emailError)
            }
          }

          revalidatePath("/driver")
          return { success: true }
        }

        lastError = error
        retryCount++
        
        if (retryCount < maxRetries) {
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      } catch (err) {
        lastError = err
        retryCount++
        
        if (retryCount < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    console.error("[v0] Database error in savePOD after retries:", lastError)
    return {
      success: false,
      error: `Failed to save proof of delivery: ${lastError?.message || "Network error"}`,
    }
  } catch (error) {
    console.error("[v0] Unexpected error in savePOD:", error)
    return {
      success: false,
      error: "An unexpected error occurred. Please try again.",
    }
  }
}

export async function uploadToBlob(base64Data: string, filename: string, contentType: string) {
  try {
    // Enhanced mobile-friendly blob upload
    let blob: Blob
    
    if (base64Data.startsWith('data:')) {
      // Handle data URL format (common on mobile)
      const base64Response = await fetch(base64Data)
      blob = await base64Response.blob()
    } else {
      // Handle raw base64 string
      const byteCharacters = atob(base64Data.split(',')[1] || base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      blob = new Blob([byteArray], { type: contentType })
    }

    // Add retry logic for blob upload
    let retryCount = 0
    const maxRetries = 3
    let lastError: any

    while (retryCount < maxRetries) {
      try {
        const result = await put(filename, blob, {
          access: "public",
          contentType,
        })

        return { url: result.url, error: null }
      } catch (error) {
        lastError = error
        retryCount++
        
        if (retryCount < maxRetries) {
          // Wait before retry
          await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
        }
      }
    }

    console.error("[v0] Error uploading to blob after retries:", lastError)
    return { url: null, error: "Failed to upload file after multiple attempts" }
  } catch (error) {
    console.error("[v0] Error uploading to blob:", error)
    return { url: null, error: "Failed to upload file" }
  }
}

export async function updateDriverPosition(lat: number, lng: number, accuracy?: number): Promise<ActionResponse> {
  try {
    const supabase = await createServerClient()

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return {
        success: false,
        error: "Authentication required",
        code: "AUTH_EXPIRED",
      }
    }

    const { error } = await supabase.rpc("upsert_driver_position", {
      p_driver_id: user.id,
      p_lat: lat,
      p_lng: lng,
      p_accuracy: accuracy || null,
    })

    if (error) {
      console.error("[v0] Error updating driver position:", error)
      return {
        success: false,
        error: "Failed to update position",
      }
    }

    return { success: true }
  } catch (error) {
    console.error("[v0] Unexpected error in updateDriverPosition:", error)
    return {
      success: false,
      error: "An unexpected error occurred",
    }
  }
}