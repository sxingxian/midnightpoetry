-- Every product's guides live on the studio site (Zyra's included); no link-outs.
alter table public.products drop column if exists guides_url;
