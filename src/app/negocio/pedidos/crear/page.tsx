import { ManualOrderWorkspace } from '@/components/manual-orders/ManualOrderWorkspace';
import { PackagePlus } from 'lucide-react';

export const metadata = {
  title: 'Crear pedido manual - DomiU Negocio',
  description: 'Registrar pedidos externos recibidos por el comercio',
};

export default function CrearPedidoManualNegocioPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15">
          <PackagePlus className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Crear pedido manual</h1>
          <p className="text-sm text-muted-foreground">
            Registra pedidos recibidos fuera de DomiU sin crear una cuenta artificial para el cliente.
          </p>
        </div>
      </div>

      <ManualOrderWorkspace panel="business" />
    </div>
  );
}
