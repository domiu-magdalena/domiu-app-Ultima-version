"use client";

import React, { useState } from 'react';
import { parseWhatsappOrderText, DeliveryAddressResolution } from '@/lib/orders/address-intelligence';
import { calculateRouteDistance, type RouteDistanceResult } from '@/lib/maps/distance';
import { calculateDeliveryPrice } from '@/lib/orders/delivery-pricing';

async function fetchCurrentBusiness() {
	const res = await fetch('/api/business/current');
	return res.json();
}

async function postManualOrder(payload: unknown): Promise<Record<string, unknown>> {
	const res = await fetch('/api/manual-order', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload),
	});
	return (await res.json()) as Record<string, unknown>;
}

export default function CrearDomicilioPage() {
	const [rawText, setRawText] = useState('');
	const [candidates, setCandidates] = useState<DeliveryAddressResolution[]>([]);
	const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
	const [calculating, setCalculating] = useState(false);
	const [routeResult, setRouteResult] = useState<RouteDistanceResult | null>(null);
	const [manualPrice, setManualPrice] = useState<number | null>(null);
	const [creating, setCreating] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	function handleExtract() {
		const parsed = parseWhatsappOrderText(rawText || '');
		setCandidates(parsed);
		setSelectedIdx(parsed.length ? 0 : null);
		setRouteResult(null);
	}

	async function handleCalculate() {
		if (selectedIdx === null) return;
		const sel = candidates[selectedIdx];
		setCalculating(true);
		setRouteResult(null);

		// get business origin
		const bizResp = await fetchCurrentBusiness();
		const origin = bizResp?.business;

		try {
			const originAddress = origin?.address || 'Local';
			const originLat = origin?.latitude ?? undefined;
			const originLng = origin?.longitude ?? undefined;

			const destinationAddress = sel.formattedAddress || sel.addressText || sel.rawText || '';
			const destLat = sel.latitude ?? undefined;
			const destLng = sel.longitude ?? undefined;

			const res = await calculateRouteDistance(originAddress, destinationAddress, originLat, originLng, destLat, destLng);
			setRouteResult(res);

			// compute price if distance > 0
			if (res.distanceKm && res.distanceKm > 0) {
				const price = calculateDeliveryPrice(res.distanceKm);
				setManualPrice(price.finalPrice);
			}
		} catch (err) {
			setMessage((err as Error).message || 'Error calculando');
		} finally {
			setCalculating(false);
		}
	}

	function selectCandidate(i: number) {
		setSelectedIdx(i);
		setRouteResult(null);
		setManualPrice(null);
		setMessage(null);
	}

	async function handleCreate() {
		if (selectedIdx === null) return;
		setCreating(true);
		setMessage(null);
		const sel = candidates[selectedIdx];

		// Determine fields following rules
		const isZone = sel.source === 'neighborhood_zone';
		const isExact = !!(sel.latitude && sel.longitude) || sel.source === 'google_maps_link';

		const payload: Record<string, unknown> = {
			customerName: sel.customerName || 'Cliente',
			customerPhone: sel.mainPhone || sel.phones?.[0] || '',
			deliveryAddress: sel.formattedAddress || sel.addressText || sel.rawText || '',
			deliveryLat: sel.latitude ?? null,
			deliveryLng: sel.longitude ?? null,
			neighborhood: sel.neighborhood || null,
			addressNotes: sel.reference || null,
			distanceKm: routeResult?.distanceKm ?? 0,
			durationMinutes: routeResult?.durationMinutes ?? 0,
			deliveryFee: manualPrice ?? 0,
			priceCalculationSource: isExact ? 'google_maps' : isZone ? 'neighborhood_zone' : 'manual',
			paymentMethod: 'cash',
			specialInstructions: sel.productDetails || null,
			rawOrderText: sel.rawText || null,
			addressResolutionSource: sel.source,
			addressConfidence: sel.confidence,
			requiresAddressConfirmation: !!sel.requiresConfirmation || (isZone ? true : false),
			rawDetectedAddress: sel.addressText || null,
			normalizedAddress: sel.formattedAddress || null,
			googleMapsUrl: sel.googleMapsUrl || null,
			zoneName: sel.zoneName || null,
		};

		// Adjust flags according to rules
		if (isExact) {
			payload.priceCalculationSource = 'google_maps';
			payload.addressConfidence = sel.confidence === 'exact' ? 'exact' : 'high';
			payload.requiresAddressConfirmation = false;
		}

		if (isZone) {
			payload.priceCalculationSource = 'neighborhood_zone';
			payload.addressConfidence = 'zone';
			payload.requiresAddressConfirmation = true;
		}

		try {
			const res = await postManualOrder(payload);
			const r = res as Record<string, unknown>;
			if (!r?.['success']) {
				const err = r?.['error'];
				setMessage(typeof err === 'string' ? err : 'Error creando pedido');
			} else {
				const result = r['result'] as Record<string, unknown> | undefined;
				const orderNumber = result && typeof result['orderNumber'] === 'string' ? (result['orderNumber'] as string) : 'OK';
				setMessage('Pedido creado: ' + orderNumber);
			}
		} catch (err) {
			setMessage((err as Error).message || 'Error');
		} finally {
			setCreating(false);
		}
	}

	const selected = selectedIdx !== null ? candidates[selectedIdx] : null;

	return (
		<div style={{ padding: 16 }}>
			<h2>Crear domicilio manual</h2>
			<div>
				<label>Texto WhatsApp / pedido</label>
				<textarea value={rawText} onChange={e => setRawText(e.target.value)} rows={6} style={{ width: '100%' }} />
				<div style={{ marginTop: 8 }}>
					<button type="button" onClick={handleExtract}>Extraer datos</button>
				</div>
			</div>

			{candidates.length > 0 && (
				<div style={{ marginTop: 16 }}>
					<h3>Pedidos detectados</h3>
					<div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
						{candidates.map((c, i) => (
							<div key={i} onClick={() => selectCandidate(i)} style={{ border: i === selectedIdx ? '2px solid #0070f3' : '1px solid #ccc', padding: 8, minWidth: 260 }}>
								<div><strong>{c.customerName || 'Cliente'}</strong></div>
								<div>Tel: {c.mainPhone || c.phones?.[0] || '—'}</div>
								<div>Dirección: {c.formattedAddress || c.addressText || '—'}</div>
								<div>Producto: {c.productDetails || '—'}</div>
								<div>Fuente: {c.source}</div>
								<div>Confianza: {c.confidence}</div>
								{c.warnings?.length > 0 && <div style={{ color: 'orange' }}>⚠ {c.warnings.join('; ')}</div>}
							</div>
						))}
					</div>
				</div>
			)}

			{selected && (
				<div style={{ marginTop: 16 }}>
					<h3>Detalle seleccionado</h3>
					<div>Nombre: {selected.customerName || 'Cliente'}</div>
					<div>Teléfono: {selected.mainPhone || selected.phones?.[0] || '—'}</div>
					<div>Dirección detectada: {selected.formattedAddress || selected.addressText || '—'}</div>
					<div>Fuente: {selected.source}</div>
					<div>Confianza: {selected.confidence}</div>
					{selected.source === 'neighborhood_zone' && (
						<div style={{ color: 'red', marginTop: 8 }}>
							No es ruta exacta. Es tarifa por zona. Confirma antes de crear.
						</div>
					)}

					<div style={{ marginTop: 8 }}>
						<button type="button" onClick={handleCalculate} disabled={calculating}>Calcular ruta</button>
					</div>

					{routeResult && (
						<div style={{ marginTop: 12, border: '1px solid #ddd', padding: 8 }}>
							<h4>Resultado de cálculo</h4>
							<div>Distancia: {routeResult.distanceKm} km</div>
							<div>Tiempo: {routeResult.durationMinutes} min</div>
							<div>Origen validado: {routeResult.originLat ? 'Sí' : 'No'}</div>
							<div>Destino validado: {routeResult.destinationLat ? 'Sí' : 'No'}</div>
							<div>Fuente: {routeResult.calculationSource}</div>
							<div>Confianza: {routeResult.confidence}</div>
							{routeResult.warnings?.length > 0 && <div style={{ color: 'orange' }}>⚠ {routeResult.warnings.join('; ')}</div>}
							<div style={{ marginTop: 8 }}>
								Precio estimado: {manualPrice ? `$ ${manualPrice.toLocaleString('es-CO')}` : '—'}
							</div>
						</div>
					)}

					<div style={{ marginTop: 12 }}>
						<button type="button" onClick={handleCreate} disabled={creating}>{creating ? 'Creando...' : 'Crear pedido'}</button>
					</div>
				</div>
			)}

			{message && <div style={{ marginTop: 12 }}>{message}</div>}
		</div>
	);
}

