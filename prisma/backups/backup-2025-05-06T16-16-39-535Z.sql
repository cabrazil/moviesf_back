--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

DROP EVENT TRIGGER IF EXISTS pgrst_drop_watch;
DROP EVENT TRIGGER IF EXISTS pgrst_ddl_watch;
DROP EVENT TRIGGER IF EXISTS issue_pg_net_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_graphql_access;
DROP EVENT TRIGGER IF EXISTS issue_pg_cron_access;
DROP EVENT TRIGGER IF EXISTS issue_graphql_placeholder;
DROP PUBLICATION IF EXISTS supabase_realtime;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_upload_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_bucket_id_fkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS "objects_bucketId_fkey";
ALTER TABLE IF EXISTS ONLY public."SubSentiment" DROP CONSTRAINT IF EXISTS "SubSentiment_mainSentimentId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestion" DROP CONSTRAINT IF EXISTS "MovieSuggestion_movieId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestion" DROP CONSTRAINT IF EXISTS "MovieSuggestion_journeyOptionId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestion" DROP CONSTRAINT IF EXISTS "MovieSuggestion_emotionalStateId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestionFlow" DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_movieId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestionFlow" DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_journeyOptionFlowId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSentiment" DROP CONSTRAINT IF EXISTS "MovieSentiment_subSentimentId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSentiment" DROP CONSTRAINT IF EXISTS "MovieSentiment_movieId_fkey";
ALTER TABLE IF EXISTS ONLY public."MovieSentiment" DROP CONSTRAINT IF EXISTS "MovieSentiment_mainSentimentId_fkey";
ALTER TABLE IF EXISTS ONLY public."JourneyStep" DROP CONSTRAINT IF EXISTS "JourneyStep_emotionalStateId_fkey";
ALTER TABLE IF EXISTS ONLY public."JourneyStepFlow" DROP CONSTRAINT IF EXISTS "JourneyStepFlow_journeyFlowId_fkey";
ALTER TABLE IF EXISTS ONLY public."JourneyOption" DROP CONSTRAINT IF EXISTS "JourneyOption_journeyStepId_fkey";
ALTER TABLE IF EXISTS ONLY public."JourneyOptionFlow" DROP CONSTRAINT IF EXISTS "JourneyOptionFlow_journeyStepFlowId_fkey";
ALTER TABLE IF EXISTS ONLY public."JourneyFlow" DROP CONSTRAINT IF EXISTS "JourneyFlow_mainSentimentId_fkey";
ALTER TABLE IF EXISTS ONLY public."EmotionalState" DROP CONSTRAINT IF EXISTS "EmotionalState_mainSentimentId_fkey";
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_flow_state_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_sso_provider_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_user_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_auth_factor_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_fkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_user_id_fkey;
DROP TRIGGER IF EXISTS update_objects_updated_at ON storage.objects;
DROP TRIGGER IF EXISTS tr_check_filters ON realtime.subscription;
DROP INDEX IF EXISTS storage.name_prefix_search;
DROP INDEX IF EXISTS storage.idx_objects_bucket_id_name;
DROP INDEX IF EXISTS storage.idx_multipart_uploads_list;
DROP INDEX IF EXISTS storage.bucketid_objname;
DROP INDEX IF EXISTS storage.bname;
DROP INDEX IF EXISTS realtime.subscription_subscription_id_entity_filters_key;
DROP INDEX IF EXISTS realtime.ix_realtime_subscription_entity;
DROP INDEX IF EXISTS public."SubSentiment_name_key";
DROP INDEX IF EXISTS public."SubSentiment_mainSentimentId_idx";
DROP INDEX IF EXISTS public."Movie_title_key";
DROP INDEX IF EXISTS public."MovieSuggestion_movieId_idx";
DROP INDEX IF EXISTS public."MovieSuggestion_journeyOptionId_idx";
DROP INDEX IF EXISTS public."MovieSuggestion_emotionalStateId_idx";
DROP INDEX IF EXISTS public."MovieSuggestionFlow_movieId_idx";
DROP INDEX IF EXISTS public."MovieSuggestionFlow_journeyOptionFlowId_idx";
DROP INDEX IF EXISTS public."MovieSentiment_subSentimentId_idx";
DROP INDEX IF EXISTS public."MovieSentiment_mainSentimentId_idx";
DROP INDEX IF EXISTS public."MainSentiment_name_key";
DROP INDEX IF EXISTS public."JourneyStep_emotionalStateId_idx";
DROP INDEX IF EXISTS public."JourneyStepFlow_journeyFlowId_idx";
DROP INDEX IF EXISTS public."JourneyOption_journeyStepId_idx";
DROP INDEX IF EXISTS public."JourneyOptionFlow_journeyStepFlowId_idx";
DROP INDEX IF EXISTS public."JourneyFlow_mainSentimentId_key";
DROP INDEX IF EXISTS public."EmotionalState_name_key";
DROP INDEX IF EXISTS public."EmotionalState_mainSentimentId_idx";
DROP INDEX IF EXISTS auth.users_is_anonymous_idx;
DROP INDEX IF EXISTS auth.users_instance_id_idx;
DROP INDEX IF EXISTS auth.users_instance_id_email_idx;
DROP INDEX IF EXISTS auth.users_email_partial_key;
DROP INDEX IF EXISTS auth.user_id_created_at_idx;
DROP INDEX IF EXISTS auth.unique_phone_factor_per_user;
DROP INDEX IF EXISTS auth.sso_providers_resource_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.sso_domains_domain_idx;
DROP INDEX IF EXISTS auth.sessions_user_id_idx;
DROP INDEX IF EXISTS auth.sessions_not_after_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_for_email_idx;
DROP INDEX IF EXISTS auth.saml_relay_states_created_at_idx;
DROP INDEX IF EXISTS auth.saml_providers_sso_provider_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_updated_at_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_session_id_revoked_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_parent_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_user_id_idx;
DROP INDEX IF EXISTS auth.refresh_tokens_instance_id_idx;
DROP INDEX IF EXISTS auth.recovery_token_idx;
DROP INDEX IF EXISTS auth.reauthentication_token_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_user_id_token_type_key;
DROP INDEX IF EXISTS auth.one_time_tokens_token_hash_hash_idx;
DROP INDEX IF EXISTS auth.one_time_tokens_relates_to_hash_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_id_idx;
DROP INDEX IF EXISTS auth.mfa_factors_user_friendly_name_unique;
DROP INDEX IF EXISTS auth.mfa_challenge_created_at_idx;
DROP INDEX IF EXISTS auth.idx_user_id_auth_method;
DROP INDEX IF EXISTS auth.idx_auth_code;
DROP INDEX IF EXISTS auth.identities_user_id_idx;
DROP INDEX IF EXISTS auth.identities_email_idx;
DROP INDEX IF EXISTS auth.flow_state_created_at_idx;
DROP INDEX IF EXISTS auth.factor_id_created_at_idx;
DROP INDEX IF EXISTS auth.email_change_token_new_idx;
DROP INDEX IF EXISTS auth.email_change_token_current_idx;
DROP INDEX IF EXISTS auth.confirmation_token_idx;
DROP INDEX IF EXISTS auth.audit_logs_instance_id_idx;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads DROP CONSTRAINT IF EXISTS s3_multipart_uploads_pkey;
ALTER TABLE IF EXISTS ONLY storage.s3_multipart_uploads_parts DROP CONSTRAINT IF EXISTS s3_multipart_uploads_parts_pkey;
ALTER TABLE IF EXISTS ONLY storage.objects DROP CONSTRAINT IF EXISTS objects_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_pkey;
ALTER TABLE IF EXISTS ONLY storage.migrations DROP CONSTRAINT IF EXISTS migrations_name_key;
ALTER TABLE IF EXISTS ONLY storage.buckets DROP CONSTRAINT IF EXISTS buckets_pkey;
ALTER TABLE IF EXISTS ONLY realtime.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY realtime.subscription DROP CONSTRAINT IF EXISTS pk_subscription;
ALTER TABLE IF EXISTS ONLY realtime.messages DROP CONSTRAINT IF EXISTS messages_pkey;
ALTER TABLE IF EXISTS ONLY public."MovieSuggestionFlow" DROP CONSTRAINT IF EXISTS movie_suggestion_flow_unique_constraint;
ALTER TABLE IF EXISTS ONLY public._prisma_migrations DROP CONSTRAINT IF EXISTS _prisma_migrations_pkey;
ALTER TABLE IF EXISTS ONLY public."SubSentiment" DROP CONSTRAINT IF EXISTS "SubSentiment_pkey";
ALTER TABLE IF EXISTS ONLY public."Movie" DROP CONSTRAINT IF EXISTS "Movie_pkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestion" DROP CONSTRAINT IF EXISTS "MovieSuggestion_pkey";
ALTER TABLE IF EXISTS ONLY public."MovieSuggestionFlow" DROP CONSTRAINT IF EXISTS "MovieSuggestionFlow_pkey";
ALTER TABLE IF EXISTS ONLY public."MovieSentiment" DROP CONSTRAINT IF EXISTS "MovieSentiment_pkey";
ALTER TABLE IF EXISTS ONLY public."MainSentiment" DROP CONSTRAINT IF EXISTS "MainSentiment_pkey";
ALTER TABLE IF EXISTS ONLY public."JourneyStep" DROP CONSTRAINT IF EXISTS "JourneyStep_pkey";
ALTER TABLE IF EXISTS ONLY public."JourneyStepFlow" DROP CONSTRAINT IF EXISTS "JourneyStepFlow_pkey";
ALTER TABLE IF EXISTS ONLY public."JourneyOption" DROP CONSTRAINT IF EXISTS "JourneyOption_pkey";
ALTER TABLE IF EXISTS ONLY public."JourneyOptionFlow" DROP CONSTRAINT IF EXISTS "JourneyOptionFlow_pkey";
ALTER TABLE IF EXISTS ONLY public."JourneyFlow" DROP CONSTRAINT IF EXISTS "JourneyFlow_pkey";
ALTER TABLE IF EXISTS ONLY public."EmotionalState" DROP CONSTRAINT IF EXISTS "EmotionalState_pkey";
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_pkey;
ALTER TABLE IF EXISTS ONLY auth.users DROP CONSTRAINT IF EXISTS users_phone_key;
ALTER TABLE IF EXISTS ONLY auth.sso_providers DROP CONSTRAINT IF EXISTS sso_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.sso_domains DROP CONSTRAINT IF EXISTS sso_domains_pkey;
ALTER TABLE IF EXISTS ONLY auth.sessions DROP CONSTRAINT IF EXISTS sessions_pkey;
ALTER TABLE IF EXISTS ONLY auth.schema_migrations DROP CONSTRAINT IF EXISTS schema_migrations_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_relay_states DROP CONSTRAINT IF EXISTS saml_relay_states_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_pkey;
ALTER TABLE IF EXISTS ONLY auth.saml_providers DROP CONSTRAINT IF EXISTS saml_providers_entity_id_key;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_token_unique;
ALTER TABLE IF EXISTS ONLY auth.refresh_tokens DROP CONSTRAINT IF EXISTS refresh_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.one_time_tokens DROP CONSTRAINT IF EXISTS one_time_tokens_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_factors DROP CONSTRAINT IF EXISTS mfa_factors_last_challenged_at_key;
ALTER TABLE IF EXISTS ONLY auth.mfa_challenges DROP CONSTRAINT IF EXISTS mfa_challenges_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS mfa_amr_claims_session_id_authentication_method_pkey;
ALTER TABLE IF EXISTS ONLY auth.instances DROP CONSTRAINT IF EXISTS instances_pkey;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_provider_id_provider_unique;
ALTER TABLE IF EXISTS ONLY auth.identities DROP CONSTRAINT IF EXISTS identities_pkey;
ALTER TABLE IF EXISTS ONLY auth.flow_state DROP CONSTRAINT IF EXISTS flow_state_pkey;
ALTER TABLE IF EXISTS ONLY auth.audit_log_entries DROP CONSTRAINT IF EXISTS audit_log_entries_pkey;
ALTER TABLE IF EXISTS ONLY auth.mfa_amr_claims DROP CONSTRAINT IF EXISTS amr_id_pk;
ALTER TABLE IF EXISTS public."SubSentiment" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."MovieSuggestionFlow" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."MovieSuggestion" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."MainSentiment" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."JourneyStepFlow" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."JourneyOptionFlow" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."JourneyOption" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."JourneyFlow" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS public."EmotionalState" ALTER COLUMN id DROP DEFAULT;
ALTER TABLE IF EXISTS auth.refresh_tokens ALTER COLUMN id DROP DEFAULT;
DROP TABLE IF EXISTS storage.s3_multipart_uploads_parts;
DROP TABLE IF EXISTS storage.s3_multipart_uploads;
DROP TABLE IF EXISTS storage.objects;
DROP TABLE IF EXISTS storage.migrations;
DROP TABLE IF EXISTS storage.buckets;
DROP TABLE IF EXISTS realtime.subscription;
DROP TABLE IF EXISTS realtime.schema_migrations;
DROP TABLE IF EXISTS realtime.messages;
DROP TABLE IF EXISTS public._prisma_migrations;
DROP SEQUENCE IF EXISTS public."SubSentiment_id_seq";
DROP TABLE IF EXISTS public."SubSentiment";
DROP SEQUENCE IF EXISTS public."MovieSuggestion_id_seq";
DROP SEQUENCE IF EXISTS public."MovieSuggestionFlow_id_seq";
DROP TABLE IF EXISTS public."MovieSuggestionFlow";
DROP TABLE IF EXISTS public."MovieSuggestion";
DROP TABLE IF EXISTS public."MovieSentiment";
DROP TABLE IF EXISTS public."Movie";
DROP SEQUENCE IF EXISTS public."MainSentiment_id_seq";
DROP TABLE IF EXISTS public."MainSentiment";
DROP SEQUENCE IF EXISTS public."JourneyStepFlow_id_seq";
DROP TABLE IF EXISTS public."JourneyStepFlow";
DROP TABLE IF EXISTS public."JourneyStep";
DROP SEQUENCE IF EXISTS public."JourneyOption_id_seq";
DROP SEQUENCE IF EXISTS public."JourneyOptionFlow_id_seq";
DROP TABLE IF EXISTS public."JourneyOptionFlow";
DROP TABLE IF EXISTS public."JourneyOption";
DROP SEQUENCE IF EXISTS public."JourneyFlow_id_seq";
DROP TABLE IF EXISTS public."JourneyFlow";
DROP SEQUENCE IF EXISTS public."EmotionalState_id_seq";
DROP TABLE IF EXISTS public."EmotionalState";
DROP TABLE IF EXISTS auth.users;
DROP TABLE IF EXISTS auth.sso_providers;
DROP TABLE IF EXISTS auth.sso_domains;
DROP TABLE IF EXISTS auth.sessions;
DROP TABLE IF EXISTS auth.schema_migrations;
DROP TABLE IF EXISTS auth.saml_relay_states;
DROP TABLE IF EXISTS auth.saml_providers;
DROP SEQUENCE IF EXISTS auth.refresh_tokens_id_seq;
DROP TABLE IF EXISTS auth.refresh_tokens;
DROP TABLE IF EXISTS auth.one_time_tokens;
DROP TABLE IF EXISTS auth.mfa_factors;
DROP TABLE IF EXISTS auth.mfa_challenges;
DROP TABLE IF EXISTS auth.mfa_amr_claims;
DROP TABLE IF EXISTS auth.instances;
DROP TABLE IF EXISTS auth.identities;
DROP TABLE IF EXISTS auth.flow_state;
DROP TABLE IF EXISTS auth.audit_log_entries;
DROP FUNCTION IF EXISTS storage.update_updated_at_column();
DROP FUNCTION IF EXISTS storage.search(prefix text, bucketname text, limits integer, levels integer, offsets integer, search text, sortcolumn text, sortorder text);
DROP FUNCTION IF EXISTS storage.operation();
DROP FUNCTION IF EXISTS storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, start_after text, next_token text);
DROP FUNCTION IF EXISTS storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer, next_key_token text, next_upload_token text);
DROP FUNCTION IF EXISTS storage.get_size_by_bucket();
DROP FUNCTION IF EXISTS storage.foldername(name text);
DROP FUNCTION IF EXISTS storage.filename(name text);
DROP FUNCTION IF EXISTS storage.extension(name text);
DROP FUNCTION IF EXISTS storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb);
DROP FUNCTION IF EXISTS realtime.topic();
DROP FUNCTION IF EXISTS realtime.to_regrole(role_name text);
DROP FUNCTION IF EXISTS realtime.subscription_check_filters();
DROP FUNCTION IF EXISTS realtime.send(payload jsonb, event text, topic text, private boolean);
DROP FUNCTION IF EXISTS realtime.quote_wal2json(entity regclass);
DROP FUNCTION IF EXISTS realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer);
DROP FUNCTION IF EXISTS realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]);
DROP FUNCTION IF EXISTS realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text);
DROP FUNCTION IF EXISTS realtime."cast"(val text, type_ regtype);
DROP FUNCTION IF EXISTS realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]);
DROP FUNCTION IF EXISTS realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text);
DROP FUNCTION IF EXISTS realtime.apply_rls(wal jsonb, max_record_bytes integer);
DROP FUNCTION IF EXISTS pgbouncer.get_auth(p_usename text);
DROP FUNCTION IF EXISTS extensions.set_graphql_placeholder();
DROP FUNCTION IF EXISTS extensions.pgrst_drop_watch();
DROP FUNCTION IF EXISTS extensions.pgrst_ddl_watch();
DROP FUNCTION IF EXISTS extensions.grant_pg_net_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_graphql_access();
DROP FUNCTION IF EXISTS extensions.grant_pg_cron_access();
DROP FUNCTION IF EXISTS auth.uid();
DROP FUNCTION IF EXISTS auth.role();
DROP FUNCTION IF EXISTS auth.jwt();
DROP FUNCTION IF EXISTS auth.email();
DROP TYPE IF EXISTS realtime.wal_rls;
DROP TYPE IF EXISTS realtime.wal_column;
DROP TYPE IF EXISTS realtime.user_defined_filter;
DROP TYPE IF EXISTS realtime.equality_op;
DROP TYPE IF EXISTS realtime.action;
DROP TYPE IF EXISTS auth.one_time_token_type;
DROP TYPE IF EXISTS auth.factor_type;
DROP TYPE IF EXISTS auth.factor_status;
DROP TYPE IF EXISTS auth.code_challenge_method;
DROP TYPE IF EXISTS auth.aal_level;
DROP EXTENSION IF EXISTS "uuid-ossp";
DROP EXTENSION IF EXISTS supabase_vault;
DROP EXTENSION IF EXISTS pgjwt;
DROP EXTENSION IF EXISTS pgcrypto;
DROP EXTENSION IF EXISTS pg_stat_statements;
DROP EXTENSION IF EXISTS pg_graphql;
DROP SCHEMA IF EXISTS vault;
DROP SCHEMA IF EXISTS storage;
DROP SCHEMA IF EXISTS realtime;
-- *not* dropping schema, since initdb creates it
DROP SCHEMA IF EXISTS pgbouncer;
DROP SCHEMA IF EXISTS graphql_public;
DROP SCHEMA IF EXISTS graphql;
DROP SCHEMA IF EXISTS extensions;
DROP SCHEMA IF EXISTS auth;
--
-- Name: auth; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA auth;


