create table users (
  username citext primary key,
  access_token text,
  created timestamp with time zone default now()
);

create table notes (
  id text primary key,
  author citext,
  value text,
  selections json,
  last_editor text,
  last_edit timestamp with time zone default now(),
  created timestamp with time zone default now()
);

// ----------------------

drop table users;
drop table notes;
