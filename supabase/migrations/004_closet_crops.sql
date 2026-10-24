-- WearAbout: close-up photo and color swatch for each closet piece.
-- Run once in Supabase > SQL Editor > New query > paste > Run.
alter table public.closet_items add column if not exists crop_path text;   -- fits/<uid>/items/<id>.jpg
alter table public.closet_items add column if not exists swatch text;      -- main color, measured from the photo (#rrggbb)