--
-- Name: extensions; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA extensions;


--
-- Name: graphql; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql;


--
-- Name: graphql_public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA graphql_public;


--
-- Name: pgbouncer; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA pgbouncer;


--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: realtime; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA realtime;


--
-- Name: storage; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA storage;


--
-- Name: vault; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA vault;


--
-- Name: pg_graphql; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_graphql WITH SCHEMA graphql;


--
-- Name: EXTENSION pg_graphql; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_graphql IS 'pg_graphql: GraphQL support';


--
-- Name: pg_stat_statements; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pg_stat_statements WITH SCHEMA extensions;


--
-- Name: EXTENSION pg_stat_statements; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pg_stat_statements IS 'track planning and execution statistics of all SQL statements executed';


--
-- Name: pgcrypto; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


--
-- Name: EXTENSION pgcrypto; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgcrypto IS 'cryptographic functions';


--
-- Name: pgjwt; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS pgjwt WITH SCHEMA extensions;


--
-- Name: EXTENSION pgjwt; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION pgjwt IS 'JSON Web Token API for Postgresql';


--
-- Name: supabase_vault; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS supabase_vault WITH SCHEMA vault;


--
-- Name: EXTENSION supabase_vault; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION supabase_vault IS 'Supabase Vault Extension';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA extensions;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: aal_level; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.aal_level AS ENUM (
    'aal1',
    'aal2',
    'aal3'
);


--
-- Name: code_challenge_method; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.code_challenge_method AS ENUM (
    's256',
    'plain'
);


--
-- Name: factor_status; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_status AS ENUM (
    'unverified',
    'verified'
);


--
-- Name: factor_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.factor_type AS ENUM (
    'totp',
    'webauthn',
    'phone'
);


--
-- Name: one_time_token_type; Type: TYPE; Schema: auth; Owner: -
--

CREATE TYPE auth.one_time_token_type AS ENUM (
    'confirmation_token',
    'reauthentication_token',
    'recovery_token',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change_token'
);


--
-- Name: action; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.action AS ENUM (
    'INSERT',
    'UPDATE',
    'DELETE',
    'TRUNCATE',
    'ERROR'
);


--
-- Name: equality_op; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.equality_op AS ENUM (
    'eq',
    'neq',
    'lt',
    'lte',
    'gt',
    'gte',
    'in'
);


--
-- Name: user_defined_filter; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.user_defined_filter AS (
	column_name text,
	op realtime.equality_op,
	value text
);


--
-- Name: wal_column; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_column AS (
	name text,
	type_name text,
	type_oid oid,
	value jsonb,
	is_pkey boolean,
	is_selectable boolean
);


--
-- Name: wal_rls; Type: TYPE; Schema: realtime; Owner: -
--

CREATE TYPE realtime.wal_rls AS (
	wal jsonb,
	is_rls_enabled boolean,
	subscription_ids uuid[],
	errors text[]
);


--
-- Name: email(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.email() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.email', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'email')
  )::text
$$;


--
-- Name: FUNCTION email(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.email() IS 'Deprecated. Use auth.jwt() -> ''email'' instead.';


--
-- Name: jwt(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.jwt() RETURNS jsonb
    LANGUAGE sql STABLE
    AS $$
  select 
    coalesce(
        nullif(current_setting('request.jwt.claim', true), ''),
        nullif(current_setting('request.jwt.claims', true), '')
    )::jsonb
$$;


--
-- Name: role(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.role() RETURNS text
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.role', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role')
  )::text
$$;


--
-- Name: FUNCTION role(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.role() IS 'Deprecated. Use auth.jwt() -> ''role'' instead.';


--
-- Name: uid(); Type: FUNCTION; Schema: auth; Owner: -
--

CREATE FUNCTION auth.uid() RETURNS uuid
    LANGUAGE sql STABLE
    AS $$
  select 
  coalesce(
    nullif(current_setting('request.jwt.claim.sub', true), ''),
    (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub')
  )::uuid
$$;


--
-- Name: FUNCTION uid(); Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON FUNCTION auth.uid() IS 'Deprecated. Use auth.jwt() -> ''sub'' instead.';


--
-- Name: grant_pg_cron_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_cron_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_cron'
  )
  THEN
    grant usage on schema cron to postgres with grant option;

    alter default privileges in schema cron grant all on tables to postgres with grant option;
    alter default privileges in schema cron grant all on functions to postgres with grant option;
    alter default privileges in schema cron grant all on sequences to postgres with grant option;

    alter default privileges for user supabase_admin in schema cron grant all
        on sequences to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on tables to postgres with grant option;
    alter default privileges for user supabase_admin in schema cron grant all
        on functions to postgres with grant option;

    grant all privileges on all tables in schema cron to postgres with grant option;
    revoke all on table cron.job from postgres;
    grant select on table cron.job to postgres with grant option;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_cron_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_cron_access() IS 'Grants access to pg_cron';


--
-- Name: grant_pg_graphql_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_graphql_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
DECLARE
    func_is_graphql_resolve bool;
BEGIN
    func_is_graphql_resolve = (
        SELECT n.proname = 'resolve'
        FROM pg_event_trigger_ddl_commands() AS ev
        LEFT JOIN pg_catalog.pg_proc AS n
        ON ev.objid = n.oid
    );

    IF func_is_graphql_resolve
    THEN
        -- Update public wrapper to pass all arguments through to the pg_graphql resolve func
        DROP FUNCTION IF EXISTS graphql_public.graphql;
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language sql
        as $$
            select graphql.resolve(
                query := query,
                variables := coalesce(variables, '{}'),
                "operationName" := "operationName",
                extensions := extensions
            );
        $$;

        -- This hook executes when `graphql.resolve` is created. That is not necessarily the last
        -- function in the extension so we need to grant permissions on existing entities AND
        -- update default permissions to any others that are created after `graphql.resolve`
        grant usage on schema graphql to postgres, anon, authenticated, service_role;
        grant select on all tables in schema graphql to postgres, anon, authenticated, service_role;
        grant execute on all functions in schema graphql to postgres, anon, authenticated, service_role;
        grant all on all sequences in schema graphql to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on tables to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on functions to postgres, anon, authenticated, service_role;
        alter default privileges in schema graphql grant all on sequences to postgres, anon, authenticated, service_role;

        -- Allow postgres role to allow granting usage on graphql and graphql_public schemas to custom roles
        grant usage on schema graphql_public to postgres with grant option;
        grant usage on schema graphql to postgres with grant option;
    END IF;

END;
$_$;


--
-- Name: FUNCTION grant_pg_graphql_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_graphql_access() IS 'Grants access to pg_graphql';


--
-- Name: grant_pg_net_access(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.grant_pg_net_access() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_event_trigger_ddl_commands() AS ev
    JOIN pg_extension AS ext
    ON ev.objid = ext.oid
    WHERE ext.extname = 'pg_net'
  )
  THEN
    IF NOT EXISTS (
      SELECT 1
      FROM pg_roles
      WHERE rolname = 'supabase_functions_admin'
    )
    THEN
      CREATE USER supabase_functions_admin NOINHERIT CREATEROLE LOGIN NOREPLICATION;
    END IF;

    GRANT USAGE ON SCHEMA net TO supabase_functions_admin, postgres, anon, authenticated, service_role;

    IF EXISTS (
      SELECT FROM pg_extension
      WHERE extname = 'pg_net'
      -- all versions in use on existing projects as of 2025-02-20
      -- version 0.12.0 onwards don't need these applied
      AND extversion IN ('0.2', '0.6', '0.7', '0.7.1', '0.8', '0.10.0', '0.11.0')
    ) THEN
      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SECURITY DEFINER;

      ALTER function net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;
      ALTER function net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) SET search_path = net;

      REVOKE ALL ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;
      REVOKE ALL ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) FROM PUBLIC;

      GRANT EXECUTE ON FUNCTION net.http_get(url text, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
      GRANT EXECUTE ON FUNCTION net.http_post(url text, body jsonb, params jsonb, headers jsonb, timeout_milliseconds integer) TO supabase_functions_admin, postgres, anon, authenticated, service_role;
    END IF;
  END IF;
END;
$$;


--
-- Name: FUNCTION grant_pg_net_access(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.grant_pg_net_access() IS 'Grants access to pg_net';


--
-- Name: pgrst_ddl_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_ddl_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  cmd record;
BEGIN
  FOR cmd IN SELECT * FROM pg_event_trigger_ddl_commands()
  LOOP
    IF cmd.command_tag IN (
      'CREATE SCHEMA', 'ALTER SCHEMA'
    , 'CREATE TABLE', 'CREATE TABLE AS', 'SELECT INTO', 'ALTER TABLE'
    , 'CREATE FOREIGN TABLE', 'ALTER FOREIGN TABLE'
    , 'CREATE VIEW', 'ALTER VIEW'
    , 'CREATE MATERIALIZED VIEW', 'ALTER MATERIALIZED VIEW'
    , 'CREATE FUNCTION', 'ALTER FUNCTION'
    , 'CREATE TRIGGER'
    , 'CREATE TYPE', 'ALTER TYPE'
    , 'CREATE RULE'
    , 'COMMENT'
    )
    -- don't notify in case of CREATE TEMP table or other objects created on pg_temp
    AND cmd.schema_name is distinct from 'pg_temp'
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: pgrst_drop_watch(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.pgrst_drop_watch() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $$
DECLARE
  obj record;
BEGIN
  FOR obj IN SELECT * FROM pg_event_trigger_dropped_objects()
  LOOP
    IF obj.object_type IN (
      'schema'
    , 'table'
    , 'foreign table'
    , 'view'
    , 'materialized view'
    , 'function'
    , 'trigger'
    , 'type'
    , 'rule'
    )
    AND obj.is_temporary IS false -- no pg_temp objects
    THEN
      NOTIFY pgrst, 'reload schema';
    END IF;
  END LOOP;
END; $$;


--
-- Name: set_graphql_placeholder(); Type: FUNCTION; Schema: extensions; Owner: -
--

CREATE FUNCTION extensions.set_graphql_placeholder() RETURNS event_trigger
    LANGUAGE plpgsql
    AS $_$
    DECLARE
    graphql_is_dropped bool;
    BEGIN
    graphql_is_dropped = (
        SELECT ev.schema_name = 'graphql_public'
        FROM pg_event_trigger_dropped_objects() AS ev
        WHERE ev.schema_name = 'graphql_public'
    );

    IF graphql_is_dropped
    THEN
        create or replace function graphql_public.graphql(
            "operationName" text default null,
            query text default null,
            variables jsonb default null,
            extensions jsonb default null
        )
            returns jsonb
            language plpgsql
        as $$
            DECLARE
                server_version float;
            BEGIN
                server_version = (SELECT (SPLIT_PART((select version()), ' ', 2))::float);

                IF server_version >= 14 THEN
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql extension is not enabled.'
                            )
                        )
                    );
                ELSE
                    RETURN jsonb_build_object(
                        'errors', jsonb_build_array(
                            jsonb_build_object(
                                'message', 'pg_graphql is only available on projects running Postgres 14 onwards.'
                            )
                        )
                    );
                END IF;
            END;
        $$;
    END IF;

    END;
$_$;


--
-- Name: FUNCTION set_graphql_placeholder(); Type: COMMENT; Schema: extensions; Owner: -
--

COMMENT ON FUNCTION extensions.set_graphql_placeholder() IS 'Reintroduces placeholder function for graphql_public.graphql';


--
-- Name: get_auth(text); Type: FUNCTION; Schema: pgbouncer; Owner: -
--

CREATE FUNCTION pgbouncer.get_auth(p_usename text) RETURNS TABLE(username text, password text)
    LANGUAGE plpgsql SECURITY DEFINER
    AS $_$
begin
    raise debug 'PgBouncer auth request: %', p_usename;

    return query
    select 
        rolname::text, 
        case when rolvaliduntil < now() 
            then null 
            else rolpassword::text 
        end 
    from pg_authid 
    where rolname=$1 and rolcanlogin;
end;
$_$;


--
-- Name: apply_rls(jsonb, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.apply_rls(wal jsonb, max_record_bytes integer DEFAULT (1024 * 1024)) RETURNS SETOF realtime.wal_rls
    LANGUAGE plpgsql
    AS $$
declare
-- Regclass of the table e.g. public.notes
entity_ regclass = (quote_ident(wal ->> 'schema') || '.' || quote_ident(wal ->> 'table'))::regclass;

-- I, U, D, T: insert, update ...
action realtime.action = (
    case wal ->> 'action'
        when 'I' then 'INSERT'
        when 'U' then 'UPDATE'
        when 'D' then 'DELETE'
        else 'ERROR'
    end
);

-- Is row level security enabled for the table
is_rls_enabled bool = relrowsecurity from pg_class where oid = entity_;

subscriptions realtime.subscription[] = array_agg(subs)
    from
        realtime.subscription subs
    where
        subs.entity = entity_;

-- Subscription vars
roles regrole[] = array_agg(distinct us.claims_role::text)
    from
        unnest(subscriptions) us;

working_role regrole;
claimed_role regrole;
claims jsonb;

subscription_id uuid;
subscription_has_access bool;
visible_to_subscription_ids uuid[] = '{}';

-- structured info for wal's columns
columns realtime.wal_column[];
-- previous identity values for update/delete
old_columns realtime.wal_column[];

error_record_exceeds_max_size boolean = octet_length(wal::text) > max_record_bytes;

-- Primary jsonb output for record
output jsonb;

begin
perform set_config('role', null, true);

columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'columns') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

old_columns =
    array_agg(
        (
            x->>'name',
            x->>'type',
            x->>'typeoid',
            realtime.cast(
                (x->'value') #>> '{}',
                coalesce(
                    (x->>'typeoid')::regtype, -- null when wal2json version <= 2.4
                    (x->>'type')::regtype
                )
            ),
            (pks ->> 'name') is not null,
            true
        )::realtime.wal_column
    )
    from
        jsonb_array_elements(wal -> 'identity') x
        left join jsonb_array_elements(wal -> 'pk') pks
            on (x ->> 'name') = (pks ->> 'name');

for working_role in select * from unnest(roles) loop

    -- Update `is_selectable` for columns and old_columns
    columns =
        array_agg(
            (
                c.name,
                c.type_name,
                c.type_oid,
                c.value,
                c.is_pkey,
                pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
            )::realtime.wal_column
        )
        from
            unnest(columns) c;

    old_columns =
            array_agg(
                (
                    c.name,
                    c.type_name,
                    c.type_oid,
                    c.value,
                    c.is_pkey,
                    pg_catalog.has_column_privilege(working_role, entity_, c.name, 'SELECT')
                )::realtime.wal_column
            )
            from
                unnest(old_columns) c;

    if action <> 'DELETE' and count(1) = 0 from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            -- subscriptions is already filtered by entity
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 400: Bad Request, no primary key']
        )::realtime.wal_rls;

    -- The claims role does not have SELECT permission to the primary key of entity
    elsif action <> 'DELETE' and sum(c.is_selectable::int) <> count(1) from unnest(columns) c where c.is_pkey then
        return next (
            jsonb_build_object(
                'schema', wal ->> 'schema',
                'table', wal ->> 'table',
                'type', action
            ),
            is_rls_enabled,
            (select array_agg(s.subscription_id) from unnest(subscriptions) as s where claims_role = working_role),
            array['Error 401: Unauthorized']
        )::realtime.wal_rls;

    else
        output = jsonb_build_object(
            'schema', wal ->> 'schema',
            'table', wal ->> 'table',
            'type', action,
            'commit_timestamp', to_char(
                ((wal ->> 'timestamp')::timestamptz at time zone 'utc'),
                'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'
            ),
            'columns', (
                select
                    jsonb_agg(
                        jsonb_build_object(
                            'name', pa.attname,
                            'type', pt.typname
                        )
                        order by pa.attnum asc
                    )
                from
                    pg_attribute pa
                    join pg_type pt
                        on pa.atttypid = pt.oid
                where
                    attrelid = entity_
                    and attnum > 0
                    and pg_catalog.has_column_privilege(working_role, entity_, pa.attname, 'SELECT')
            )
        )
        -- Add "record" key for insert and update
        || case
            when action in ('INSERT', 'UPDATE') then
                jsonb_build_object(
                    'record',
                    (
                        select
                            jsonb_object_agg(
                                -- if unchanged toast, get column name and value from old record
                                coalesce((c).name, (oc).name),
                                case
                                    when (c).name is null then (oc).value
                                    else (c).value
                                end
                            )
                        from
                            unnest(columns) c
                            full outer join unnest(old_columns) oc
                                on (c).name = (oc).name
                        where
                            coalesce((c).is_selectable, (oc).is_selectable)
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                    )
                )
            else '{}'::jsonb
        end
        -- Add "old_record" key for update and delete
        || case
            when action = 'UPDATE' then
                jsonb_build_object(
                        'old_record',
                        (
                            select jsonb_object_agg((c).name, (c).value)
                            from unnest(old_columns) c
                            where
                                (c).is_selectable
                                and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                        )
                    )
            when action = 'DELETE' then
                jsonb_build_object(
                    'old_record',
                    (
                        select jsonb_object_agg((c).name, (c).value)
                        from unnest(old_columns) c
                        where
                            (c).is_selectable
                            and ( not error_record_exceeds_max_size or (octet_length((c).value::text) <= 64))
                            and ( not is_rls_enabled or (c).is_pkey ) -- if RLS enabled, we can't secure deletes so filter to pkey
                    )
                )
            else '{}'::jsonb
        end;

        -- Create the prepared statement
        if is_rls_enabled and action <> 'DELETE' then
            if (select 1 from pg_prepared_statements where name = 'walrus_rls_stmt' limit 1) > 0 then
                deallocate walrus_rls_stmt;
            end if;
            execute realtime.build_prepared_statement_sql('walrus_rls_stmt', entity_, columns);
        end if;

        visible_to_subscription_ids = '{}';

        for subscription_id, claims in (
                select
                    subs.subscription_id,
                    subs.claims
                from
                    unnest(subscriptions) subs
                where
                    subs.entity = entity_
                    and subs.claims_role = working_role
                    and (
                        realtime.is_visible_through_filters(columns, subs.filters)
                        or (
                          action = 'DELETE'
                          and realtime.is_visible_through_filters(old_columns, subs.filters)
                        )
                    )
        ) loop

            if not is_rls_enabled or action = 'DELETE' then
                visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
            else
                -- Check if RLS allows the role to see the record
                perform
                    -- Trim leading and trailing quotes from working_role because set_config
                    -- doesn't recognize the role as valid if they are included
                    set_config('role', trim(both '"' from working_role::text), true),
                    set_config('request.jwt.claims', claims::text, true);

                execute 'execute walrus_rls_stmt' into subscription_has_access;

                if subscription_has_access then
                    visible_to_subscription_ids = visible_to_subscription_ids || subscription_id;
                end if;
            end if;
        end loop;

        perform set_config('role', null, true);

        return next (
            output,
            is_rls_enabled,
            visible_to_subscription_ids,
            case
                when error_record_exceeds_max_size then array['Error 413: Payload Too Large']
                else '{}'
            end
        )::realtime.wal_rls;

    end if;
