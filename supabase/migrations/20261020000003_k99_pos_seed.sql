-- ============================================================================
-- K99 POS SYSTEM - KOPI 99 WARUNGBOTO
-- Migration 03: Optional Development Seed Data (Clearly Identified)
-- ============================================================================

-- 1. Initial Business Settings
insert into public.business_settings (
  id, business_name, tagline, address, city, phone, whatsapp_number, opening_hours, timezone, currency,
  tax_enabled, tax_percentage, service_charge_percentage, receipt_header, receipt_footer,
  order_prefix_offline, order_prefix_online, low_stock_threshold_default, online_ordering_active
) values (
  'a0000000-0000-0000-0000-000000000001',
  'Kopi 99 Warungboto',
  'Kopi & Matcha Kekinian',
  'Jl. Veteran No. 99, Warungboto, Umbulharjo, Yogyakarta 55164',
  'Yogyakarta',
  '081299990099',
  '6281299990099',
  '08:00 - 23:00 WIB',
  'Asia/Jakarta',
  'IDR',
  false,
  10.00,
  0.00,
  'KOPI 99 WARUNGBOTO\nJl. Veteran No. 99, Umbulharjo, Yogyakarta\nTelp/WA: 0812-9999-0099',
  'Matur Nuwun sampun rawuh di Kopi 99!\nInstagram: @kopi99warungboto',
  'K99-POS',
  'K99-ONL',
  10,
  true
) on conflict (id) do nothing;

-- 2. Product Categories
insert into public.product_categories (id, name, slug, description, sort_order, is_active) values
('c0000000-0000-0000-0000-000000000001', 'Kopi Susu Signature', 'kopi-susu-signature', 'Kopi susu gula aren dan racikan khas Kopi 99', 1, true),
('c0000000-0000-0000-0000-000000000002', 'Espresso & Classic', 'espresso-classic', 'Espresso murni, Americano, dan Latte pilihan', 2, true),
('c0000000-0000-0000-0000-000000000003', 'Matcha & Tea Series', 'matcha-tea-series', 'Matcha Uji premium dan racikan artisan tea segar', 3, true),
('c0000000-0000-0000-0000-000000000004', 'Chocolate & Non-Coffee', 'chocolate-non-coffee', 'Cokelat Jawa kental, Red Velvet, dan Taro', 4, true),
('c0000000-0000-0000-0000-000000000005', 'Camilan Warungboto', 'camilan-warungboto', 'Snack hangat teman ngopi dan nongkrong santai', 5, true)
on conflict (slug) do nothing;

-- 3. Suppliers
insert into public.suppliers (id, code, name, contact_person, phone, email, address, balance_payable) values
('s0000000-0000-0000-0000-000000000001', 'SUP-01', 'CV Roastery Merapi Makmur', 'Mas Danang', '081328001122', 'roastery@merapi.id', 'Pakem, Sleman, Yogyakarta', 0),
('s0000000-0000-0000-0000-000000000002', 'SUP-02', 'PT Sentra Kemasan Yogya', 'Ibu Ratna', '081229003344', 'sales@sentrakemasan.com', 'Kotagede, Yogyakarta', 0),
('s0000000-0000-0000-0000-000000000003', 'SUP-03', 'Toko Bahan Kue Malioboro', 'Ko Andy', '081804005566', 'tbk@malioboro.co.id', 'Jl. Malioboro No. 45, Yogyakarta', 0)
on conflict (code) do nothing;

