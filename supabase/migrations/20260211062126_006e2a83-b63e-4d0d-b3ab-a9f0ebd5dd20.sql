CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Insert profile with trial period
  INSERT INTO public.profiles (id, email, full_name, avatar_url, provider, trial_start, trial_ends_at)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url',
    NEW.raw_app_meta_data->>'provider',
    now(),
    now() + interval '30 days'
  );
  
  -- Insert default preferences
  INSERT INTO public.user_preferences (user_id)
  VALUES (NEW.id);
  
  -- Insert default 3 playlist names
  INSERT INTO public.playlist_names (user_id, name, position)
  VALUES 
    (NEW.id, 'Playlist 1', 0),
    (NEW.id, 'Playlist 2', 1),
    (NEW.id, 'Playlist 3', 2);
  
  RETURN NEW;
END;
$function$;