end loop;

perform set_config('role', null, true);
end;
$$;


--
-- Name: broadcast_changes(text, text, text, text, text, record, record, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.broadcast_changes(topic_name text, event_name text, operation text, table_name text, table_schema text, new record, old record, level text DEFAULT 'ROW'::text) RETURNS void
    LANGUAGE plpgsql
    AS $$
DECLARE
    -- Declare a variable to hold the JSONB representation of the row
    row_data jsonb := '{}'::jsonb;
BEGIN
    IF level = 'STATEMENT' THEN
        RAISE EXCEPTION 'function can only be triggered for each row, not for each statement';
    END IF;
    -- Check the operation type and handle accordingly
    IF operation = 'INSERT' OR operation = 'UPDATE' OR operation = 'DELETE' THEN
        row_data := jsonb_build_object('old_record', OLD, 'record', NEW, 'operation', operation, 'table', table_name, 'schema', table_schema);
        PERFORM realtime.send (row_data, event_name, topic_name);
    ELSE
        RAISE EXCEPTION 'Unexpected operation type: %', operation;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE EXCEPTION 'Failed to process the row: %', SQLERRM;
END;

$$;


--
-- Name: build_prepared_statement_sql(text, regclass, realtime.wal_column[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.build_prepared_statement_sql(prepared_statement_name text, entity regclass, columns realtime.wal_column[]) RETURNS text
    LANGUAGE sql
    AS $$
      /*
      Builds a sql string that, if executed, creates a prepared statement to
      tests retrive a row from *entity* by its primary key columns.
      Example
          select realtime.build_prepared_statement_sql('public.notes', '{"id"}'::text[], '{"bigint"}'::text[])
      */
          select
      'prepare ' || prepared_statement_name || ' as
          select
              exists(
                  select
                      1
                  from
                      ' || entity || '
                  where
                      ' || string_agg(quote_ident(pkc.name) || '=' || quote_nullable(pkc.value #>> '{}') , ' and ') || '
              )'
          from
              unnest(columns) pkc
          where
              pkc.is_pkey
          group by
              entity
      $$;


--
-- Name: cast(text, regtype); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime."cast"(val text, type_ regtype) RETURNS jsonb
    LANGUAGE plpgsql IMMUTABLE
    AS $$
    declare
      res jsonb;
    begin
      execute format('select to_jsonb(%L::'|| type_::text || ')', val)  into res;
      return res;
    end
    $$;


--
-- Name: check_equality_op(realtime.equality_op, regtype, text, text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.check_equality_op(op realtime.equality_op, type_ regtype, val_1 text, val_2 text) RETURNS boolean
    LANGUAGE plpgsql IMMUTABLE
    AS $$
      /*
      Casts *val_1* and *val_2* as type *type_* and check the *op* condition for truthiness
      */
      declare
          op_symbol text = (
              case
                  when op = 'eq' then '='
                  when op = 'neq' then '!='
                  when op = 'lt' then '<'
                  when op = 'lte' then '<='
                  when op = 'gt' then '>'
                  when op = 'gte' then '>='
                  when op = 'in' then '= any'
                  else 'UNKNOWN OP'
              end
          );
          res boolean;
      begin
          execute format(
              'select %L::'|| type_::text || ' ' || op_symbol
              || ' ( %L::'
              || (
                  case
                      when op = 'in' then type_::text || '[]'
                      else type_::text end
              )
              || ')', val_1, val_2) into res;
          return res;
      end;
      $$;


--
-- Name: is_visible_through_filters(realtime.wal_column[], realtime.user_defined_filter[]); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.is_visible_through_filters(columns realtime.wal_column[], filters realtime.user_defined_filter[]) RETURNS boolean
    LANGUAGE sql IMMUTABLE
    AS $_$
    /*
    Should the record be visible (true) or filtered out (false) after *filters* are applied
    */
        select
            -- Default to allowed when no filters present
            $2 is null -- no filters. this should not happen because subscriptions has a default
            or array_length($2, 1) is null -- array length of an empty array is null
            or bool_and(
                coalesce(
                    realtime.check_equality_op(
                        op:=f.op,
                        type_:=coalesce(
                            col.type_oid::regtype, -- null when wal2json version <= 2.4
                            col.type_name::regtype
                        ),
                        -- cast jsonb to text
                        val_1:=col.value #>> '{}',
                        val_2:=f.value
                    ),
                    false -- if null, filter does not match
                )
            )
        from
            unnest(filters) f
            join unnest(columns) col
                on f.column_name = col.name;
    $_$;


--
-- Name: list_changes(name, name, integer, integer); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.list_changes(publication name, slot_name name, max_changes integer, max_record_bytes integer) RETURNS SETOF realtime.wal_rls
    LANGUAGE sql
    SET log_min_messages TO 'fatal'
    AS $$
      with pub as (
        select
          concat_ws(
            ',',
            case when bool_or(pubinsert) then 'insert' else null end,
            case when bool_or(pubupdate) then 'update' else null end,
            case when bool_or(pubdelete) then 'delete' else null end
          ) as w2j_actions,
          coalesce(
            string_agg(
              realtime.quote_wal2json(format('%I.%I', schemaname, tablename)::regclass),
              ','
            ) filter (where ppt.tablename is not null and ppt.tablename not like '% %'),
            ''
          ) w2j_add_tables
        from
          pg_publication pp
          left join pg_publication_tables ppt
            on pp.pubname = ppt.pubname
        where
          pp.pubname = publication
        group by
          pp.pubname
        limit 1
      ),
      w2j as (
        select
          x.*, pub.w2j_add_tables
        from
          pub,
          pg_logical_slot_get_changes(
            slot_name, null, max_changes,
            'include-pk', 'true',
            'include-transaction', 'false',
            'include-timestamp', 'true',
            'include-type-oids', 'true',
            'format-version', '2',
            'actions', pub.w2j_actions,
            'add-tables', pub.w2j_add_tables
          ) x
      )
      select
        xyz.wal,
        xyz.is_rls_enabled,
        xyz.subscription_ids,
        xyz.errors
      from
        w2j,
        realtime.apply_rls(
          wal := w2j.data::jsonb,
          max_record_bytes := max_record_bytes
        ) xyz(wal, is_rls_enabled, subscription_ids, errors)
      where
        w2j.w2j_add_tables <> ''
        and xyz.subscription_ids[1] is not null
    $$;


--
-- Name: quote_wal2json(regclass); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.quote_wal2json(entity regclass) RETURNS text
    LANGUAGE sql IMMUTABLE STRICT
    AS $$
      select
        (
          select string_agg('' || ch,'')
          from unnest(string_to_array(nsp.nspname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
        )
        || '.'
        || (
          select string_agg('' || ch,'')
          from unnest(string_to_array(pc.relname::text, null)) with ordinality x(ch, idx)
          where
            not (x.idx = 1 and x.ch = '"')
            and not (
              x.idx = array_length(string_to_array(nsp.nspname::text, null), 1)
              and x.ch = '"'
            )
          )
      from
        pg_class pc
        join pg_namespace nsp
          on pc.relnamespace = nsp.oid
      where
        pc.oid = entity
    $$;


--
-- Name: send(jsonb, text, text, boolean); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.send(payload jsonb, event text, topic text, private boolean DEFAULT true) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  BEGIN
    -- Set the topic configuration
    EXECUTE format('SET LOCAL realtime.topic TO %L', topic);

    -- Attempt to insert the message
    INSERT INTO realtime.messages (payload, event, topic, private, extension)
    VALUES (payload, event, topic, private, 'broadcast');
  EXCEPTION
    WHEN OTHERS THEN
      -- Capture and notify the error
      PERFORM pg_notify(
          'realtime:system',
          jsonb_build_object(
              'error', SQLERRM,
              'function', 'realtime.send',
              'event', event,
              'topic', topic,
              'private', private
          )::text
      );
  END;
END;
$$;


--
-- Name: subscription_check_filters(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.subscription_check_filters() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
    /*
    Validates that the user defined filters for a subscription:
    - refer to valid columns that the claimed role may access
    - values are coercable to the correct column type
    */
    declare
        col_names text[] = coalesce(
                array_agg(c.column_name order by c.ordinal_position),
                '{}'::text[]
            )
            from
                information_schema.columns c
            where
                format('%I.%I', c.table_schema, c.table_name)::regclass = new.entity
                and pg_catalog.has_column_privilege(
                    (new.claims ->> 'role'),
                    format('%I.%I', c.table_schema, c.table_name)::regclass,
                    c.column_name,
                    'SELECT'
                );
        filter realtime.user_defined_filter;
        col_type regtype;

        in_val jsonb;
    begin
        for filter in select * from unnest(new.filters) loop
            -- Filtered column is valid
            if not filter.column_name = any(col_names) then
                raise exception 'invalid column for filter %', filter.column_name;
            end if;

            -- Type is sanitized and safe for string interpolation
            col_type = (
                select atttypid::regtype
                from pg_catalog.pg_attribute
                where attrelid = new.entity
                      and attname = filter.column_name
            );
            if col_type is null then
                raise exception 'failed to lookup type for column %', filter.column_name;
            end if;

            -- Set maximum number of entries for in filter
            if filter.op = 'in'::realtime.equality_op then
                in_val = realtime.cast(filter.value, (col_type::text || '[]')::regtype);
                if coalesce(jsonb_array_length(in_val), 0) > 100 then
                    raise exception 'too many values for `in` filter. Maximum 100';
                end if;
            else
                -- raises an exception if value is not coercable to type
                perform realtime.cast(filter.value, col_type);
            end if;

        end loop;

        -- Apply consistent order to filters so the unique constraint on
        -- (subscription_id, entity, filters) can't be tricked by a different filter order
        new.filters = coalesce(
            array_agg(f order by f.column_name, f.op, f.value),
            '{}'
        ) from unnest(new.filters) f;

        return new;
    end;
    $$;


--
-- Name: to_regrole(text); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.to_regrole(role_name text) RETURNS regrole
    LANGUAGE sql IMMUTABLE
    AS $$ select role_name::regrole $$;


--
-- Name: topic(); Type: FUNCTION; Schema: realtime; Owner: -
--

CREATE FUNCTION realtime.topic() RETURNS text
    LANGUAGE sql STABLE
    AS $$
select nullif(current_setting('realtime.topic', true), '')::text;
$$;


--
-- Name: can_insert_object(text, text, uuid, jsonb); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.can_insert_object(bucketid text, name text, owner uuid, metadata jsonb) RETURNS void
    LANGUAGE plpgsql
    AS $$
BEGIN
  INSERT INTO "storage"."objects" ("bucket_id", "name", "owner", "metadata") VALUES (bucketid, name, owner, metadata);
  -- hack to rollback the successful insert
  RAISE sqlstate 'PT200' using
  message = 'ROLLBACK',
  detail = 'rollback successful insert';
END
$$;


--
-- Name: extension(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.extension(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
_filename text;
BEGIN
	select string_to_array(name, '/') into _parts;
	select _parts[array_length(_parts,1)] into _filename;
	-- @todo return the last part instead of 2
	return reverse(split_part(reverse(_filename), '.', 1));
END
$$;


--
-- Name: filename(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.filename(name text) RETURNS text
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[array_length(_parts,1)];
END
$$;


--
-- Name: foldername(text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.foldername(name text) RETURNS text[]
    LANGUAGE plpgsql
    AS $$
DECLARE
_parts text[];
BEGIN
	select string_to_array(name, '/') into _parts;
	return _parts[1:array_length(_parts,1)-1];
END
$$;


--
-- Name: get_size_by_bucket(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.get_size_by_bucket() RETURNS TABLE(size bigint, bucket_id text)
    LANGUAGE plpgsql
    AS $$
BEGIN
    return query
        select sum((metadata->>'size')::int) as size, obj.bucket_id
        from "storage".objects as obj
        group by obj.bucket_id;
END
$$;


--
-- Name: list_multipart_uploads_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_multipart_uploads_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, next_key_token text DEFAULT ''::text, next_upload_token text DEFAULT ''::text) RETURNS TABLE(key text, id text, created_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(key COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                        substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1)))
                    ELSE
                        key
                END AS key, id, created_at
            FROM
                storage.s3_multipart_uploads
            WHERE
                bucket_id = $5 AND
                key ILIKE $1 || ''%'' AND
                CASE
                    WHEN $4 != '''' AND $6 = '''' THEN
                        CASE
                            WHEN position($2 IN substring(key from length($1) + 1)) > 0 THEN
                                substring(key from 1 for length($1) + position($2 IN substring(key from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                key COLLATE "C" > $4
                            END
                    ELSE
                        true
                END AND
                CASE
                    WHEN $6 != '''' THEN
                        id COLLATE "C" > $6
                    ELSE
                        true
                    END
            ORDER BY
                key COLLATE "C" ASC, created_at ASC) as e order by key COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_key_token, bucket_id, next_upload_token;
END;
$_$;


--
-- Name: list_objects_with_delimiter(text, text, text, integer, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.list_objects_with_delimiter(bucket_id text, prefix_param text, delimiter_param text, max_keys integer DEFAULT 100, start_after text DEFAULT ''::text, next_token text DEFAULT ''::text) RETURNS TABLE(name text, id uuid, metadata jsonb, updated_at timestamp with time zone)
    LANGUAGE plpgsql
    AS $_$
BEGIN
    RETURN QUERY EXECUTE
        'SELECT DISTINCT ON(name COLLATE "C") * from (
            SELECT
                CASE
                    WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                        substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1)))
                    ELSE
                        name
                END AS name, id, metadata, updated_at
            FROM
                storage.objects
            WHERE
                bucket_id = $5 AND
                name ILIKE $1 || ''%'' AND
                CASE
                    WHEN $6 != '''' THEN
                    name COLLATE "C" > $6
                ELSE true END
                AND CASE
                    WHEN $4 != '''' THEN
                        CASE
                            WHEN position($2 IN substring(name from length($1) + 1)) > 0 THEN
                                substring(name from 1 for length($1) + position($2 IN substring(name from length($1) + 1))) COLLATE "C" > $4
                            ELSE
                                name COLLATE "C" > $4
                            END
                    ELSE
                        true
                END
            ORDER BY
                name COLLATE "C" ASC) as e order by name COLLATE "C" LIMIT $3'
        USING prefix_param, delimiter_param, max_keys, next_token, bucket_id, start_after;
END;
$_$;


--
-- Name: operation(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.operation() RETURNS text
    LANGUAGE plpgsql STABLE
    AS $$
BEGIN
    RETURN current_setting('storage.operation', true);
END;
$$;


--
-- Name: search(text, text, integer, integer, integer, text, text, text); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.search(prefix text, bucketname text, limits integer DEFAULT 100, levels integer DEFAULT 1, offsets integer DEFAULT 0, search text DEFAULT ''::text, sortcolumn text DEFAULT 'name'::text, sortorder text DEFAULT 'asc'::text) RETURNS TABLE(name text, id uuid, updated_at timestamp with time zone, created_at timestamp with time zone, last_accessed_at timestamp with time zone, metadata jsonb)
    LANGUAGE plpgsql STABLE
    AS $_$
declare
  v_order_by text;
  v_sort_order text;
begin
  case
    when sortcolumn = 'name' then
      v_order_by = 'name';
    when sortcolumn = 'updated_at' then
      v_order_by = 'updated_at';
    when sortcolumn = 'created_at' then
      v_order_by = 'created_at';
    when sortcolumn = 'last_accessed_at' then
      v_order_by = 'last_accessed_at';
    else
      v_order_by = 'name';
  end case;

  case
    when sortorder = 'asc' then
      v_sort_order = 'asc';
    when sortorder = 'desc' then
      v_sort_order = 'desc';
    else
      v_sort_order = 'asc';
  end case;

  v_order_by = v_order_by || ' ' || v_sort_order;

  return query execute
    'with folders as (
       select path_tokens[$1] as folder
       from storage.objects
         where objects.name ilike $2 || $3 || ''%''
           and bucket_id = $4
           and array_length(objects.path_tokens, 1) <> $1
       group by folder
       order by folder ' || v_sort_order || '
     )
     (select folder as "name",
            null as id,
            null as updated_at,
            null as created_at,
            null as last_accessed_at,
            null as metadata from folders)
     union all
     (select path_tokens[$1] as "name",
            id,
            updated_at,
            created_at,
            last_accessed_at,
            metadata
     from storage.objects
     where objects.name ilike $2 || $3 || ''%''
       and bucket_id = $4
       and array_length(objects.path_tokens, 1) = $1
     order by ' || v_order_by || ')
     limit $5
     offset $6' using levels, prefix, search, bucketname, limits, offsets;
end;
$_$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: storage; Owner: -
--

CREATE FUNCTION storage.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW; 
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: audit_log_entries; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.audit_log_entries (
    instance_id uuid,
    id uuid NOT NULL,
    payload json,
    created_at timestamp with time zone,
    ip_address character varying(64) DEFAULT ''::character varying NOT NULL
);


--
-- Name: TABLE audit_log_entries; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.audit_log_entries IS 'Auth: Audit trail for user actions.';


--
-- Name: flow_state; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.flow_state (
    id uuid NOT NULL,
    user_id uuid,
    auth_code text NOT NULL,
    code_challenge_method auth.code_challenge_method NOT NULL,
    code_challenge text NOT NULL,
    provider_type text NOT NULL,
    provider_access_token text,
    provider_refresh_token text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    authentication_method text NOT NULL,
    auth_code_issued_at timestamp with time zone
);


--
-- Name: TABLE flow_state; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.flow_state IS 'stores metadata for pkce logins';


--
-- Name: identities; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.identities (
    provider_id text NOT NULL,
    user_id uuid NOT NULL,
    identity_data jsonb NOT NULL,
    provider text NOT NULL,
    last_sign_in_at timestamp with time zone,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    email text GENERATED ALWAYS AS (lower((identity_data ->> 'email'::text))) STORED,
    id uuid DEFAULT gen_random_uuid() NOT NULL
);


--
-- Name: TABLE identities; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.identities IS 'Auth: Stores identities associated to a user.';


--
-- Name: COLUMN identities.email; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.identities.email IS 'Auth: Email is a generated column that references the optional email property in the identity_data';


--
-- Name: instances; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.instances (
    id uuid NOT NULL,
    uuid uuid,
    raw_base_config text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone
);


--
-- Name: TABLE instances; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.instances IS 'Auth: Manages users across multiple sites.';


--
-- Name: mfa_amr_claims; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_amr_claims (
    session_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    authentication_method text NOT NULL,
    id uuid NOT NULL
);


--
-- Name: TABLE mfa_amr_claims; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_amr_claims IS 'auth: stores authenticator method reference claims for multi factor authentication';


--
-- Name: mfa_challenges; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_challenges (
    id uuid NOT NULL,
    factor_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL,
    verified_at timestamp with time zone,
    ip_address inet NOT NULL,
    otp_code text,
    web_authn_session_data jsonb
);


--
-- Name: TABLE mfa_challenges; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_challenges IS 'auth: stores metadata about challenge requests made';


--
-- Name: mfa_factors; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.mfa_factors (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    friendly_name text,
    factor_type auth.factor_type NOT NULL,
    status auth.factor_status NOT NULL,
    created_at timestamp with time zone NOT NULL,
    updated_at timestamp with time zone NOT NULL,
    secret text,
    phone text,
    last_challenged_at timestamp with time zone,
    web_authn_credential jsonb,
    web_authn_aaguid uuid
);


--
-- Name: TABLE mfa_factors; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.mfa_factors IS 'auth: stores metadata about factors';


--
-- Name: one_time_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.one_time_tokens (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    token_type auth.one_time_token_type NOT NULL,
    token_hash text NOT NULL,
    relates_to text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    CONSTRAINT one_time_tokens_token_hash_check CHECK ((char_length(token_hash) > 0))
);


--
-- Name: refresh_tokens; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.refresh_tokens (
    instance_id uuid,
    id bigint NOT NULL,
    token character varying(255),
    user_id character varying(255),
    revoked boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    parent character varying(255),
    session_id uuid
);


--
-- Name: TABLE refresh_tokens; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.refresh_tokens IS 'Auth: Store of tokens used to refresh JWT tokens once they expire.';


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE; Schema: auth; Owner: -
--

CREATE SEQUENCE auth.refresh_tokens_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: auth; Owner: -
--

ALTER SEQUENCE auth.refresh_tokens_id_seq OWNED BY auth.refresh_tokens.id;


--
-- Name: saml_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_providers (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    entity_id text NOT NULL,
    metadata_xml text NOT NULL,
    metadata_url text,
    attribute_mapping jsonb,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    name_id_format text,
    CONSTRAINT "entity_id not empty" CHECK ((char_length(entity_id) > 0)),
    CONSTRAINT "metadata_url not empty" CHECK (((metadata_url = NULL::text) OR (char_length(metadata_url) > 0))),
    CONSTRAINT "metadata_xml not empty" CHECK ((char_length(metadata_xml) > 0))
);


--
-- Name: TABLE saml_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_providers IS 'Auth: Manages SAML Identity Provider connections.';


--
-- Name: saml_relay_states; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.saml_relay_states (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    request_id text NOT NULL,
    for_email text,
    redirect_to text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    flow_state_id uuid,
    CONSTRAINT "request_id not empty" CHECK ((char_length(request_id) > 0))
);


--
-- Name: TABLE saml_relay_states; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.saml_relay_states IS 'Auth: Contains SAML Relay State information for each Service Provider initiated login.';


--
-- Name: schema_migrations; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.schema_migrations (
    version character varying(255) NOT NULL
);


--
-- Name: TABLE schema_migrations; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.schema_migrations IS 'Auth: Manages updates to the auth system.';


--
-- Name: sessions; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sessions (
    id uuid NOT NULL,
    user_id uuid NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    factor_id uuid,
    aal auth.aal_level,
    not_after timestamp with time zone,
    refreshed_at timestamp without time zone,
    user_agent text,
    ip inet,
    tag text
);


--
-- Name: TABLE sessions; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sessions IS 'Auth: Stores session data associated to a user.';


--
-- Name: COLUMN sessions.not_after; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sessions.not_after IS 'Auth: Not after is a nullable column that contains a timestamp after which the session should be regarded as expired.';


--
-- Name: sso_domains; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_domains (
    id uuid NOT NULL,
    sso_provider_id uuid NOT NULL,
    domain text NOT NULL,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "domain not empty" CHECK ((char_length(domain) > 0))
);


--
-- Name: TABLE sso_domains; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_domains IS 'Auth: Manages SSO email address domain mapping to an SSO Identity Provider.';


--
-- Name: sso_providers; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.sso_providers (
    id uuid NOT NULL,
    resource_id text,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    CONSTRAINT "resource_id not empty" CHECK (((resource_id = NULL::text) OR (char_length(resource_id) > 0)))
);


--
-- Name: TABLE sso_providers; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.sso_providers IS 'Auth: Manages SSO identity provider information; see saml_providers for SAML.';


--
-- Name: COLUMN sso_providers.resource_id; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.sso_providers.resource_id IS 'Auth: Uniquely identifies a SSO provider according to a user-chosen resource ID (case insensitive), useful in infrastructure as code.';


--
-- Name: users; Type: TABLE; Schema: auth; Owner: -
--

CREATE TABLE auth.users (
    instance_id uuid,
    id uuid NOT NULL,
    aud character varying(255),
    role character varying(255),
    email character varying(255),
    encrypted_password character varying(255),
    email_confirmed_at timestamp with time zone,
    invited_at timestamp with time zone,
    confirmation_token character varying(255),
    confirmation_sent_at timestamp with time zone,
    recovery_token character varying(255),
    recovery_sent_at timestamp with time zone,
    email_change_token_new character varying(255),
    email_change character varying(255),
    email_change_sent_at timestamp with time zone,
    last_sign_in_at timestamp with time zone,
    raw_app_meta_data jsonb,
    raw_user_meta_data jsonb,
    is_super_admin boolean,
    created_at timestamp with time zone,
    updated_at timestamp with time zone,
    phone text DEFAULT NULL::character varying,
    phone_confirmed_at timestamp with time zone,
    phone_change text DEFAULT ''::character varying,
    phone_change_token character varying(255) DEFAULT ''::character varying,
    phone_change_sent_at timestamp with time zone,
    confirmed_at timestamp with time zone GENERATED ALWAYS AS (LEAST(email_confirmed_at, phone_confirmed_at)) STORED,
    email_change_token_current character varying(255) DEFAULT ''::character varying,
    email_change_confirm_status smallint DEFAULT 0,
    banned_until timestamp with time zone,
    reauthentication_token character varying(255) DEFAULT ''::character varying,
    reauthentication_sent_at timestamp with time zone,
    is_sso_user boolean DEFAULT false NOT NULL,
    deleted_at timestamp with time zone,
    is_anonymous boolean DEFAULT false NOT NULL,
    CONSTRAINT users_email_change_confirm_status_check CHECK (((email_change_confirm_status >= 0) AND (email_change_confirm_status <= 2)))
);


--
-- Name: TABLE users; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON TABLE auth.users IS 'Auth: Stores user login data within a secure schema.';


--
-- Name: COLUMN users.is_sso_user; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON COLUMN auth.users.is_sso_user IS 'Auth: Set this column to true when the account comes from SSO. These accounts can have duplicate emails.';


--
-- Name: EmotionalState; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."EmotionalState" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    "isActive" boolean DEFAULT true NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "mainSentimentId" integer NOT NULL
);


--
-- Name: EmotionalState_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."EmotionalState_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: EmotionalState_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."EmotionalState_id_seq" OWNED BY public."EmotionalState".id;


--
-- Name: JourneyFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JourneyFlow" (
    id integer NOT NULL,
    "mainSentimentId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JourneyFlow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."JourneyFlow_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: JourneyFlow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."JourneyFlow_id_seq" OWNED BY public."JourneyFlow".id;


--
-- Name: JourneyOption; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JourneyOption" (
    id integer NOT NULL,
    "journeyStepId" text NOT NULL,
    text text NOT NULL,
    "nextStepId" text,
    "isFinal" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JourneyOptionFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JourneyOptionFlow" (
    id integer NOT NULL,
    "journeyStepFlowId" integer NOT NULL,
    "optionId" text NOT NULL,
    text text NOT NULL,
    "nextStepId" text,
    "isEndState" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JourneyOptionFlow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."JourneyOptionFlow_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: JourneyOptionFlow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."JourneyOptionFlow_id_seq" OWNED BY public."JourneyOptionFlow".id;


--
-- Name: JourneyOption_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."JourneyOption_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: JourneyOption_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."JourneyOption_id_seq" OWNED BY public."JourneyOption".id;


--
-- Name: JourneyStep; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JourneyStep" (
    id text NOT NULL,
    "emotionalStateId" integer NOT NULL,
    "order" integer NOT NULL,
    question text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "stepId" text NOT NULL
);


--
-- Name: JourneyStepFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."JourneyStepFlow" (
    id integer NOT NULL,
    "journeyFlowId" integer NOT NULL,
    "stepId" text NOT NULL,
    "order" integer NOT NULL,
    question text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: JourneyStepFlow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."JourneyStepFlow_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: JourneyStepFlow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."JourneyStepFlow_id_seq" OWNED BY public."JourneyStepFlow".id;


--
-- Name: MainSentiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MainSentiment" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    keywords text[] DEFAULT ARRAY[]::text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MainSentiment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MainSentiment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MainSentiment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MainSentiment_id_seq" OWNED BY public."MainSentiment".id;


--
-- Name: Movie; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Movie" (
    id text NOT NULL,
    title text NOT NULL,
    year integer,
    director text,
    genres text[],
    "streamingPlatforms" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    description text,
    thumbnail text,
    original_title text
);


--
-- Name: MovieSentiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MovieSentiment" (
    "movieId" text NOT NULL,
    "mainSentimentId" integer NOT NULL,
    "subSentimentId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MovieSuggestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MovieSuggestion" (
    id integer NOT NULL,
    "movieId" text NOT NULL,
    "emotionalStateId" integer NOT NULL,
    reason text NOT NULL,
    relevance integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "journeyOptionId" integer NOT NULL
);


--
-- Name: MovieSuggestionFlow; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."MovieSuggestionFlow" (
    id integer NOT NULL,
    "journeyOptionFlowId" integer NOT NULL,
    "movieId" text NOT NULL,
    reason text NOT NULL,
    relevance integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: MovieSuggestionFlow_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MovieSuggestionFlow_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MovieSuggestionFlow_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MovieSuggestionFlow_id_seq" OWNED BY public."MovieSuggestionFlow".id;


--
-- Name: MovieSuggestion_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."MovieSuggestion_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: MovieSuggestion_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."MovieSuggestion_id_seq" OWNED BY public."MovieSuggestion".id;


--
-- Name: SubSentiment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SubSentiment" (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    keywords text[] DEFAULT ARRAY[]::text[],
    "mainSentimentId" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: SubSentiment_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."SubSentiment_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: SubSentiment_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."SubSentiment_id_seq" OWNED BY public."SubSentiment".id;


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: messages; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.messages (
    topic text NOT NULL,
    extension text NOT NULL,
    payload jsonb,
    event text,
    private boolean DEFAULT false,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    inserted_at timestamp without time zone DEFAULT now() NOT NULL,
    id uuid DEFAULT gen_random_uuid() NOT NULL
)
PARTITION BY RANGE (inserted_at);


--
-- Name: schema_migrations; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.schema_migrations (
    version bigint NOT NULL,
    inserted_at timestamp(0) without time zone
);


--
-- Name: subscription; Type: TABLE; Schema: realtime; Owner: -
--

CREATE TABLE realtime.subscription (
    id bigint NOT NULL,
    subscription_id uuid NOT NULL,
    entity regclass NOT NULL,
    filters realtime.user_defined_filter[] DEFAULT '{}'::realtime.user_defined_filter[] NOT NULL,
    claims jsonb NOT NULL,
    claims_role regrole GENERATED ALWAYS AS (realtime.to_regrole((claims ->> 'role'::text))) STORED NOT NULL,
    created_at timestamp without time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);


--
-- Name: subscription_id_seq; Type: SEQUENCE; Schema: realtime; Owner: -
--

ALTER TABLE realtime.subscription ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME realtime.subscription_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: buckets; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.buckets (
    id text NOT NULL,
    name text NOT NULL,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    public boolean DEFAULT false,
    avif_autodetection boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[],
    owner_id text
);


--
-- Name: COLUMN buckets.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.buckets.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: migrations; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.migrations (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    hash character varying(40) NOT NULL,
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: objects; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.objects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    bucket_id text,
    name text,
    owner uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    last_accessed_at timestamp with time zone DEFAULT now(),
    metadata jsonb,
    path_tokens text[] GENERATED ALWAYS AS (string_to_array(name, '/'::text)) STORED,
    version text,
    owner_id text,
    user_metadata jsonb
);


--
-- Name: COLUMN objects.owner; Type: COMMENT; Schema: storage; Owner: -
--

COMMENT ON COLUMN storage.objects.owner IS 'Field is deprecated, use owner_id instead';


--
-- Name: s3_multipart_uploads; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads (
    id text NOT NULL,
    in_progress_size bigint DEFAULT 0 NOT NULL,
    upload_signature text NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    version text NOT NULL,
    owner_id text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    user_metadata jsonb
);


--
-- Name: s3_multipart_uploads_parts; Type: TABLE; Schema: storage; Owner: -
--

CREATE TABLE storage.s3_multipart_uploads_parts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    upload_id text NOT NULL,
    size bigint DEFAULT 0 NOT NULL,
    part_number integer NOT NULL,
    bucket_id text NOT NULL,
    key text NOT NULL COLLATE pg_catalog."C",
    etag text NOT NULL,
    owner_id text,
    version text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: refresh_tokens id; Type: DEFAULT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens ALTER COLUMN id SET DEFAULT nextval('auth.refresh_tokens_id_seq'::regclass);


--
-- Name: EmotionalState id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmotionalState" ALTER COLUMN id SET DEFAULT nextval('public."EmotionalState_id_seq"'::regclass);


--
-- Name: JourneyFlow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyFlow" ALTER COLUMN id SET DEFAULT nextval('public."JourneyFlow_id_seq"'::regclass);


--
-- Name: JourneyOption id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOption" ALTER COLUMN id SET DEFAULT nextval('public."JourneyOption_id_seq"'::regclass);


--
-- Name: JourneyOptionFlow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOptionFlow" ALTER COLUMN id SET DEFAULT nextval('public."JourneyOptionFlow_id_seq"'::regclass);


--
-- Name: JourneyStepFlow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyStepFlow" ALTER COLUMN id SET DEFAULT nextval('public."JourneyStepFlow_id_seq"'::regclass);


--
-- Name: MainSentiment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MainSentiment" ALTER COLUMN id SET DEFAULT nextval('public."MainSentiment_id_seq"'::regclass);


--
-- Name: MovieSuggestion id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestion" ALTER COLUMN id SET DEFAULT nextval('public."MovieSuggestion_id_seq"'::regclass);


--
-- Name: MovieSuggestionFlow id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestionFlow" ALTER COLUMN id SET DEFAULT nextval('public."MovieSuggestionFlow_id_seq"'::regclass);


--
-- Name: SubSentiment id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubSentiment" ALTER COLUMN id SET DEFAULT nextval('public."SubSentiment_id_seq"'::regclass);


--
-- Name: mfa_amr_claims amr_id_pk; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT amr_id_pk PRIMARY KEY (id);


--
-- Name: audit_log_entries audit_log_entries_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.audit_log_entries
    ADD CONSTRAINT audit_log_entries_pkey PRIMARY KEY (id);


--
-- Name: flow_state flow_state_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.flow_state
    ADD CONSTRAINT flow_state_pkey PRIMARY KEY (id);


--
-- Name: identities identities_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_pkey PRIMARY KEY (id);


--
-- Name: identities identities_provider_id_provider_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_provider_id_provider_unique UNIQUE (provider_id, provider);


--
-- Name: instances instances_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.instances
    ADD CONSTRAINT instances_pkey PRIMARY KEY (id);


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_authentication_method_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_authentication_method_pkey UNIQUE (session_id, authentication_method);


--
-- Name: mfa_challenges mfa_challenges_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_pkey PRIMARY KEY (id);


--
-- Name: mfa_factors mfa_factors_last_challenged_at_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_last_challenged_at_key UNIQUE (last_challenged_at);


--
-- Name: mfa_factors mfa_factors_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_pkey PRIMARY KEY (id);


--
-- Name: one_time_tokens one_time_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_pkey PRIMARY KEY (id);


--
-- Name: refresh_tokens refresh_tokens_token_unique; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_token_unique UNIQUE (token);


--
-- Name: saml_providers saml_providers_entity_id_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_entity_id_key UNIQUE (entity_id);


--
-- Name: saml_providers saml_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_pkey PRIMARY KEY (id);


--
-- Name: saml_relay_states saml_relay_states_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_pkey PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);


--
-- Name: sso_domains sso_domains_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_pkey PRIMARY KEY (id);


--
-- Name: sso_providers sso_providers_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_providers
    ADD CONSTRAINT sso_providers_pkey PRIMARY KEY (id);


--
-- Name: users users_phone_key; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_phone_key UNIQUE (phone);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: EmotionalState EmotionalState_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmotionalState"
    ADD CONSTRAINT "EmotionalState_pkey" PRIMARY KEY (id);


--
-- Name: JourneyFlow JourneyFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyFlow"
    ADD CONSTRAINT "JourneyFlow_pkey" PRIMARY KEY (id);


--
-- Name: JourneyOptionFlow JourneyOptionFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOptionFlow"
    ADD CONSTRAINT "JourneyOptionFlow_pkey" PRIMARY KEY (id);


--
-- Name: JourneyOption JourneyOption_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOption"
    ADD CONSTRAINT "JourneyOption_pkey" PRIMARY KEY (id);


--
-- Name: JourneyStepFlow JourneyStepFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyStepFlow"
    ADD CONSTRAINT "JourneyStepFlow_pkey" PRIMARY KEY (id);


--
-- Name: JourneyStep JourneyStep_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyStep"
    ADD CONSTRAINT "JourneyStep_pkey" PRIMARY KEY (id);


--
-- Name: MainSentiment MainSentiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MainSentiment"
    ADD CONSTRAINT "MainSentiment_pkey" PRIMARY KEY (id);


--
-- Name: MovieSentiment MovieSentiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSentiment"
    ADD CONSTRAINT "MovieSentiment_pkey" PRIMARY KEY ("movieId", "mainSentimentId", "subSentimentId");


--
-- Name: MovieSuggestionFlow MovieSuggestionFlow_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestionFlow"
    ADD CONSTRAINT "MovieSuggestionFlow_pkey" PRIMARY KEY (id);


--
-- Name: MovieSuggestion MovieSuggestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestion"
    ADD CONSTRAINT "MovieSuggestion_pkey" PRIMARY KEY (id);


--
-- Name: Movie Movie_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Movie"
    ADD CONSTRAINT "Movie_pkey" PRIMARY KEY (id);


--
-- Name: SubSentiment SubSentiment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubSentiment"
    ADD CONSTRAINT "SubSentiment_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: MovieSuggestionFlow movie_suggestion_flow_unique_constraint; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestionFlow"
    ADD CONSTRAINT movie_suggestion_flow_unique_constraint UNIQUE ("journeyOptionFlowId", "movieId");


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id, inserted_at);


--
-- Name: subscription pk_subscription; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.subscription
    ADD CONSTRAINT pk_subscription PRIMARY KEY (id);


--
-- Name: schema_migrations schema_migrations_pkey; Type: CONSTRAINT; Schema: realtime; Owner: -
--

ALTER TABLE ONLY realtime.schema_migrations
    ADD CONSTRAINT schema_migrations_pkey PRIMARY KEY (version);


--
-- Name: buckets buckets_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.buckets
    ADD CONSTRAINT buckets_pkey PRIMARY KEY (id);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: objects objects_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT objects_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_pkey PRIMARY KEY (id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_pkey; Type: CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX audit_logs_instance_id_idx ON auth.audit_log_entries USING btree (instance_id);


--
-- Name: confirmation_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX confirmation_token_idx ON auth.users USING btree (confirmation_token) WHERE ((confirmation_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_current_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_current_idx ON auth.users USING btree (email_change_token_current) WHERE ((email_change_token_current)::text !~ '^[0-9 ]*$'::text);


--
-- Name: email_change_token_new_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX email_change_token_new_idx ON auth.users USING btree (email_change_token_new) WHERE ((email_change_token_new)::text !~ '^[0-9 ]*$'::text);


--
-- Name: factor_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX factor_id_created_at_idx ON auth.mfa_factors USING btree (user_id, created_at);


--
-- Name: flow_state_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX flow_state_created_at_idx ON auth.flow_state USING btree (created_at DESC);


--
-- Name: identities_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_email_idx ON auth.identities USING btree (email text_pattern_ops);


--
-- Name: INDEX identities_email_idx; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.identities_email_idx IS 'Auth: Ensures indexed queries on the email column';


--
-- Name: identities_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX identities_user_id_idx ON auth.identities USING btree (user_id);


--
-- Name: idx_auth_code; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_auth_code ON auth.flow_state USING btree (auth_code);


--
-- Name: idx_user_id_auth_method; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX idx_user_id_auth_method ON auth.flow_state USING btree (user_id, authentication_method);


--
-- Name: mfa_challenge_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_challenge_created_at_idx ON auth.mfa_challenges USING btree (created_at DESC);


--
-- Name: mfa_factors_user_friendly_name_unique; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX mfa_factors_user_friendly_name_unique ON auth.mfa_factors USING btree (friendly_name, user_id) WHERE (TRIM(BOTH FROM friendly_name) <> ''::text);


--
-- Name: mfa_factors_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX mfa_factors_user_id_idx ON auth.mfa_factors USING btree (user_id);


--
-- Name: one_time_tokens_relates_to_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_relates_to_hash_idx ON auth.one_time_tokens USING hash (relates_to);


--
-- Name: one_time_tokens_token_hash_hash_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX one_time_tokens_token_hash_hash_idx ON auth.one_time_tokens USING hash (token_hash);


--
-- Name: one_time_tokens_user_id_token_type_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX one_time_tokens_user_id_token_type_key ON auth.one_time_tokens USING btree (user_id, token_type);


--
-- Name: reauthentication_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX reauthentication_token_idx ON auth.users USING btree (reauthentication_token) WHERE ((reauthentication_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: recovery_token_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX recovery_token_idx ON auth.users USING btree (recovery_token) WHERE ((recovery_token)::text !~ '^[0-9 ]*$'::text);


--
-- Name: refresh_tokens_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_idx ON auth.refresh_tokens USING btree (instance_id);


--
-- Name: refresh_tokens_instance_id_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_instance_id_user_id_idx ON auth.refresh_tokens USING btree (instance_id, user_id);


--
-- Name: refresh_tokens_parent_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_parent_idx ON auth.refresh_tokens USING btree (parent);


--
-- Name: refresh_tokens_session_id_revoked_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_session_id_revoked_idx ON auth.refresh_tokens USING btree (session_id, revoked);


--
-- Name: refresh_tokens_updated_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX refresh_tokens_updated_at_idx ON auth.refresh_tokens USING btree (updated_at DESC);


--
-- Name: saml_providers_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_providers_sso_provider_id_idx ON auth.saml_providers USING btree (sso_provider_id);


--
-- Name: saml_relay_states_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_created_at_idx ON auth.saml_relay_states USING btree (created_at DESC);


--
-- Name: saml_relay_states_for_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_for_email_idx ON auth.saml_relay_states USING btree (for_email);


--
-- Name: saml_relay_states_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX saml_relay_states_sso_provider_id_idx ON auth.saml_relay_states USING btree (sso_provider_id);


--
-- Name: sessions_not_after_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_not_after_idx ON auth.sessions USING btree (not_after DESC);


--
-- Name: sessions_user_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sessions_user_id_idx ON auth.sessions USING btree (user_id);


--
-- Name: sso_domains_domain_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_domains_domain_idx ON auth.sso_domains USING btree (lower(domain));


--
-- Name: sso_domains_sso_provider_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX sso_domains_sso_provider_id_idx ON auth.sso_domains USING btree (sso_provider_id);


--
-- Name: sso_providers_resource_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX sso_providers_resource_id_idx ON auth.sso_providers USING btree (lower(resource_id));


--
-- Name: unique_phone_factor_per_user; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX unique_phone_factor_per_user ON auth.mfa_factors USING btree (user_id, phone);


--
-- Name: user_id_created_at_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX user_id_created_at_idx ON auth.sessions USING btree (user_id, created_at);


--
-- Name: users_email_partial_key; Type: INDEX; Schema: auth; Owner: -
--

CREATE UNIQUE INDEX users_email_partial_key ON auth.users USING btree (email) WHERE (is_sso_user = false);


--
-- Name: INDEX users_email_partial_key; Type: COMMENT; Schema: auth; Owner: -
--

COMMENT ON INDEX auth.users_email_partial_key IS 'Auth: A partial unique index that applies only when is_sso_user is false';


--
-- Name: users_instance_id_email_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_email_idx ON auth.users USING btree (instance_id, lower((email)::text));


--
-- Name: users_instance_id_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_instance_id_idx ON auth.users USING btree (instance_id);


--
-- Name: users_is_anonymous_idx; Type: INDEX; Schema: auth; Owner: -
--

CREATE INDEX users_is_anonymous_idx ON auth.users USING btree (is_anonymous);


--
-- Name: EmotionalState_mainSentimentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "EmotionalState_mainSentimentId_idx" ON public."EmotionalState" USING btree ("mainSentimentId");


--
-- Name: EmotionalState_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "EmotionalState_name_key" ON public."EmotionalState" USING btree (name);


--
-- Name: JourneyFlow_mainSentimentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "JourneyFlow_mainSentimentId_key" ON public."JourneyFlow" USING btree ("mainSentimentId");


--
-- Name: JourneyOptionFlow_journeyStepFlowId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JourneyOptionFlow_journeyStepFlowId_idx" ON public."JourneyOptionFlow" USING btree ("journeyStepFlowId");


--
-- Name: JourneyOption_journeyStepId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JourneyOption_journeyStepId_idx" ON public."JourneyOption" USING btree ("journeyStepId");


--
-- Name: JourneyStepFlow_journeyFlowId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JourneyStepFlow_journeyFlowId_idx" ON public."JourneyStepFlow" USING btree ("journeyFlowId");


--
-- Name: JourneyStep_emotionalStateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "JourneyStep_emotionalStateId_idx" ON public."JourneyStep" USING btree ("emotionalStateId");


--
-- Name: MainSentiment_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "MainSentiment_name_key" ON public."MainSentiment" USING btree (name);


--
-- Name: MovieSentiment_mainSentimentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSentiment_mainSentimentId_idx" ON public."MovieSentiment" USING btree ("mainSentimentId");


--
-- Name: MovieSentiment_subSentimentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSentiment_subSentimentId_idx" ON public."MovieSentiment" USING btree ("subSentimentId");


--
-- Name: MovieSuggestionFlow_journeyOptionFlowId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSuggestionFlow_journeyOptionFlowId_idx" ON public."MovieSuggestionFlow" USING btree ("journeyOptionFlowId");


--
-- Name: MovieSuggestionFlow_movieId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSuggestionFlow_movieId_idx" ON public."MovieSuggestionFlow" USING btree ("movieId");


--
-- Name: MovieSuggestion_emotionalStateId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSuggestion_emotionalStateId_idx" ON public."MovieSuggestion" USING btree ("emotionalStateId");


--
-- Name: MovieSuggestion_journeyOptionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSuggestion_journeyOptionId_idx" ON public."MovieSuggestion" USING btree ("journeyOptionId");


--
-- Name: MovieSuggestion_movieId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "MovieSuggestion_movieId_idx" ON public."MovieSuggestion" USING btree ("movieId");


--
-- Name: Movie_title_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Movie_title_key" ON public."Movie" USING btree (title);


--
-- Name: SubSentiment_mainSentimentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SubSentiment_mainSentimentId_idx" ON public."SubSentiment" USING btree ("mainSentimentId");


--
-- Name: SubSentiment_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SubSentiment_name_key" ON public."SubSentiment" USING btree (name);


--
-- Name: ix_realtime_subscription_entity; Type: INDEX; Schema: realtime; Owner: -
--

CREATE INDEX ix_realtime_subscription_entity ON realtime.subscription USING btree (entity);


--
-- Name: subscription_subscription_id_entity_filters_key; Type: INDEX; Schema: realtime; Owner: -
--

CREATE UNIQUE INDEX subscription_subscription_id_entity_filters_key ON realtime.subscription USING btree (subscription_id, entity, filters);


--
-- Name: bname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bname ON storage.buckets USING btree (name);


--
-- Name: bucketid_objname; Type: INDEX; Schema: storage; Owner: -
--

CREATE UNIQUE INDEX bucketid_objname ON storage.objects USING btree (bucket_id, name);


--
-- Name: idx_multipart_uploads_list; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_multipart_uploads_list ON storage.s3_multipart_uploads USING btree (bucket_id, key, created_at);


--
-- Name: idx_objects_bucket_id_name; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX idx_objects_bucket_id_name ON storage.objects USING btree (bucket_id, name COLLATE "C");


--
-- Name: name_prefix_search; Type: INDEX; Schema: storage; Owner: -
--

CREATE INDEX name_prefix_search ON storage.objects USING btree (name text_pattern_ops);


--
-- Name: subscription tr_check_filters; Type: TRIGGER; Schema: realtime; Owner: -
--

CREATE TRIGGER tr_check_filters BEFORE INSERT OR UPDATE ON realtime.subscription FOR EACH ROW EXECUTE FUNCTION realtime.subscription_check_filters();


--
-- Name: objects update_objects_updated_at; Type: TRIGGER; Schema: storage; Owner: -
--

CREATE TRIGGER update_objects_updated_at BEFORE UPDATE ON storage.objects FOR EACH ROW EXECUTE FUNCTION storage.update_updated_at_column();


--
-- Name: identities identities_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.identities
    ADD CONSTRAINT identities_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: mfa_amr_claims mfa_amr_claims_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_amr_claims
    ADD CONSTRAINT mfa_amr_claims_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: mfa_challenges mfa_challenges_auth_factor_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_challenges
    ADD CONSTRAINT mfa_challenges_auth_factor_id_fkey FOREIGN KEY (factor_id) REFERENCES auth.mfa_factors(id) ON DELETE CASCADE;


--
-- Name: mfa_factors mfa_factors_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.mfa_factors
    ADD CONSTRAINT mfa_factors_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: one_time_tokens one_time_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.one_time_tokens
    ADD CONSTRAINT one_time_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: refresh_tokens refresh_tokens_session_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.refresh_tokens
    ADD CONSTRAINT refresh_tokens_session_id_fkey FOREIGN KEY (session_id) REFERENCES auth.sessions(id) ON DELETE CASCADE;


--
-- Name: saml_providers saml_providers_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_providers
    ADD CONSTRAINT saml_providers_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_flow_state_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_flow_state_id_fkey FOREIGN KEY (flow_state_id) REFERENCES auth.flow_state(id) ON DELETE CASCADE;


--
-- Name: saml_relay_states saml_relay_states_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.saml_relay_states
    ADD CONSTRAINT saml_relay_states_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: sso_domains sso_domains_sso_provider_id_fkey; Type: FK CONSTRAINT; Schema: auth; Owner: -
--

ALTER TABLE ONLY auth.sso_domains
    ADD CONSTRAINT sso_domains_sso_provider_id_fkey FOREIGN KEY (sso_provider_id) REFERENCES auth.sso_providers(id) ON DELETE CASCADE;


--
-- Name: EmotionalState EmotionalState_mainSentimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."EmotionalState"
    ADD CONSTRAINT "EmotionalState_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES public."MainSentiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JourneyFlow JourneyFlow_mainSentimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyFlow"
    ADD CONSTRAINT "JourneyFlow_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES public."MainSentiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JourneyOptionFlow JourneyOptionFlow_journeyStepFlowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOptionFlow"
    ADD CONSTRAINT "JourneyOptionFlow_journeyStepFlowId_fkey" FOREIGN KEY ("journeyStepFlowId") REFERENCES public."JourneyStepFlow"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JourneyOption JourneyOption_journeyStepId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyOption"
    ADD CONSTRAINT "JourneyOption_journeyStepId_fkey" FOREIGN KEY ("journeyStepId") REFERENCES public."JourneyStep"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JourneyStepFlow JourneyStepFlow_journeyFlowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyStepFlow"
    ADD CONSTRAINT "JourneyStepFlow_journeyFlowId_fkey" FOREIGN KEY ("journeyFlowId") REFERENCES public."JourneyFlow"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: JourneyStep JourneyStep_emotionalStateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."JourneyStep"
    ADD CONSTRAINT "JourneyStep_emotionalStateId_fkey" FOREIGN KEY ("emotionalStateId") REFERENCES public."EmotionalState"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSentiment MovieSentiment_mainSentimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSentiment"
    ADD CONSTRAINT "MovieSentiment_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES public."MainSentiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSentiment MovieSentiment_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSentiment"
    ADD CONSTRAINT "MovieSentiment_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSentiment MovieSentiment_subSentimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSentiment"
    ADD CONSTRAINT "MovieSentiment_subSentimentId_fkey" FOREIGN KEY ("subSentimentId") REFERENCES public."SubSentiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSuggestionFlow MovieSuggestionFlow_journeyOptionFlowId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestionFlow"
    ADD CONSTRAINT "MovieSuggestionFlow_journeyOptionFlowId_fkey" FOREIGN KEY ("journeyOptionFlowId") REFERENCES public."JourneyOptionFlow"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSuggestionFlow MovieSuggestionFlow_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestionFlow"
    ADD CONSTRAINT "MovieSuggestionFlow_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSuggestion MovieSuggestion_emotionalStateId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestion"
    ADD CONSTRAINT "MovieSuggestion_emotionalStateId_fkey" FOREIGN KEY ("emotionalStateId") REFERENCES public."EmotionalState"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSuggestion MovieSuggestion_journeyOptionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestion"
    ADD CONSTRAINT "MovieSuggestion_journeyOptionId_fkey" FOREIGN KEY ("journeyOptionId") REFERENCES public."JourneyOption"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: MovieSuggestion MovieSuggestion_movieId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."MovieSuggestion"
    ADD CONSTRAINT "MovieSuggestion_movieId_fkey" FOREIGN KEY ("movieId") REFERENCES public."Movie"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: SubSentiment SubSentiment_mainSentimentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SubSentiment"
    ADD CONSTRAINT "SubSentiment_mainSentimentId_fkey" FOREIGN KEY ("mainSentimentId") REFERENCES public."MainSentiment"(id) ON UPDATE CASCADE ON DELETE RESTRICT;


--
-- Name: objects objects_bucketId_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.objects
    ADD CONSTRAINT "objects_bucketId_fkey" FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads s3_multipart_uploads_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads
    ADD CONSTRAINT s3_multipart_uploads_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_bucket_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_bucket_id_fkey FOREIGN KEY (bucket_id) REFERENCES storage.buckets(id);


--
-- Name: s3_multipart_uploads_parts s3_multipart_uploads_parts_upload_id_fkey; Type: FK CONSTRAINT; Schema: storage; Owner: -
--

ALTER TABLE ONLY storage.s3_multipart_uploads_parts
    ADD CONSTRAINT s3_multipart_uploads_parts_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES storage.s3_multipart_uploads(id) ON DELETE CASCADE;


--
-- Name: audit_log_entries; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.audit_log_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: flow_state; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.flow_state ENABLE ROW LEVEL SECURITY;

--
-- Name: identities; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.identities ENABLE ROW LEVEL SECURITY;

--
-- Name: instances; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.instances ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_amr_claims; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_amr_claims ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_challenges; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_challenges ENABLE ROW LEVEL SECURITY;

--
-- Name: mfa_factors; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.mfa_factors ENABLE ROW LEVEL SECURITY;

--
-- Name: one_time_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.one_time_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: refresh_tokens; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.refresh_tokens ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: saml_relay_states; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.saml_relay_states ENABLE ROW LEVEL SECURITY;

--
-- Name: schema_migrations; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.schema_migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: sessions; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_domains; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_domains ENABLE ROW LEVEL SECURITY;

--
-- Name: sso_providers; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.sso_providers ENABLE ROW LEVEL SECURITY;

--
-- Name: users; Type: ROW SECURITY; Schema: auth; Owner: -
--

ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

--
-- Name: messages; Type: ROW SECURITY; Schema: realtime; Owner: -
--

ALTER TABLE realtime.messages ENABLE ROW LEVEL SECURITY;

--
-- Name: buckets; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;

--
-- Name: migrations; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.migrations ENABLE ROW LEVEL SECURITY;

--
-- Name: objects; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads ENABLE ROW LEVEL SECURITY;

--
-- Name: s3_multipart_uploads_parts; Type: ROW SECURITY; Schema: storage; Owner: -
--

ALTER TABLE storage.s3_multipart_uploads_parts ENABLE ROW LEVEL SECURITY;

--
-- Name: supabase_realtime; Type: PUBLICATION; Schema: -; Owner: -
--

CREATE PUBLICATION supabase_realtime WITH (publish = 'insert, update, delete, truncate');


--
-- Name: issue_graphql_placeholder; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_graphql_placeholder ON sql_drop
         WHEN TAG IN ('DROP EXTENSION')
   EXECUTE FUNCTION extensions.set_graphql_placeholder();


--
-- Name: issue_pg_cron_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_cron_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_cron_access();


--
-- Name: issue_pg_graphql_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_graphql_access ON ddl_command_end
         WHEN TAG IN ('CREATE FUNCTION')
   EXECUTE FUNCTION extensions.grant_pg_graphql_access();


--
-- Name: issue_pg_net_access; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER issue_pg_net_access ON ddl_command_end
         WHEN TAG IN ('CREATE EXTENSION')
   EXECUTE FUNCTION extensions.grant_pg_net_access();


--
-- Name: pgrst_ddl_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_ddl_watch ON ddl_command_end
   EXECUTE FUNCTION extensions.pgrst_ddl_watch();


--
-- Name: pgrst_drop_watch; Type: EVENT TRIGGER; Schema: -; Owner: -
--

CREATE EVENT TRIGGER pgrst_drop_watch ON sql_drop
   EXECUTE FUNCTION extensions.pgrst_drop_watch();


--
-- PostgreSQL database dump complete
--

--
-- PostgreSQL database dump
--

-- Dumped from database version 15.8
-- Dumped by pg_dump version 16.8

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.audit_log_entries (instance_id, id, payload, created_at, ip_address) FROM stdin;
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.flow_state (id, user_id, auth_code, code_challenge_method, code_challenge, provider_type, provider_access_token, provider_refresh_token, created_at, updated_at, authentication_method, auth_code_issued_at) FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, invited_at, confirmation_token, confirmation_sent_at, recovery_token, recovery_sent_at, email_change_token_new, email_change, email_change_sent_at, last_sign_in_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at, phone, phone_confirmed_at, phone_change, phone_change_token, phone_change_sent_at, email_change_token_current, email_change_confirm_status, banned_until, reauthentication_token, reauthentication_sent_at, is_sso_user, deleted_at, is_anonymous) FROM stdin;
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.identities (provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at, id) FROM stdin;
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.instances (id, uuid, raw_base_config, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sessions (id, user_id, created_at, updated_at, factor_id, aal, not_after, refreshed_at, user_agent, ip, tag) FROM stdin;
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_amr_claims (session_id, created_at, updated_at, authentication_method, id) FROM stdin;
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_factors (id, user_id, friendly_name, factor_type, status, created_at, updated_at, secret, phone, last_challenged_at, web_authn_credential, web_authn_aaguid) FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.mfa_challenges (id, factor_id, created_at, verified_at, ip_address, otp_code, web_authn_session_data) FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.one_time_tokens (id, user_id, token_type, token_hash, relates_to, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.refresh_tokens (instance_id, id, token, user_id, revoked, created_at, updated_at, parent, session_id) FROM stdin;
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_providers (id, resource_id, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_providers (id, sso_provider_id, entity_id, metadata_xml, metadata_url, attribute_mapping, created_at, updated_at, name_id_format) FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.saml_relay_states (id, sso_provider_id, request_id, for_email, redirect_to, created_at, updated_at, flow_state_id) FROM stdin;
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.schema_migrations (version) FROM stdin;
20171026211738
20171026211808
20171026211834
20180103212743
20180108183307
20180119214651
20180125194653
00
20210710035447
20210722035447
20210730183235
20210909172000
20210927181326
20211122151130
20211124214934
20211202183645
20220114185221
20220114185340
20220224000811
20220323170000
20220429102000
20220531120530
20220614074223
20220811173540
20221003041349
20221003041400
20221011041400
20221020193600
20221021073300
20221021082433
20221027105023
20221114143122
20221114143410
20221125140132
20221208132122
20221215195500
20221215195800
20221215195900
20230116124310
20230116124412
20230131181311
20230322519590
20230402418590
20230411005111
20230508135423
20230523124323
20230818113222
20230914180801
20231027141322
20231114161723
20231117164230
20240115144230
20240214120130
20240306115329
20240314092811
20240427152123
20240612123726
20240729123726
20240802193726
20240806073726
20241009103726
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: -
--

COPY auth.sso_domains (id, sso_provider_id, domain, created_at, updated_at) FROM stdin;
\.


--
-- Data for Name: MainSentiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MainSentiment" (id, name, description, keywords, "createdAt", "updatedAt") FROM stdin;
13	Feliz / Alegre	Sentimento de alegria e felicidade	{feliz,alegre,contente}	2025-05-02 22:50:59.442	2025-05-02 22:50:59.442
14	Triste / Melancólico(a)	Sentimento de Tristeza	{triste}	2025-05-02 23:13:06.898	2025-05-02 23:12:20.408
15	Calmo(a) / Relaxado(a)	\N	{}	2025-05-03 22:04:26.132	2025-05-03 22:04:15.127
16	Ansioso(a) / Nervoso(a)	\N	{}	2025-05-03 22:04:46.415	2025-05-03 22:04:37.857
17	Animado(a) / Entusiasmado(a)	\N	{}	2025-05-03 22:05:09.291	2025-05-03 22:05:04.745
18	Cansado(a) / Desmotivado(a)	\N	{}	2025-05-03 22:05:28.012	2025-05-03 22:06:10.498
19	Neutro / Indiferente	\N	{}	2025-05-03 22:06:26.277	2025-05-03 22:06:12.712
\.


--
-- Data for Name: EmotionalState; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."EmotionalState" (id, name, description, "isActive", "createdAt", "updatedAt", "mainSentimentId") FROM stdin;
\.


--
-- Data for Name: JourneyFlow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JourneyFlow" (id, "mainSentimentId", "createdAt", "updatedAt") FROM stdin;
2	13	2025-05-02 22:50:59.442	2025-05-02 22:50:59.442
3	14	2025-05-05 01:03:36.433	2025-05-05 01:02:59.661
\.


--
-- Data for Name: JourneyStep; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JourneyStep" (id, "emotionalStateId", "order", question, "createdAt", "updatedAt", "stepId") FROM stdin;
\.


--
-- Data for Name: JourneyOption; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JourneyOption" (id, "journeyStepId", text, "nextStepId", "isFinal", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: JourneyStepFlow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JourneyStepFlow" (id, "journeyFlowId", "stepId", "order", question, "createdAt", "updatedAt") FROM stdin;
2	2	1	1	Ótimo! Para manter essa vibe positiva, você gostaria de assistir a um filme que te faça se sentir ainda mais...	2025-05-02 22:50:59.442	2025-05-03 14:25:30.654
7	2	2A	2	Excelente! Você prefere um humor mais...	2025-05-03 00:09:32.951	2025-05-03 14:38:43.366
4	2	2B	2	Adorável! Você está mais no clima de...	2025-05-02 22:50:59.442	2025-05-03 14:38:43.366
5	2	2C	2	Que energia boa! Você gostaria de algo mais...	2025-05-02 23:38:03.63	2025-05-03 14:38:43.366
6	2	2D	2	Nostalgia! Você tem preferência por filmes de...	2025-05-03 00:04:13.316	2025-05-03 14:38:43.366
8	3	1	1	Entendo. Nesses momentos, você geralmente prefere um filme que...	2025-05-05 01:05:52.765	2025-05-05 01:04:01.516
9	3	2A	2	Certo. Dentro dessa intensidade emocional, você se inclina mais para...	2025-05-05 23:33:31.195	2025-05-05 23:31:45.626
10	3	2B	2	Entendi. Para esse escape, você estaria mais a fim de...	2025-05-05 23:42:35.592	2025-05-05 23:41:18.94
11	3	2C	2	Compreendo. Para esse conforto, você se sentiria melhor assistindo a...	2025-05-05 23:46:12.976	2025-05-05 23:45:15.613
12	3	2D	2	Interessante. Nesse caso, você estaria mais aberto a...	2025-05-05 23:47:42.889	2025-05-05 23:47:07.629
\.


--
-- Data for Name: JourneyOptionFlow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."JourneyOptionFlow" (id, "journeyStepFlowId", "optionId", text, "nextStepId", "isEndState", "createdAt", "updatedAt") FROM stdin;
7	4	2B2	...um filme sobre amizade e laços familiares com momentos emocionantes?	\N	t	2025-05-02 23:42:52.121	2025-05-02 23:41:17.879
8	4	2B3	...uma história inspiradora sobre superação e gentileza?	\N	t	2025-05-02 23:43:47.282	2025-05-02 23:43:08.399
9	4	2B4	...uma fantasia leve com personagens carismáticos e um toque mágico?	\N	t	2025-05-02 23:44:37.62	2025-05-02 23:44:08.254
6	4	2B1	...uma comédia romântica com um final doce e feliz?	\N	t	2025-05-02 22:50:59.442	2025-05-02 23:55:24.027
10	5	2C1	...uma aventura emocionante com muita ação?	\N	t	2025-05-02 23:58:47.652	2025-05-02 23:58:11.58
11	5	2C2	...um filme de esportes com uma história de superação e vitória?	\N	t	2025-05-02 23:59:29.053	2025-05-02 23:58:59.923
12	5	2C3	...uma comédia musical vibrante e contagiante?	\N	t	2025-05-03 00:00:02.673	2025-05-02 23:59:44.743
13	5	2C4	...um filme de fantasia com um ritmo acelerado e mundos fantásticos?	\N	t	2025-05-03 00:00:31.544	2025-05-03 00:00:14.142
14	6	2D1	...uma certa época da sua vida (infância, adolescência)?	\N	t	2025-05-03 00:05:44.87	2025-05-03 00:04:56.314
15	6	2D2	...filmes clássicos que marcaram uma geração?	\N	t	2025-05-03 00:06:23.288	2025-05-03 00:05:47.31
16	6	2D3	...animações antigas que te trazem boas recordações?	\N	t	2025-05-03 00:06:58.533	2025-05-03 00:06:28.11
17	6	2D4	 ...filmes com temas ou trilhas sonoras que te remetem a momentos felizes?	\N	t	2025-05-03 00:07:26.238	2025-05-03 00:07:06.513
43	12	2D1	...um drama mais contemplativo e com foco nos personagens?	2D	t	2025-05-06 00:25:18.487	2025-05-06 00:24:54.605
44	12	2D2	...um filme com questões filosóficas ou existenciais?	2D	t	2025-05-06 00:26:07.689	2025-05-06 00:25:45.948
45	12	2D3	...um documentário inspirador sobre a condição humana?	2D	t	2025-05-06 00:26:49.253	2025-05-06 00:26:29.365
46	12	2D4	...um filme estrangeiro com uma perspectiva cultural diferente?	2D	t	2025-05-06 00:29:12.114	2025-05-06 00:28:46.029
20	7	2A1	...escancarado e físico (pastelão, situações absurdas)?	\N	t	2025-05-03 14:46:47.444	2025-05-03 14:45:55.489
21	7	2A2	...inteligente e com diálogos afiados?	\N	t	2025-05-03 14:47:45.391	2025-05-03 14:47:23.74
22	7	2A3	...satírico e que faz pensar enquanto diverte?	\N	t	2025-05-03 14:48:32.208	2025-05-03 14:48:10.226
23	7	2A4	...comédia romântica leve e divertida?	\N	t	2025-05-03 14:49:19.639	2025-05-03 14:48:54.172
24	2	1A	...com muitas gargalhadas e um humor contagiante?	2A	f	2025-05-03 14:52:04.14	2025-05-03 14:50:56.419
25	2	1B	...com um calor no coração e uma sensação adorável?	2B	f	2025-05-03 14:52:58.677	2025-05-03 14:52:09.936
26	2	1C	...empolgado(a) e cheio(a) de energia?	2C	f	2025-05-03 14:53:46.39	2025-05-03 14:52:59.551
27	2	1D	 ...com aquela nostalgia gostosa de boas lembranças?	2D	f	2025-05-03 14:54:35.727	2025-05-03 14:53:48.803
28	8	1A	...me permita sentir essas emoções (uma catarse)?	2A	f	2025-05-05 01:15:16.353	2025-05-06 00:00:10.506
29	8	1B	...me ofereça um escape leve e divertido?	2B	f	2025-05-05 01:18:35.874	2025-05-06 00:00:10.506
30	8	1C	...me traga conforto e um senso de segurança?	2C	f	2025-05-05 01:19:59.978	2025-05-06 00:00:10.506
31	8	1D	...me faça refletir sobre a vida e talvez encontrar algum significado?	2D	f	2025-05-05 01:21:09.373	2025-05-06 00:00:10.506
32	9	2A1	...um drama profundo e tocante?	\N	t	2025-05-06 00:03:18.794	2025-05-06 00:02:28.752
33	9	2A2	...uma história de superação em meio à adversidade?	2A	t	2025-05-06 00:11:37.344	2025-05-06 00:10:31.314
34	9	2A3	...um romance melancólico e contemplativo?	2A	t	2025-05-06 00:13:37.151	2025-05-06 00:13:03.906
35	10	2B1	...uma comédia leve e talvez um pouco bobinha para distrair a mente?	2B	t	2025-05-06 00:17:02.546	2025-05-06 00:16:10.675
36	10	2B2	...uma animação divertida e colorida?	2B	t	2025-05-06 00:18:02.443	2025-05-06 00:17:25.379
37	10	2B3	...uma aventura leve e sem grandes dramas?	2B	t	2025-05-06 00:19:12.19	2025-05-06 00:18:38.916
38	10	2B4	...uma comédia romântica com um final feliz garantido?	2B	t	2025-05-06 00:19:54.845	2025-05-06 00:19:27.819
39	11	2C1	 ...um filme familiar que você já conhece e gosta muito?	2C	t	2025-05-06 00:21:21.513	2025-05-06 00:20:52.733
40	11	2C2	 ...uma fantasia com um mundo acolhedor e personagens reconfortantes?	2C	t	2025-05-06 00:22:12.545	2025-05-06 00:21:43.464
41	11	2C3	 ...uma ficção científica com um final otimista e um senso de ordem?	2C	t	2025-05-06 00:22:54.698	2025-05-06 00:22:33.472
42	11	2C4	 ...um filme sobre a natureza ou viagens com paisagens relaxantes?	2C	t	2025-05-06 00:23:50.04	2025-05-06 00:23:25.236
\.


--
-- Data for Name: Movie; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."Movie" (id, title, year, director, genres, "streamingPlatforms", "createdAt", "updatedAt", description, thumbnail, original_title) FROM stdin;
c588d582-e8ea-4f4f-a484-419398fc9fdc	Simplesmente Amor	2003	\N	{}	{}	2025-05-03 15:31:45.897	2025-05-03 21:46:26.044	Nove histórias que se entrelaçam mostrando as complexidades da emoção que nos conecta a todos: o amor. Entre os personagens, o belo recém-eleito primeiro-ministro britânico, David, que se apaixona por uma jovem funcionária. Uma desenhista gráfica, Sarah, cuja devoção a seu irmão, doente mental, complica sua vida amorosa. Harry, um homem casado tentado por sua atraente nova secretária. São vidas e amores que se misturam na romântica Londres, e atingem o seu clímax na noite de Natal.	https://image.tmdb.org/t/p/w500/zoZvqAlIt6U8XWyo2ROU2SpTVAc.jpg	Love Actually
ca424915-ba7c-4aa0-a594-6e57bc7de210	Como Perder um Cara em Dez Dias	2003	\N	{}	{}	2025-05-03 15:24:40.229	2025-05-03 21:46:26.551	Ben é um publicitário que aposta com o chefe que faz qualquer mulher se apaixonar por ele em dez dias. Se conseguir, será o responsável por uma cobiçada campanha de diamantes. Andie é uma jornalista que, por causa de uma matéria, está decidida a infernizar a vida de qualquer homem que se aproximar. Os dois se conhecem em um bar e escolhem um ao outro como alvo de seus planos totalmente opostos.	https://image.tmdb.org/t/p/w500/qxwgxjFUtZ3qf7vib9na6tdPfwT.jpg	How to Lose a Guy in 10 Days
61fa1cd0-ec52-4783-819c-9dde63dcd7af	O Diário de Bridget Jones	2001	Sharon Maguire	{Comédia,Romance}	{Netflix,"HBO Max"}	2025-05-02 22:50:59.297	2025-05-03 21:46:26.727	Bridget Jones, uma mulher de trinta anos, decide, entre as resoluções de Ano Novo escrever um diário. Bridget revela, a cada capítulo, as suas qualidades e os seus defeitos, além de expor com muito humor situações que fazem parte do dia-a-dia de várias mulheres nesta mesma faixa de idade: problemas com o trabalho, a busca do homem ideal etc. Cada capítulo do livro trata de um determinado dia na vida desta anti-heroína, que sempre inicia o seu relato contabilizando o peso e as calorias, cigarros e unidades alcoólicas que consumiu no dia anterior.	https://image.tmdb.org/t/p/w500/acjZNtv1H6wVadXnleSmYFjZk5k.jpg	Bridget Jones's Diary
51e39283-45a2-4193-b5d7-b9013492c2a0	Um Lugar Chamado Notting Hill	1999	\N	{}	{}	2025-05-03 15:18:24.574	2025-05-03 21:46:26.895	Will, pacato dono de livraria especializada em guias de viagem, recebe a inesperada visita de uma cliente muito especial: a estrela de cinema americana Anna Scott. Dois ou três encontros fortuitos mais tarde, Will e Anna iniciam um relacionamento tenro, engraçado e cheio de idas e vindas.	https://image.tmdb.org/t/p/w500/9yFgNvFK870icK6SvTdeVyEjXN4.jpg	Notting Hill
9c7727da-f9c9-4036-bc09-cdcbd8523a18	Superbad	2007	Greg Mottola	{Comédia,Adolescente}	{Netflix,"Amazon Prime"}	2025-05-02 22:50:59.297	2025-05-03 21:46:27.064	Os estudantes adolescentes Seth e Evan têm grandes esperanças para uma festa de formatura. Os adolescentes co-dependentes pretendem beber e conquistar garotas para que eles possam se tornar parte da multidão popular da escola, mas a ansiedade de separação e dois policiais entediados complicam a auto-missão proclamada dos amigos.	https://image.tmdb.org/t/p/w500/vKFyD2wRl3qCKpbVWjIB3QAWo0K.jpg	Superbad
7c5ab820-e353-4d3f-84ed-2c8541c912e2	De Repente 30	2004	\N	{}	{}	2025-05-03 15:24:40.483	2025-05-03 21:46:27.247	Com a ajuda de um pó mágico, Jenna Rick, de 13 anos, se torna uma deslumbrante mulher de 30 anos da noite para o dia, com tudo que sempre quis, menos seu melhor amigo Matt. Agora, essa mulher madura precisa criar uma mágica própria para ajudar a garotinha dentro dela a recuperar o verdadeiro amor que deixou para trás.	https://image.tmdb.org/t/p/w500/3ZewXNdHKpRE0LrJhj07bWkwQm4.jpg	13 Going on 30
613266f6-9773-458f-9cfc-32eb1a8ec10a	Resgate Implacável	2025	\N	{}	{}	2025-05-03 19:09:09.113	2025-05-03 21:46:27.412	Ele quer viver uma vida simples e ser um bom pai para sua filha. Mas quando a filha adolescente de seu chefe, Jenny, desaparece, ele é chamado para reempregar as habilidades que o tornaram uma figura lendária nas operações secretas.	https://image.tmdb.org/t/p/w500/iT6yYCAuMQwm1PV4nByrsrsIOhG.jpg	A Working Man
0414fa6c-7eef-40a2-b20b-28ac7e035e6a	Todo Mundo em Pânico	2003	Keenen Ivory Wayans	{Comédia,Paródia}	{Netflix,"Amazon Prime"}	2025-05-02 22:50:59.297	2025-05-03 21:46:27.583	Tudo começa quando a apresentadora de telejornal Cindy Campbell descobre uma série de terríveis acontecimentos que ameaçam o planeta, envolvendo invasores extraterrestres, vídeos assassinos, assustadores círculos de plantações, profecias sobre o Escolhido, crianças com olhares sinistros, rappers brancos ambiciosos e até mesmo uma discussão com Michael Jackson.	https://image.tmdb.org/t/p/w500/y14q7jWS0vH8ZuWPS1v8t8qCmBO.jpg	Scary Movie 3
af2e4c3d-0d16-4a03-abb0-f518f9d43d23	De Volta para o Futuro	1985	\N	{Aventura,Comédia,"Ficção científica"}	{}	2025-05-05 00:12:06.641	2025-05-05 00:12:06.641	Marty McFly, um típico adolescente americano dos anos 80, acidentalmente é enviado de volta ao ano de 1955 em um carro modificado para ser uma máquino do tempo, inventada por um cientista louco. Durante sua fantástica e maluca viagem no tempo, McFly tem que fazer com que seus futuros pais se encontrem e se apaixonem, para que assim ele possa ir de volta para o futuro.	https://image.tmdb.org/t/p/w500/JoAiVdWmz8XFA9rl43EtjT8ipn.jpg	Back to the Future
cbd70c93-7733-43a6-a69b-5fb269b907f3	Diário de uma Paixão	2004	\N	{}	{}	2025-05-03 15:31:46.343	2025-05-03 21:46:25.863	Na década de 40, o operário Noah Calhoun e a rica Allie estão desesperadamente apaixonados, mas os pais da jovem não aprovam o namoro. Quando Noah vai para a Segunda Guerra Mundial, parece ser o fim do romance. Enquanto isso, Allie se envolve com outro homem. Mas quando Noah retorna para a pequena cidade anos mais tarde, próximo ao casamento de Allie, logo se torna claro que a paixão ainda não acabou.	https://image.tmdb.org/t/p/w500/A07izLVyZCrmq0HTvFg6qdqiZE5.jpg	The Notebook
47171a28-9b5d-455a-b248-0a2235100d59	10 Coisas Que Eu Odeio em Você	1999	\N	{}	{Netflix,"HBO Max","Amazon Prime"}	2025-05-03 15:24:39.977	2025-05-03 21:46:26.211	Em seu primeiro dia na nova escola, Cameron se apaixona por Bianca. Mas ela só poderá sair com rapazes até que Kat, sua irmã mais velha, arrume um namorado. O problema é que ela é insuportável. Cameron, então, negocia com o único garoto que talvez consiga sair com Kat – um misterioso bad-boy com uma péssima reputação.	https://image.tmdb.org/t/p/w500/sSr6OheCylo2rlt4Ko9OWwcmu3n.jpg	10 Things I Hate About You
e8d98433-e216-4221-aa75-cb95b92756cf	Curtindo a Vida Adoidado	1986	\N	{Comédia}	{}	2025-05-05 00:12:07.94	2025-05-05 00:12:07.94	No último semestre do curso do colégio, o estudante Ferris Bueller (Matthew Broderick) sente um incontrolável desejo de matar aula e planeja um grande passeio na cidade com a namorada Sloane Peterson (Mia Sara) e com seu melhor amigo Cameron Frye (Alan Ruck) à bordo de uma Ferrari. Só que, para poder realizar seu desejo, ele precisa escapar do diretor do colégio Ed Rooney (Jeffrey Jones) e de sua própria irmã Jeanie Bueller (Jennifer Grey).	https://image.tmdb.org/t/p/w500/kUqhcfr5IoaE76NOIQl53gn3y3Q.jpg	Ferris Bueller's Day Off
81b27d06-3ae0-4bbc-8f73-1e29762245a0	As Patricinhas de Beverly Hills	1995	\N	{Comédia,Romance}	{}	2025-05-05 00:12:08.542	2025-05-05 00:12:08.542	Em Beverly Hills, a adolescente Cher (Alicia Silverstone), filha de uma advogado (Dan Hedaya) muito rico, passa seu tempo em conversas fúteis e fazendo compras com amigas totalmente alienadas como ela. Mas a chegada do enteado de seu pai, Josh (Paul Rudd), muda tudo, primeiro por ele criticá-la de não tomar conhecimento com o "mundo real" e em segundo lugar por ela descobrir que está apaixonada por ele.	https://image.tmdb.org/t/p/w500/sfgpINIXoGEUkA3n6k7of89bP9x.jpg	Clueless
360aaed2-c8a9-4d1f-8bea-6e3fd7376eaa	Clube dos Cinco	1985	\N	{Comédia,Drama}	{}	2025-05-05 00:12:09.688	2025-05-05 00:22:42.22	Em virtude de terem cometido pequenos delitos, cinco adolescentes são confinados no colégio em um sábado com a tarefa de escrever uma redação de mil palavras sobre o que pensam de si mesmos. Apesar de serem pessoas completamente diferentes, enquanto o dia transcorre, eles passam a aceitar uns aos outros, fazem várias confissões e se tornam amigos.	https://image.tmdb.org/t/p/w500/atLx4aW8dgIuy3Bxo5WWRTyWdEh.jpg	The Breakfast Club
16cb93dc-f89e-4ef5-85d8-f62f37d1241e	Dirty Dancing: Ritmo Quente	1987	\N	{Drama,Música,Romance}	{}	2025-05-05 00:12:10.397	2025-05-05 00:22:55.53	Na esperança de curtir sua juventude, uma jovem fica decepcionada ao descobrir que seus pais passarão o verão de 1963 com ela em um resort na sonolenta região de Catskills. Mas sua sorte muda quando ela conhece o instrutor de dança do resort, Johnny, um rapaz com um passado bem diferente do dela. Quando ele a coloca como sua nova parceira, os dois acabam se apaixonando. Apesar do pai proibi-la de ver Johnny, ela não dá a mínima.	https://image.tmdb.org/t/p/w500/mUVIRUpqKQa8uKDgyYrQHs6rlbz.jpg	Dirty Dancing
b92fd48d-9978-4139-9eba-1b7cbfabc1a2	Menina de Ouro	2004	\N	{Drama}	{}	2025-05-05 00:57:29.319	2025-05-05 00:57:29.319	Frankie Dunn é um veterano treinador de boxe de Los Angeles que mantém quase todos a uma certa distância, exceto o velho amigo e sócio Eddie Dupris. Quando Maggie Fitzgerald, uma operária transferida de Missouri, chega ao ginásio de Frankie em busca de sua experiência, ele fica relutante em treinar a jovem. Mas quando cede ao seu jeito reservado, os dois formam um vínculo muito próximo que inevitavelmente mudará suas vidas.	https://image.tmdb.org/t/p/w500/zb3AfXM34FDD0AWLFP8XBnHAuHJ.jpg	Million Dollar Baby
b42f9007-9587-4f64-994e-58ec34bbfc79	Um Sonho Possível	2009	\N	{Drama}	{}	2025-05-05 00:57:29.853	2025-05-05 00:57:29.853	Michael Oher era um jovem negro, filho de uma mãe viciada e não tinha onde morar. Com boa vocação para os esportes, um dia ele foi avistado pela família de Leigh Anne Tuohy, andando em direção ao estádio da escola para poder dormir longe da chuva. Ao ser convidado para passar uma noite na casa dos milionários, Michael não tinha ideia que aquele dia iria mudar para sempre a sua vida, tornando-se mais tarde um astro do futebol americano.	https://image.tmdb.org/t/p/w500/an63NUD0TUMreFNo4z60Ec8poF9.jpg	The Blind Side
54b9979a-abc2-4942-92e0-72e5db755009	O Homem Que Mudou o Jogo	2011	\N	{Drama}	{}	2025-05-05 00:57:30.927	2025-05-05 00:57:30.927	O gerente geral da Oakland A, Billy Beane, desafia o sistema e a sabedoria convencional quando é forçado a recompor sua pequena equipe com um orçamento baixo. Apesar da oposição da velha guarda, a mídia, fãs e o próprio gerente de campo, Beane – com a ajuda de um economista jovem, formado em Yale – cria uma lista de desajustados... e acaba mudando para sempre o modo como o baseball é jogado.	https://image.tmdb.org/t/p/w500/kNloN3TqTBDd1Fcl980LzpWDhzY.jpg	Moneyball
f327af82-a0d7-4ad9-ac7e-954ef015cb89	Soul Surfer: Coragem de Viver	2011	\N	{Família,Drama}	{"Claro video","Univer Video"}	2025-05-05 02:11:11.826	2025-05-05 02:11:11.826	A adolescente Bethany tem um talento natural para o surf e transforma sua vida após perder seu braço devido a um ataque de tubarão. Encorajada pelo amor de seus pais e recusando desistir, Bethany volta ao mundo das competições quando se recupera do acidente, mas dúvidas sobre seu futuro a perturbam.	https://image.tmdb.org/t/p/w500/q1Lj4O99guQTPNsPGiUgsxfFvXK.jpg	Soul Surfer
378fec7d-87a7-4033-81d7-88e93b04383b	Soul	2020	Pete Docter	{Animação,Família,Comédia,Fantasia}	{"Disney Plus"}	2025-05-05 02:45:58	2025-05-05 02:45:58	Joe Gardner é um professor de música de ensino fundamental desanimado por não conseguir alcançar seu sonho de tocar no lendário clube de jazz The Blue Note, em Nova York. Quando um acidente o transporta para fora do seu corpo, fazendo com que ele exista em outra realidade na forma de sua alma, ele se vê forçado a embarcar em uma aventura ao lado da alma de uma criança que ainda está aprendendo sobre si, para aprender o que é necessário para retomar sua vida.	https://image.tmdb.org/t/p/w500/bzDAfXoqNAvWUe7uss2NE3BmRqy.jpg	Soul
01d05df9-c3d1-40df-95a2-05cba37c4ebb	Karatê Kid: A Hora da Verdade	1984	John G. Avildsen	{Ação,Aventura,Drama,Família}	{Max,"Max Amazon Channel"}	2025-05-05 02:55:26.849	2025-05-05 02:55:26.849	O adolescente Daniel LaRusso se envolve com a ex-namorada de um mau caráter na escola e passa a ser atormentado por sua gangue. Para sua sorte, ele contará com os ensinamentos de um mestre de karatê, o senhor Miyagi, que o prepara para autodefesa e também para um importante campeonato.	https://image.tmdb.org/t/p/w500/b2VqAf0GSkPJ6AwzVC64VoXLxzs.jpg	The Karate Kid
189b433c-e889-4bf9-9d24-db7dcdf23a67	Karatê Kid	2010	Harald Zwart	{Ação,Aventura,Drama,Família}	{Max,"Claro tv+","Netflix Standard with Ads","Max Amazon Channel"}	2025-05-05 02:58:07.702	2025-05-05 02:58:07.702	Dre Parker se mudou com a mãe para Pequim, devido ao trabalho dela. Logo ao chegar, ele se interessa por Meiying, uma garota que conhece praticando violino em uma praça. A aproximação deles provoca a irritação de Cheng, que lhe dá uma surra usando a técnica do kung fu. A partir de então a vida de Dre se torna um inferno, já que passa a ser perseguido na escola por Cheng e seus colegas. Um dia, ao escapar deles, Dre é auxiliado pelo Sr. Han, o zelador de seu prédio, que é também um mestre de kung fu.	https://image.tmdb.org/t/p/w500/AbBlpGNj69gWQNKO0qg6QGDnbaW.jpg	The Karate Kid
\.


--
-- Data for Name: SubSentiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."SubSentiment" (id, name, description, keywords, "mainSentimentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MovieSentiment; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MovieSentiment" ("movieId", "mainSentimentId", "subSentimentId", "createdAt", "updatedAt") FROM stdin;
\.


--
-- Data for Name: MovieSuggestion; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MovieSuggestion" (id, "movieId", "emotionalStateId", reason, relevance, "createdAt", "updatedAt", "journeyOptionId") FROM stdin;
\.


--
-- Data for Name: MovieSuggestionFlow; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public."MovieSuggestionFlow" (id, "journeyOptionFlowId", "movieId", reason, relevance, "createdAt", "updatedAt") FROM stdin;
9	23	51e39283-45a2-4193-b5d7-b9013492c2a0	Uma história encantadora sobre amor entre mundos diferentes	1	2025-05-03 15:26:42.807	2025-05-03 15:26:42.807
10	23	47171a28-9b5d-455a-b248-0a2235100d59	Uma adaptação moderna de Shakespeare com muito humor e romance	1	2025-05-03 15:26:43.094	2025-05-03 15:26:43.094
11	23	ca424915-ba7c-4aa0-a594-6e57bc7de210	Uma comédia romântica sobre jogos de sedução e amor verdadeiro	1	2025-05-03 15:26:43.344	2025-05-03 15:26:43.344
13	23	c588d582-e8ea-4f4f-a484-419398fc9fdc	Um filme romântico perfeito para o Natal	1	2025-05-03 15:31:45.96	2025-05-03 15:31:45.96
14	23	cbd70c93-7733-43a6-a69b-5fb269b907f3	Uma história de amor emocionante	1	2025-05-03 15:31:46.395	2025-05-03 15:31:46.395
16	10	613266f6-9773-458f-9cfc-32eb1a8ec10a	Ação intensa e resgate emocionante	1	2025-05-03 19:09:09.174	2025-05-03 19:09:09.174
29	14	360aaed2-c8a9-4d1f-8bea-6e3fd7376eaa	Filme sugerido baseado em Clube dos Cinco	1	2025-05-05 00:22:45.393	2025-05-05 00:45:56.494
30	14	16cb93dc-f89e-4ef5-85d8-f62f37d1241e	Filme sugerido baseado em Dirty Dancing: Ritmo Quente	1	2025-05-05 00:23:00.754	2025-05-05 00:47:30.252
31	14	af2e4c3d-0d16-4a03-abb0-f518f9d43d23	Filme sugerido baseado em De Volta para o Futuro	1	2025-05-05 00:30:54.277	2025-05-05 00:47:39.512
32	14	e8d98433-e216-4221-aa75-cb95b92756cf	Filme sugerido baseado em Curtindo a Vida Adoidado	1	2025-05-05 00:31:07.658	2025-05-05 00:48:22.95
33	14	81b27d06-3ae0-4bbc-8f73-1e29762245a0	Filme sugerido baseado em As Patricinhas de Beverly Hills	1	2025-05-05 00:31:14.12	2025-05-05 00:48:22.95
34	11	b92fd48d-9978-4139-9eba-1b7cbfabc1a2	Filme sugerido baseado em Menina de Ouro	1	2025-05-05 00:57:29.398	2025-05-05 00:57:29.398
35	11	b42f9007-9587-4f64-994e-58ec34bbfc79	Filme sugerido baseado em Um Sonho Possível	1	2025-05-05 00:57:29.918	2025-05-05 00:57:29.918
37	11	54b9979a-abc2-4942-92e0-72e5db755009	Filme sugerido baseado em O Homem Que Mudou o Jogo	1	2025-05-05 00:57:30.995	2025-05-05 00:57:30.995
38	14	f327af82-a0d7-4ad9-ac7e-954ef015cb89	Destaca a importância dos laços familiares e do apoio mútuo. Explora as complexidades da condição humana e as relações interpessoais. Explora temas relacionados a depression. Explora temas relacionados a surfing. Explora temas relacionados a surfer. Explora temas relacionados a surfboard. Explora temas relacionados a beach. Explora temas relacionados a based on novel or book. Explora temas relacionados a hawaii. Explora temas relacionados a shark attack. Explora temas relacionados a thailand. Explora temas relacionados a comeback. Explora temas relacionados a based on true story. Explora temas relacionados a bikini. Explora temas relacionados a volunteer. Explora temas relacionados a family relationships. Explora temas relacionados a hospital. Explora temas relacionados a doctor. Explora temas relacionados a based on memoir or autobiography. Explora temas relacionados a shark. Explora temas relacionados a prosthetic arm. Explora temas relacionados a swimsuit. Explora temas relacionados a christian film. Explora temas relacionados a christian. Explora temas relacionados a surfing contest. Explora temas relacionados a female surfer. Explora temas relacionados a severed arm. Explora temas relacionados a inspirational. Explora temas relacionados a defiant.	1	2025-05-05 02:11:11.873	2025-05-05 02:11:11.873
40	14	378fec7d-87a7-4033-81d7-88e93b04383b	Usa a criatividade para transmitir mensagens profundas de forma acessível. Destaca a importância dos laços familiares e do apoio mútuo. Mostra como o humor pode ser uma ferramenta poderosa para lidar com desafios.	1	2025-05-05 02:45:58.064	2025-05-05 02:45:58.064
42	14	01d05df9-c3d1-40df-95a2-05cba37c4ebb	Demonstra a importância da coragem e da determinação na superação de obstáculos. Inspira a busca por novos horizontes e a superação de limites. Explora as complexidades da condição humana e as relações interpessoais.	1	2025-05-05 02:55:26.929	2025-05-05 02:55:26.929
43	14	189b433c-e889-4bf9-9d24-db7dcdf23a67	Demonstra a importância da coragem e da determinação na superação de obstáculos. Inspira a busca por novos horizontes e a superação de limites. Explora as complexidades da condição humana e as relações interpessoais.	1	2025-05-05 02:58:07.784	2025-05-05 02:58:07.784
\.


--
-- Data for Name: _prisma_migrations; Type: TABLE DATA; Schema: public; Owner: -
--

COPY public._prisma_migrations (id, checksum, finished_at, migration_name, logs, rolled_back_at, started_at, applied_steps_count) FROM stdin;
670d8ebd-cb58-4e9a-b4a8-22b27d73f2ce	8cc6dd5e49af88ba5a07765c26edd49f891430b27da71460087b2a7392212c5f	2025-05-01 21:45:07.856214+00	20250501213658_journey_step_hierarchical_id	\N	\N	2025-05-01 21:45:07.75271+00	1
d870a1b3-39b0-4aa3-ad2d-40abb0cf362a	8f4e6eafdc7e5c5966981b496daf552614d764094179d2cb08f5e26d043ef9b4	2025-05-01 21:45:06.558219+00	20250429220120_update_sentiment_data	\N	\N	2025-05-01 21:45:06.434245+00	1
51531221-f86e-4dc1-b658-4588e6d2b453	ae4abbfe81738d6bb39068d179118316ba15f1ecaeb0b969c8ed1eb4430e8d40	2025-05-01 21:45:06.647753+00	20250429220821_update_sentiment_data	\N	\N	2025-05-01 21:45:06.580483+00	1
f44a9045-2eaf-4365-b178-fa708f1a081f	97e7961c04eac093941574246ca14e6f4f8021011a9268bf6e26c714805b4337	2025-05-01 21:45:06.747249+00	20250430184541_add_basic_sentiment	\N	\N	2025-05-01 21:45:06.67162+00	1
7a862cba-2a9b-4810-9552-b23e8c136155	a87f835c2d37774c604ec32a9558f64c636627415053bebb42948d7ef13ef323	2025-05-01 21:45:28.38413+00	20250501214528_new_step_id	\N	\N	2025-05-01 21:45:28.320337+00	1
fe8ee682-7314-41e4-9a69-c4d8e68e969b	c0c053694ef207d37c88753795738beb820e2981758edfde6c9be9e5044a243b	2025-05-01 21:45:06.870314+00	20250430185742_add_questions_and_sequences	\N	\N	2025-05-01 21:45:06.7701+00	1
a1de1b65-3617-46c6-9397-6dcbba1fdc3c	197b0ad9f21968b2fec01d8d7dcc18666d354d94fbd0646fb0e90b8fbab59083	2025-05-01 21:45:06.966903+00	20250430185829_add_unique_constraint_to_question_text	\N	\N	2025-05-01 21:45:06.89832+00	1
0ed20f26-fc81-435f-9ba4-5c6b85744798	1901bdf3c3a54554cb9c5d16f9c65a8cff727a4a1e79d343433f75a2cbb61dbd	2025-05-01 21:45:07.07187+00	20250430191317_add_movie_description_and_clues	\N	\N	2025-05-01 21:45:06.989641+00	1
91afdf5c-1593-4525-9c89-b1f706ff28dc	c71f3674570d6c7aa750189ccea2f7f93669ab897e2b3703952732d6beb6a3d2	2025-05-02 21:44:22.193533+00	20250502214421_add_journey_flow	\N	\N	2025-05-02 21:44:22.04185+00	1
b817eade-8cc7-4aaa-94f7-da6924ddf637	3a2777914c28b27a1f6d622f85aaf08b29f5b9097772915cf9ec3134ccbcc395	2025-05-01 21:45:07.15736+00	20250430191348_add_unique_constraint_to_movie_title	\N	\N	2025-05-01 21:45:07.094207+00	1
d5dfef98-b43a-441f-bea7-c10ee12bc62d	9b7a8a5dd49d125923638165799fd20a2b8e0bad103fd008b870eeb18ea6aa26	2025-05-01 21:45:07.253635+00	20250430192322_update_question_sequence_structure	\N	\N	2025-05-01 21:45:07.180716+00	1
b4ab5747-0160-4231-bb64-749328285670	0d3522dbbb0c4c16b3d781edfe5f8ed31c5f2b8076e129d5bf0d0001e21ae1fe	2025-05-01 21:45:07.345956+00	20250430193700_add_question_basic_sentiment_relation	\N	\N	2025-05-01 21:45:07.276512+00	1
dab361ae-a2c4-4d4a-abc9-c534a224bcde	bfad900dcefa6ef5904e381523ff63a8f1d0a73284d9b78e6c5a6e7791b2a87e	2025-05-01 21:45:07.488552+00	20250430211406_add_emotional_states	\N	\N	2025-05-01 21:45:07.372396+00	1
10141525-a3d9-4ea2-92be-d8262f9e87a8	36363cb265e882d8c4f5572cfd47b628d7977379878eb59544124d21fc77fcde	2025-05-01 21:45:07.637593+00	20250501183840_add_journey_structure	\N	\N	2025-05-01 21:45:07.523507+00	1
e7de9354-1a82-4d0a-aef7-6f147b4a1235	4513a3d8c5b777b73551119a323bf002e93e826a8a9e2037b5486f2c30ac4e2d	2025-05-01 21:45:07.725827+00	20250501183940_journey_structure	\N	\N	2025-05-01 21:45:07.661261+00	1
\.


--
-- Data for Name: schema_migrations; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.schema_migrations (version, inserted_at) FROM stdin;
20211116024918	2025-04-29 18:44:30
20211116045059	2025-04-29 18:44:35
20211116050929	2025-04-29 18:44:39
20211116051442	2025-04-29 18:44:42
20211116212300	2025-04-29 18:44:46
20211116213355	2025-04-29 18:44:50
20211116213934	2025-04-29 18:44:53
20211116214523	2025-04-29 18:44:58
20211122062447	2025-04-29 18:45:02
20211124070109	2025-04-29 18:45:05
20211202204204	2025-04-29 18:45:09
20211202204605	2025-04-29 18:45:12
20211210212804	2025-04-29 18:45:23
20211228014915	2025-04-29 18:45:27
20220107221237	2025-04-29 18:45:30
20220228202821	2025-04-29 18:45:34
20220312004840	2025-04-29 18:45:37
20220603231003	2025-04-29 18:45:43
20220603232444	2025-04-29 18:45:46
20220615214548	2025-04-29 18:45:51
20220712093339	2025-04-29 18:45:54
20220908172859	2025-04-29 18:45:57
20220916233421	2025-04-29 18:46:01
20230119133233	2025-04-29 18:46:04
20230128025114	2025-04-29 18:46:09
20230128025212	2025-04-29 18:46:13
20230227211149	2025-04-29 18:46:16
20230228184745	2025-04-29 18:46:20
20230308225145	2025-04-29 18:46:23
20230328144023	2025-04-29 18:46:27
20231018144023	2025-04-29 18:46:31
20231204144023	2025-04-29 18:46:36
20231204144024	2025-04-29 18:46:40
20231204144025	2025-04-29 18:46:43
20240108234812	2025-04-29 18:46:47
20240109165339	2025-04-29 18:46:50
20240227174441	2025-04-29 18:46:57
20240311171622	2025-04-29 18:47:01
20240321100241	2025-04-29 18:47:09
20240401105812	2025-04-29 18:47:18
20240418121054	2025-04-29 18:47:23
20240523004032	2025-04-29 18:47:36
20240618124746	2025-04-29 18:47:39
20240801235015	2025-04-29 18:47:43
20240805133720	2025-04-29 18:47:46
20240827160934	2025-04-29 18:47:50
20240919163303	2025-04-29 18:47:55
20240919163305	2025-04-29 18:47:58
20241019105805	2025-04-29 18:48:01
20241030150047	2025-04-29 18:48:14
20241108114728	2025-04-29 18:48:19
20241121104152	2025-04-29 18:48:23
20241130184212	2025-04-29 18:48:25
20241220035512	2025-04-29 18:48:27
20241220123912	2025-04-29 18:48:29
20241224161212	2025-04-29 18:48:30
20250107150512	2025-04-29 18:48:32
20250110162412	2025-04-29 18:48:34
20250123174212	2025-04-29 18:48:35
20250128220012	2025-04-29 18:48:37
\.


--
-- Data for Name: subscription; Type: TABLE DATA; Schema: realtime; Owner: -
--

COPY realtime.subscription (id, subscription_id, entity, filters, claims, created_at) FROM stdin;
\.


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.buckets (id, name, owner, created_at, updated_at, public, avif_autodetection, file_size_limit, allowed_mime_types, owner_id) FROM stdin;
\.


--
-- Data for Name: migrations; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.migrations (id, name, hash, executed_at) FROM stdin;
0	create-migrations-table	e18db593bcde2aca2a408c4d1100f6abba2195df	2025-04-29 18:44:25.056572
1	initialmigration	6ab16121fbaa08bbd11b712d05f358f9b555d777	2025-04-29 18:44:25.066432
2	storage-schema	5c7968fd083fcea04050c1b7f6253c9771b99011	2025-04-29 18:44:25.075836
3	pathtoken-column	2cb1b0004b817b29d5b0a971af16bafeede4b70d	2025-04-29 18:44:25.097862
4	add-migrations-rls	427c5b63fe1c5937495d9c635c263ee7a5905058	2025-04-29 18:44:25.128165
5	add-size-functions	79e081a1455b63666c1294a440f8ad4b1e6a7f84	2025-04-29 18:44:25.138036
6	change-column-name-in-get-size	f93f62afdf6613ee5e7e815b30d02dc990201044	2025-04-29 18:44:25.147743
7	add-rls-to-buckets	e7e7f86adbc51049f341dfe8d30256c1abca17aa	2025-04-29 18:44:25.157332
8	add-public-to-buckets	fd670db39ed65f9d08b01db09d6202503ca2bab3	2025-04-29 18:44:25.166951
9	fix-search-function	3a0af29f42e35a4d101c259ed955b67e1bee6825	2025-04-29 18:44:25.177271
10	search-files-search-function	68dc14822daad0ffac3746a502234f486182ef6e	2025-04-29 18:44:25.188367
11	add-trigger-to-auto-update-updated_at-column	7425bdb14366d1739fa8a18c83100636d74dcaa2	2025-04-29 18:44:25.198453
12	add-automatic-avif-detection-flag	8e92e1266eb29518b6a4c5313ab8f29dd0d08df9	2025-04-29 18:44:25.215767
13	add-bucket-custom-limits	cce962054138135cd9a8c4bcd531598684b25e7d	2025-04-29 18:44:25.225507
14	use-bytes-for-max-size	941c41b346f9802b411f06f30e972ad4744dad27	2025-04-29 18:44:25.235719
15	add-can-insert-object-function	934146bc38ead475f4ef4b555c524ee5d66799e5	2025-04-29 18:44:25.274071
16	add-version	76debf38d3fd07dcfc747ca49096457d95b1221b	2025-04-29 18:44:25.283795
17	drop-owner-foreign-key	f1cbb288f1b7a4c1eb8c38504b80ae2a0153d101	2025-04-29 18:44:25.293282
18	add_owner_id_column_deprecate_owner	e7a511b379110b08e2f214be852c35414749fe66	2025-04-29 18:44:25.303009
19	alter-default-value-objects-id	02e5e22a78626187e00d173dc45f58fa66a4f043	2025-04-29 18:44:25.314871
20	list-objects-with-delimiter	cd694ae708e51ba82bf012bba00caf4f3b6393b7	2025-04-29 18:44:25.324272
21	s3-multipart-uploads	8c804d4a566c40cd1e4cc5b3725a664a9303657f	2025-04-29 18:44:25.339931
22	s3-multipart-uploads-big-ints	9737dc258d2397953c9953d9b86920b8be0cdb73	2025-04-29 18:44:25.374166
23	optimize-search-function	9d7e604cddc4b56a5422dc68c9313f4a1b6f132c	2025-04-29 18:44:25.403962
24	operation-function	8312e37c2bf9e76bbe841aa5fda889206d2bf8aa	2025-04-29 18:44:25.413819
25	custom-metadata	d974c6057c3db1c1f847afa0e291e6165693b990	2025-04-29 18:44:25.424192
\.


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.objects (id, bucket_id, name, owner, created_at, updated_at, last_accessed_at, metadata, version, owner_id, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads (id, in_progress_size, upload_signature, bucket_id, key, version, owner_id, created_at, user_metadata) FROM stdin;
\.


--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: -
--

COPY storage.s3_multipart_uploads_parts (id, upload_id, size, part_number, bucket_id, key, etag, owner_id, version, created_at) FROM stdin;
\.


--
-- Data for Name: secrets; Type: TABLE DATA; Schema: vault; Owner: -
--

COPY vault.secrets (id, name, description, secret, key_id, nonce, created_at, updated_at) FROM stdin;
\.


--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: -
--

SELECT pg_catalog.setval('auth.refresh_tokens_id_seq', 1, false);


--
-- Name: EmotionalState_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."EmotionalState_id_seq"', 6, true);


--
-- Name: JourneyFlow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."JourneyFlow_id_seq"', 3, true);


--
-- Name: JourneyOptionFlow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."JourneyOptionFlow_id_seq"', 46, true);


--
-- Name: JourneyOption_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."JourneyOption_id_seq"', 42, true);


--
-- Name: JourneyStepFlow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."JourneyStepFlow_id_seq"', 12, true);


--
-- Name: MainSentiment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MainSentiment_id_seq"', 19, true);


--
-- Name: MovieSuggestionFlow_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MovieSuggestionFlow_id_seq"', 43, true);


--
-- Name: MovieSuggestion_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."MovieSuggestion_id_seq"', 9, true);


--
-- Name: SubSentiment_id_seq; Type: SEQUENCE SET; Schema: public; Owner: -
--

SELECT pg_catalog.setval('public."SubSentiment_id_seq"', 12, true);


--
-- Name: subscription_id_seq; Type: SEQUENCE SET; Schema: realtime; Owner: -
--

SELECT pg_catalog.setval('realtime.subscription_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

