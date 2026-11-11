// Reservas de canchas de pádel
const MAX_RESERVAS_ACTIVAS = 2;
const HORAS_MIN_CANCELACION = 6;
const PRECIO = { normal: 8000, pico: 12000 }; // pico: 18 a 22 h

export function puedeReservar(socio, reservasActivas) {
  if (socio.deuda > 0) return { ok: false, motivo: "Tiene cuotas impagas" };
  if (reservasActivas.length >= MAX_RESERVAS_ACTIVAS) return { ok: false, motivo: "Ya tiene 2 reservas" };
  return { ok: true };
}
export function precio(hora) { return hora >= 18 && hora < 22 ? PRECIO.pico : PRECIO.normal; }
export function puedeCancelar(reserva, ahora) {
  return (reserva.inicio - ahora) / 36e5 >= HORAS_MIN_CANCELACION;
}
