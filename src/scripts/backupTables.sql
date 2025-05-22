-- Backup da tabela Movie
SELECT json_agg(t) as movies
FROM (
    SELECT * FROM "Movie"
) t;

-- Backup da tabela Genre
SELECT json_agg(t) as genres
FROM (
    SELECT * FROM "Genre"
) t;

-- Backup da tabela MainSentiment
SELECT json_agg(t) as main_sentiments
FROM (
    SELECT * FROM "MainSentiment"
) t;

-- Backup da tabela SubSentiment
SELECT json_agg(t) as sub_sentiments
FROM (
    SELECT * FROM "SubSentiment"
) t;

-- Backup da tabela MovieSentiment
SELECT json_agg(t) as movie_sentiments
FROM (
    SELECT * FROM "MovieSentiment"
) t;

-- Backup da tabela JourneyFlow
SELECT json_agg(t) as journey_flows
FROM (
    SELECT * FROM "JourneyFlow"
) t;

-- Backup da tabela JourneyStepFlow
SELECT json_agg(t) as journey_step_flows
FROM (
    SELECT * FROM "JourneyStepFlow"
) t;

-- Backup da tabela JourneyOptionFlow
SELECT json_agg(t) as journey_option_flows
FROM (
    SELECT * FROM "JourneyOptionFlow"
) t;

-- Backup da tabela MovieSuggestionFlow
SELECT json_agg(t) as movie_suggestion_flows
FROM (
    SELECT * FROM "MovieSuggestionFlow"
) t; 