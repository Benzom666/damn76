import { createServerClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { RouteDetail } from "./route-detail"

export default async function DriverRoutePage(props: {
  params: Promise<{ id: string }>
}) {
  const params = await props.params
  const { id } = params
  const supabase = await createServerClient()

  console.log("[v0] [DRIVER_ROUTE] Loading route:", id)

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    console.log("[v0] [DRIVER_ROUTE] No user, redirecting to login")
    redirect("/auth/login")
  }

  console.log("[v0] [DRIVER_ROUTE] User:", user.id)

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  console.log("[v0] [DRIVER_ROUTE] Profile role:", profile?.role)

  if (profile?.role !== "driver") {
    console.log("[v0] [DRIVER_ROUTE] Not a driver, redirecting to admin")
    redirect("/admin")
  }

  // Get route with orders
  const { data: route, error } = await supabase
    .from("routes")
    .select("*")
    .eq("id", id)
    .eq("driver_id", user.id)
    .single()

  console.log("[v0] [DRIVER_ROUTE] Route query result:", { route: route?.name, error: error?.message })

  if (error || !route) {
    console.log("[v0] [DRIVER_ROUTE] Route not found or error:", error)
    notFound()
  }

  // Get orders for this route
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select("*")
    .eq("route_id", id)
    .order("stop_sequence", { ascending: true })

  console.log("[v0] [DRIVER_ROUTE] Orders loaded:", orders?.length, "Error:", ordersError?.message)

  return <RouteDetail route={route} orders={orders || []} />
}