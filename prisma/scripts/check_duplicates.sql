SELECT 
    journeyOptionFlowId,
    movieId,
    COUNT(*) as count,
    STRING_AGG(id::text, ', ') as ids
FROM "MovieSuggestionFlow"
GROUP BY journeyOptionFlowId, movieId
HAVING COUNT(*) > 1
ORDER BY count DESC; 