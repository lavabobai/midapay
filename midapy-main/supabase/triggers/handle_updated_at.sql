-- Trigger for generations
create trigger handle_generations_updated_at
    before update on public.generations
    for each row
    execute function public.update_updated_at_column();
