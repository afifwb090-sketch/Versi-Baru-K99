import test from 'node:test';
import assert from 'node:assert/strict';
import { generateWhatsAppOrderMessage, buildWhatsAppLink } from './whatsapp.ts';
import type { Order, BusinessSettings } from '../types/database.ts';

test('buildWhatsAppLink generates valid wa.me URL with encoded text and Indonesian phone prefix', () => {
  const link = buildWhatsAppLink('081234567890', 'Halo K99');
  assert.equal(link, 'https://wa.me/6281234567890?text=Halo%20K99');
});

test('generateWhatsAppOrderMessage formats complete Indonesian order details', () => {
  const mockOrder: Order = {
    id: 'ord-123',
    order_number: 'K99-20261020-001',
    channel: 'whatsapp',
    customer_name: 'Budi Santoso',
    customer_phone: '081299998888',
    customer_address: 'Jl. Kusumanegara No. 45, Umbulharjo',
    order_type: 'delivery',
    status: 'menunggu_konfirmasi',
    payment_status: 'belum_bayar',
    subtotal_amount: 36000,
    discount_amount: 5000,
    discount_description: 'VOUCHER99',
    tax_amount: 0,
    service_charge: 0,
    delivery_fee: 5000,
    gross_total: 36000,
    platform_commission: 0,
    platform_service_fee: 0,
    actual_payout: 36000,
    total_hpp: 13000,
    gross_profit: 23000,
    items: [
      {
        id: 'item-1',
        order_id: 'ord-123',
        product_id: 'prod-1',
        product_name: 'Kopi Susu 99 Gula Aren',
        variant_name: 'Iced / 16oz',
        addons_summary: 'Extra Shot Espresso',
        unit_price: 18000,
        unit_hpp: 6500,
        quantity: 2,
        subtotal_price: 36000,
        subtotal_hpp: 13000,
        notes: 'Less ice, normal sugar',
      },
    ],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const mockSettings: BusinessSettings = {
    id: 'biz-1',
    business_name: 'Kopi 99 Warungboto',
    tagline: 'Kopi & Matcha Kekinian',
    address: 'Jl. Veteran No. 99, Warungboto',
    city: 'Yogyakarta',
    phone: '081299990099',
    whatsapp_number: '081299990099',
    opening_hours: '08:00 - 23:00 WIB',
    timezone: 'Asia/Jakarta',
    currency: 'IDR',
    tax_enabled: false,
    tax_percentage: 10,
    service_charge_percentage: 0,
    receipt_header: 'KOPI 99 WARUNGBOTO',
    receipt_footer: 'Matur Nuwun',
    order_prefix_offline: 'K99-POS',
    order_prefix_online: 'K99-ONL',
    low_stock_threshold_default: 10,
    online_ordering_active: true,
    delivery_available: true,
    pickup_available: true,
    is_store_open: true,
    store_closed_message: 'Kedai Kopi 99 Warungboto sedang tutup saat ini.',
    updated_at: new Date().toISOString(),
  };

  const message = generateWhatsAppOrderMessage(mockOrder, mockSettings);
  assert.ok(message.includes('K99-20261020-001'));
  assert.ok(message.includes('Budi Santoso'));
  assert.ok(message.includes('Kopi Susu 99 Gula Aren (Iced / 16oz)'));
  assert.ok(message.includes('Extra Shot Espresso'));
  assert.ok(message.includes('Less ice, normal sugar'));
  assert.ok(message.includes('VOUCHER99'));
  assert.ok(message.includes('Jl. Kusumanegara No. 45'));
});
