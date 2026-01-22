-- Fix Himani's session data
UPDATE public.chat_sessions 
SET name = 'Himani Malhotra', 
    email = 'himni202520@gmail.com', 
    is_user = true, 
    status = 'ended', 
    ended_at = '2025-12-27 07:36:46.966179+00',
    timeout_reason = 'User said goodbye'
WHERE session_id = '79e1f48d-68b3-4c96-8435-fe32222b3ae3';