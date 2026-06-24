-- Asignar user_id del único usuario registrado a todos los datos existentes
UPDATE public.fotos 
SET user_id = '97013bfb-7f71-4ebd-a209-dcb1ea9db345' 
WHERE user_id IS NULL;

UPDATE public.cartas 
SET user_id = '97013bfb-7f71-4ebd-a209-dcb1ea9db345' 
WHERE user_id IS NULL;

UPDATE public.videos 
SET user_id = '97013bfb-7f71-4ebd-a209-dcb1ea9db345' 
WHERE user_id IS NULL;

UPDATE public.bitacora 
SET user_id = '97013bfb-7f71-4ebd-a209-dcb1ea9db345' 
WHERE user_id IS NULL;

-- Asegurar que session_id esté correcto
UPDATE public.fotos SET session_id = '5' WHERE session_id IS NULL;
UPDATE public.cartas SET session_id = '5' WHERE session_id IS NULL;
UPDATE public.videos SET session_id = '5' WHERE session_id IS NULL;
UPDATE public.bitacora SET session_id = '5' WHERE session_id IS NULL;
