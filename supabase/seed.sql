-- Starter content (run once): products, Zeno's guide categories, the first guide,
-- the Zyra house ad and ad settings. Safe to re-run: existing rows are left alone.

insert into public.products (slug, name, kind, headline, headline_em, headline_style, description, highlights, cta_label, cta_url, site_url, accent_dark, accent_light, button_dark, button_light, status, sort_order)
values
  ('zyra', 'Zyra', 'Roster & shift scheduling', 'Every session covered.', 'Before anyone asks.', 'sans',
   'Builds the roster around who is actually free, swaps sessions in two taps and reminds everyone before they''re on. Free for small teams; works in any phone browser.',
   '[{"label":"Swaps","value":"Two taps"},{"label":"Double bookings","value":"Blocked"},{"label":"Check-in","value":"QR or code"}]',
   'Open Zyra', 'https://zyra.midnightpoetry.studio/', 'https://zyra.midnightpoetry.studio/',
   '#A5B0FF', '#5546D6', '#6E5CF0', '#5546D6', 'live', 1),
  ('zeno', 'Zeno', 'Split the bill, item by item', 'Every line,', 'fairly yours.', 'serif',
   'Snap any receipt. Zeno shares the GST, service charge and discounts by what each person ordered, and sends everyone their part. No sign-up needed to start.',
   '[{"label":"Split","value":"By item"},{"label":"Friends","value":"No app needed"},{"label":"Receipt photo","value":"Never stored"}]',
   'Scan a receipt', 'https://zenoapp.midnightpoetry.studio/scan', 'https://zeno.midnightpoetry.studio/',
   '#F0A684', '#A04A2A', '#F8F0E1', '#1F1D1A', 'live', 2)
on conflict (slug) do nothing;

insert into public.categories (product_id, name, slug, sort_order)
select p.id, c.name, c.slug, c.ord
from public.products p
cross join (values ('Fair splits', 'fair-splits', 1), ('Settling up', 'settling-up', 2), ('Using Zeno', 'using-zeno', 3), ('Privacy', 'privacy', 4)) as c(name, slug, ord)
where p.slug = 'zeno'
on conflict (product_id, slug) do nothing;

insert into public.guides (product_id, category_id, slug, title, standfirst, blocks, start_here, meta_title, meta_description, author_name, status)
select p.id, c.id, 'split-gst-service-charge',
  'How to split GST and service charge fairly',
  'An even split overcharges whoever ordered least. Here is the order receipts usually apply charges in, and how to share each one by what people actually ate.',
  $json$[
    {"type":"callout","title":"The short version","text":"Share every discount, service charge and GST by each person's share of the food, not by headcount. On a typical restaurant receipt, the discount comes off first, service charge is added next, and GST is charged on both."},
    {"type":"heading","text":"Why an even split isn't fair"},
    {"type":"paragraph","text":"Three friends share a $129.49 dinner. Split evenly, each pays about $43.16. But Ben only had chicken rice, his share of the satay and teh tarik, and half a chendol. By what he actually ordered, he owes $36.51 — so an even split quietly charges him $6.65 for food he never ate."},
    {"type":"heading","text":"The order charges are applied"},
    {"type":"table","caption":"How a typical receipt adds up.","header":["Line","Amount"],"rows":[["Subtotal","120.00"],["Member discount 10%","-12.00"],["Service charge 10% on 108.00","10.80"],["GST 9% on 118.80","10.69"],["Total","129.49"]]},
    {"type":"paragraph","text":"Because every charge is a percentage of the food, each person's share of the charges is simply their share of the food. Work out what each person ordered, then scale it by the same factor the receipt used."},
    {"type":"heading","text":"A worked example"},
    {"type":"table","caption":"Shared dishes are divided between the people who had them.","header":["Person","What they had","Food","Pays"],"rows":[["Alicia","Laksa, grilled fish, ⅓ satay, ⅓ teh tarik, ½ chendol","51.83","55.93"],["Ben","Chicken rice, ⅓ satay, ⅓ teh tarik, ½ chendol","33.83","36.51"],["Chen","Nasi lemak, kopi C, ⅓ satay, ⅓ teh tarik","34.33","37.05"]]},
    {"type":"paragraph","text":"Each person's food is multiplied by 0.9 for the discount, 1.1 for service charge and 1.09 for GST. The three amounts add back up to the $129.49 on the receipt."},
    {"type":"heading","text":"When the cents don't divide"},
    {"type":"paragraph","text":"A $28.00 platter shared three ways is $9.333… each. Round two shares down and give the leftover cent to the third person, so the total still matches the receipt to the cent."},
    {"type":"heading","text":"Common questions"},
    {"type":"faq","items":[{"q":"Is GST charged on the service charge?","a":"On a typical restaurant bill with GST, yes: GST is worked out on the food plus the service charge, which is why it comes last."},{"q":"What if a discount only applies to one dish?","a":"Take it off that dish first, then share the dish as usual."},{"q":"Do my friends need Zeno to see the split?","a":"No. They get a picture of who owes what and why, and settle up however your group usually does."}]},
    {"type":"cta","title":"Let the monkey do the maths.","text":"No sign-up needed to start.","label":"Scan a receipt","url":"https://zenoapp.midnightpoetry.studio/scan"}
  ]$json$::jsonb,
  true,
  'How to split GST and service charge fairly | Zeno',
  'Why an even split overcharges the light eater, the order receipts apply discounts, service charge and GST in, and a worked example.',
  'Midnight Poetry Studio',
  'published'
from public.products p
join public.categories c on c.product_id = p.id and c.slug = 'fair-splits'
where p.slug = 'zeno'
on conflict (product_id, slug) do nothing;

insert into public.ads (name, kind, eyebrow, headline, body, cta_label, url, spots, status)
select 'Try Zyra — roster', 'house', 'From the studio · Zyra',
  'Running a team roster? Zyra builds it around who''s actually free.',
  'Free for small teams. Works in any phone browser.', 'Try Zyra',
  'https://zyra.midnightpoetry.studio/', array['side', 'hub'], 'live'
where not exists (select 1 from public.ads where name = 'Try Zyra — roster');

update public.ad_settings
set enabled = true, house_enabled = true, network_enabled = false,
    spots = array['inline', 'side', 'hub'], max_per_page = 2,
    excluded_category_ids = coalesce((select array_agg(c.id) from public.categories c join public.products p on p.id = c.product_id where p.slug = 'zeno' and c.slug = 'privacy'), '{}')
where id = 1;