-- 4. Ingredients
insert into public.ingredients (id, sku, name, category, purchase_quantity, purchase_price, base_unit, cost_per_base_unit, current_stock, minimum_stock, supplier_id) values
('i0000000-0000-0000-0000-000000000001', 'ING-ESP-01', 'Biji Kopi House Blend 99 (Robusta-Arabika)', 'coffee', 1000, 160000, 'gram', 160.0, 8500, 1500, 's0000000-0000-0000-0000-000000000001'),
('i0000000-0000-0000-0000-000000000002', 'ING-MLK-01', 'Susu Segar UHT Diamond Full Cream', 'dairy', 1000, 19500, 'ml', 19.5, 24000, 5000, 's0000000-0000-0000-0000-000000000003'),
('i0000000-0000-0000-0000-000000000003', 'ING-GLA-01', 'Gula Aren Organik Cair Kulon Progo', 'syrup', 1000, 28000, 'ml', 28.0, 12000, 2000, 's0000000-0000-0000-0000-000000000003'),
('i0000000-0000-0000-0000-000000000004', 'ING-MTC-01', 'Bubuk Matcha Uji Premium Kyoto', 'powder', 500, 175000, 'gram', 350.0, 3200, 500, 's0000000-0000-0000-0000-000000000003'),
('i0000000-0000-0000-0000-000000000005', 'ING-PAN-01', 'Sirup Pandan Wangi Alami', 'syrup', 750, 45000, 'ml', 60.0, 4500, 1000, 's0000000-0000-0000-0000-000000000003'),
('i0000000-0000-0000-0000-000000000006', 'ING-CUP-16', 'Cup 16oz Custom Sablon Kopi 99 + Tutup Seal', 'packaging', 1, 850, 'pcs', 850.0, 1200, 200, 's0000000-0000-0000-0000-000000000002'),
('i0000000-0000-0000-0000-000000000007', 'ING-STR-01', 'Sedotan Kertas Biodegradable Hijau', 'packaging', 1, 150, 'pcs', 150.0, 1500, 300, 's0000000-0000-0000-0000-000000000002'),
('i0000000-0000-0000-0000-000000000008', 'ING-BAG-01', 'Kantong Plastik Singkong / Paper Bag Takeaway', 'packaging', 1, 400, 'pcs', 400.0, 800, 150, 's0000000-0000-0000-0000-000000000002')
on conflict (sku) do nothing;

-- 5. Products
insert into public.products (
  id, sku, name, description, category_id, image_url,
  price_offline, price_online, estimated_hpp, is_active,
  is_online_available, is_offline_available, preparation_time_minutes, sort_order
) values
('p0000000-0000-0000-0000-000000000001', 'K99-SIG-001', 'Kopi Susu 99 Gula Aren', 'Espresso house blend dipadukan susu UHT creamy dan gula aren asli Kulon Progo.', 'c0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?w=500&auto=format&fit=crop&q=80', 18000, 22000, 6800, true, true, true, 3, 1),
('p0000000-0000-0000-0000-000000000002', 'K99-SIG-002', 'Kopi Susu Pandan Warungboto', 'Kombinasi harum pandan alami dengan espresso bold dan sentuhan santan gurih.', 'c0000000-0000-0000-0000-000000000001', 'https://images.unsplash.com/photo-1541167760496-1628856ab772?w=500&auto=format&fit=crop&q=80', 20000, 24000, 7200, true, true, true, 4, 2),
('p0000000-0000-0000-0000-000000000003', 'K99-CLS-001', 'Americano Jogja Heritage', 'Double shot espresso dari biji kopi lokal Merapi dengan rasa clean, hint cokelat dan fruity.', 'c0000000-0000-0000-0000-000000000002', 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80', 15000, 18000, 3900, true, true, true, 3, 3),
('p0000000-0000-0000-0000-000000000004', 'K99-MTC-001', 'Matcha Latte Uji Kyoto', 'Pure matcha Jepang grade ceremonial dengan susu segar lembut dan manis pas.', 'c0000000-0000-0000-0000-000000000003', 'https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=500&auto=format&fit=crop&q=80', 22000, 26000, 7900, true, true, true, 4, 4),
('p0000000-0000-0000-0000-000000000005', 'K99-CHO-001', 'Dark Chocolate Java 99', 'Kakao premium Jawa Timur dengan rasa rich, legit, dan aroma wangi khas.', 'c0000000-0000-0000-0000-000000000004', 'https://images.unsplash.com/photo-1542990253-0d0f5be5f0ed?w=500&auto=format&fit=crop&q=80', 20000, 24000, 7100, true, true, true, 4, 5),
('p0000000-0000-0000-0000-000000000006', 'K99-SNK-001', 'Pisang Goreng Crispy Wboto', 'Pisang kepok manis digoreng tepung renyah dengan taburan gula palem & kayu manis.', 'c0000000-0000-0000-0000-000000000005', 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?w=500&auto=format&fit=crop&q=80', 16000, 19000, 5500, true, true, true, 8, 6)
on conflict (sku) do nothing;

-- 6. Promotions
insert into public.promotions (
  id, code, title, description, discount_type, discount_value, minimum_order_amount,
  channels, is_active, start_date, end_date
) values (
  'pr000000-0000-0000-0000-000000000001',
  'KOPIWARUNGBOTO',
  'Diskon Nongkrong Rp 5.000',
  'Potongan langsung Rp 5.000 untuk pembelian minimal Rp 35.000 di Kopi 99',
  'fixed',
  5000,
  35000,
  array['pos_offline', 'whatsapp'],
  true,
  '2026-01-01',
  '2026-12-31'
) on conflict (code) do nothing;
