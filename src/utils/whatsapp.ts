/**
 * WhatsApp click-to-chat checkout message generator and URL builder
 * for Kopi 99 Warungboto
 */

import type { Order, BusinessSettings } from '../types/database.ts';
import { formatRupiah, formatPhoneNumber } from './formatters.ts';

export function generateWhatsAppOrderMessage(
  order: Order,
  settings: BusinessSettings
): string {
  const lines: string[] = [];

  lines.push(`*HALO KOPI 99 WARUNGBOTO* ☕✨`);
  lines.push(`Saya ingin mengonfirmasi pesanan online:`);
  lines.push(``);
  lines.push(`📋 *No. Referensi Pesanan:* ${order.order_number}`);
  lines.push(`👤 *Nama Pelanggan:* ${order.customer_name}`);
  lines.push(`📞 *No. Telepon / WA:* ${order.customer_phone || '-'}`);
  lines.push(`🛵 *Metode:* ${order.order_type === 'delivery' ? 'Pengiriman (Delivery)' : 'Ambil di Toko (Pickup)'}`);
  
  if (order.order_type === 'delivery' && order.customer_address) {
    lines.push(`📍 *Alamat Pengiriman:* ${order.customer_address}`);
  }
  lines.push(``);

  lines.push(`*DETAIL PESANAN:*`);
  order.items.forEach((item, index) => {
    let itemTitle = `${index + 1}. ${item.product_name}`;
    if (item.variant_name) {
      itemTitle += ` (${item.variant_name})`;
    }
    lines.push(itemTitle);
    lines.push(`   ${item.quantity}x @ ${formatRupiah(item.unit_price)} = ${formatRupiah(item.subtotal_price)}`);
    if (item.addons_summary) {
      lines.push(`   + Add-on: ${item.addons_summary}`);
    }
    if (item.notes) {
      lines.push(`   _Catatan: ${item.notes}_`);
    }
  });

  lines.push(``);
  lines.push(`*RINGKASAN PEMBAYARAN:*`);
  lines.push(`Subtotal: ${formatRupiah(order.subtotal_amount)}`);
  
  if (order.discount_amount > 0) {
    lines.push(`Diskon (${order.discount_description || 'Promo'}): -${formatRupiah(order.discount_amount)}`);
  }
  if (order.tax_amount > 0) {
    lines.push(`Pajak (PB1): ${formatRupiah(order.tax_amount)}`);
  }
  if (order.delivery_fee > 0) {
    lines.push(`Ongkos Kirim: ${formatRupiah(order.delivery_fee)}`);
  }
  
  lines.push(`*ESTIMASI TOTAL: ${formatRupiah(order.gross_total)}*`);
  lines.push(``);

  if (order.notes) {
    lines.push(`📝 *Catatan Khusus:* ${order.notes}`);
    lines.push(``);
  }

  lines.push(`Mohon konfirmasi ketersediaan dan metode pembayarannya (QRIS / Transfer). Terima kasih!`);

  return lines.join('\n');
}

/**
 * Generates the official WhatsApp Click-to-chat URL
 * https://wa.me/<number>?text=<url-encoded-text>
 */
export function buildWhatsAppLink(
  targetPhone: string,
  messageText: string
): string {
  const cleanPhone = formatPhoneNumber(targetPhone);
  const encodedText = encodeURIComponent(messageText);
  return `https://wa.me/${cleanPhone}?text=${encodedText}`;
}
