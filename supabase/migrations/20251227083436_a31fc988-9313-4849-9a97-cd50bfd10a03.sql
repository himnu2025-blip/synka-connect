-- Clean up empty sessions that have no user messages (created by bug)
DELETE FROM chat_sessions 
WHERE id IN (
  SELECT cs.id 
  FROM chat_sessions cs
  LEFT JOIN chat_messages cm ON cm.session_id = cs.session_id AND cm.role = 'user'
  WHERE cm.id IS NULL
  AND cs.message_count <= 1
  AND cs.name IS NULL
  AND cs.email IS NULL
);