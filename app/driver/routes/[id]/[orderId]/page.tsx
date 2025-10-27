import { createServerClient } from "@/lib/supabase/server"
import { notFound, redirect } from "next/navigation"
import { StopDetail } from "./stop-detail"

export default async function DriverStopPage(props: {
  params: Promise<{ id: string; orderId: string }>
}) {
  const params = await props.params
  const { id: routeId, orderId } = params
  const supabase = await createServerClient()

  // Check auth
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  // Get user profile
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single()

  if (profile?.role !== "driver") {
    redirect("/admin")
  }

  // Get route to verify driver access
  const { data: route } = await supabase
    .from("routes")
    .select("*")
    .eq("id", routeId)
    .eq("driver_id", user.id)
    .single()

  if (!route) {
    notFound()
  }

  // Get the specific order
  const { data: order, error } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("route_id", routeId)
    .single()

  if (error || !order) {
    notFound()
  }

  // Get existing POD if any
  const { data: existingPod } = await supabase
    .from("pods")
    .select("*")
    .eq("order_id", orderId)
    .single()

  return (
    <StopDetail 
      order={order} 
      routeName={route.name}
      routeId={routeId}
      existingPod={existingPod}
    />
  )
}