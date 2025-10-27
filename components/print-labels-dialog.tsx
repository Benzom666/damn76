"use client"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { ShippingLabel } from "./shipping-label"

interface PrintLabelsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  orders: any[]
  routeName?: string
}

export function PrintLabelsDialog({ open, onOpenChange, orders, routeName }: PrintLabelsDialogProps) {
  const handlePrint = () => {
    window.print()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Print Shipping Labels</DialogTitle>
          <DialogDescription>
            Preview and print labels for {orders.length} order{orders.length !== 1 ? "s" : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Button onClick={handlePrint} className="w-full">
            <Printer className="h-4 w-4 mr-2" />
            Print All Labels
          </Button>

          {/* Print Preview */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <div className="text-sm text-muted-foreground mb-4">Preview:</div>
            <div className="space-y-4 max-h-[500px] overflow-y-auto">
              {orders.map((order) => (
                <div key={order.id} className="border-2 border-dashed border-gray-300 inline-block">
                  <ShippingLabel order={order} routeName={routeName} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </DialogContent>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-labels,
          .print-labels * {
            visibility: visible;
          }
          .print-labels {
            position: absolute;
            left: 0;
            top: 0;
          }
          @page {
            size: 4in 6in;
            margin: 0;
          }
        }
      `}</style>
    </Dialog>
  )
}
