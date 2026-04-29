-- Migration v25 : Préférence de palette interchangeable côté pro
--
-- Permet à chaque pro de choisir parmi 4 palettes : rose | sauge | sable | lavande.
-- La palette est appliquée via <html data-palette="..."> + cookie côté client
-- pour que la palette persiste sans re-fetch du profil sur chaque page.
--
-- Default = 'sable' pour rester aligné avec l'identité historique IziSolo.

alter table public.profiles
  add column if not exists palette text default 'sable'
    check (palette in ('rose', 'sauge', 'sable', 'lavande'));

comment on column public.profiles.palette is
  'Palette UI choisie par le pro : rose (terracotta) | sauge | sable | lavande. Default = sable.';
