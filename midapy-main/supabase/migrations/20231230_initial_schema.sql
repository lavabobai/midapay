-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create generations table
create table public.generations (
    id uuid primary key default uuid_generate_v4(),
    prompt text not null,
    status text not null default 'waiting',
    progress integer default 0,
    grid_image_url text,
    upscale_1 text,
    upscale_2 text,
    upscale_3 text,
    upscale_4 text,
    error text,
    aspect_ratio text not null,
    style text,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
    completed_at timestamp with time zone,
    -- Ensure status is valid
    constraint valid_status check (status in ('waiting', 'processing', 'completed', 'error'))
);

-- Create a function to prevent concurrent generations
create or replace function check_concurrent_generations()
returns trigger as $$
begin
    if NEW.status in ('processing', 'waiting') then
        if exists (
            select 1 
            from generations 
            where status in ('processing', 'waiting')
            and id != NEW.id
        ) then
            raise exception 'Cannot have concurrent generations in processing or waiting state';
        end if;
    end if;
    return NEW;
end;
$$ language plpgsql;

-- Create trigger to enforce the concurrent generations rule
create trigger enforce_concurrent_generations
    before insert or update on generations
    for each row
    execute function check_concurrent_generations();

-- Create storage bucket for generations
insert into storage.buckets (id, name)
values ('generations', 'generations')
on conflict do nothing;

-- Create function to automatically update updated_at
create or replace function update_updated_at_column()
returns trigger as $$
begin
    NEW.updated_at = timezone('utc'::text, now());
    return NEW;
end;
$$ language plpgsql;

-- Create trigger for updated_at
create trigger update_generations_updated_at
    before update on generations
    for each row
    execute function update_updated_at_column();
